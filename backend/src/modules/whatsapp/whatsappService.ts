import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  Browsers,
  isJidBroadcast,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  proto,
  type CacheStore,
} from "@whiskeysockets/baileys";
import * as fs from "fs";
import * as path from "path";
import Whatsapp from "../../shared/database/models/Whatsapp";
import logger from "../../shared/utils/logger";
import { handleWhatsAppMessage } from "../chatbot/chatbotService";
import Ticket from "../../shared/database/models/Ticket";
import Message from "../../shared/database/models/Message";
import Contact from "../../shared/database/models/Contact";
import { emitToCompany } from "../../lib/socket";

function createBaileysLogger(log: typeof logger) {
  return new Proxy(log, {
    get(target, prop) {
      if (prop === "trace") return target.debug.bind(target);
      if (prop === "child") return () => baileysLogger;
      const val = (target as any)[prop];
      return typeof val === "function" ? val.bind(target) : val;
    },
  }) as any;
}

const baileysLogger = createBaileysLogger(logger);

const sessionsDir = path.resolve(__dirname, "../../../sessions");
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

const connections = new Map<number, WASocket>();
const retriesQrCode = new Map<number, number>();

const retryCache = new Map<string, number>();
const msgRetryMap: CacheStore = {
  get: <T>(key: string) => retryCache.get(key) as T | undefined,
  set: <T>(key: string, value: T) => { retryCache.set(key, value as unknown as number); },
  del: (key: string) => { retryCache.delete(key); },
  flushAll: () => { retryCache.clear(); },
};

function emitSession(whatsapp: Whatsapp) {
  emitToCompany(whatsapp.companyId, `company:${whatsapp.companyId}:whatsappSession`, {
    action: "update",
    session: {
      id: whatsapp.id,
      name: whatsapp.name,
      status: whatsapp.status,
      qrcode: whatsapp.qrcode,
      number: whatsapp.number,
      battery: whatsapp.battery,
      plugged: whatsapp.plugged,
      isDefault: whatsapp.isDefault,
      companyId: whatsapp.companyId,
    },
  });
}

async function handleMyOwnMessage(
  whatsappId: number,
  companyId: number,
  msg: proto.IWebMessageInfo,
  sock: WASocket
) {
  try {
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";
    if (!text) return;

    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid.endsWith("@g.us")) return;

    const number = remoteJid.replace("@s.whatsapp.net", "");
    const contact = await Contact.findOne({ where: { number, companyId } });
    if (!contact) return;

    const ticket = await Ticket.findOne({
      where: { contactId: contact.id, companyId, status: ["pending", "open"] },
    });
    if (!ticket) return;

    const newMsg = await Message.create({
      body: text,
      fromMe: true,
      ticketId: ticket.id,
      contactId: contact.id,
      companyId,
    });

    await ticket.update({ lastMessage: text, isBot: false, status: "open" });

    emitToCompany(companyId, "message:new", {
      ticketId: ticket.id,
      message: { id: newMsg.id, body: text, fromMe: true, createdAt: newMsg.createdAt },
    });

    emitToCompany(companyId, "ticket:updated", {
      ticketId: ticket.id,
      lastMessage: text,
      isBot: false,
      contact: { id: contact.id, name: contact.name, number: contact.number },
    });

    logger.info(`Human replied from phone on ticket ${ticket.id} — AI stopped`);
  } catch (error) {
    logger.error("Error handling own message:", error);
  }
}

export async function connectWhatsApp(whatsappId: number): Promise<WASocket> {
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) throw new Error("WhatsApp not found");

  const sessionPath = path.join(sessionsDir, `whatsapp-${whatsappId}`);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const proxyUrl = process.env.WA_PROXY_URL;

  const sock = makeWASocket({
    ...(proxyUrl ? { proxy: { url: proxyUrl } } : {}),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    printQRInTerminal: false,
    syncFullHistory: false,
    emitOwnEvents: true,
    browser: Browsers.appropriate("Desktop"),
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    linkPreviewImageThumbnailWidth: 192,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid),
    defaultQueryTimeoutMs: undefined,
    retryRequestDelayMs: 500,
    maxMsgRetryCount: 5,
    fireInitQueries: true,
    transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
    msgRetryCounterCache: msgRetryMap,
    connectTimeoutMs: 25_000,
    logger: baileysLogger,
  });

  connections.set(whatsappId, sock);
  let qrRetryCount = retriesQrCode.get(whatsappId) || 0;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrRetryCount += 1;
      retriesQrCode.set(whatsappId, qrRetryCount);

      if (qrRetryCount > 3) {
        logger.warn(`WhatsApp ${whatsappId} exceeded QR retries`);
        await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
        fs.rmSync(sessionPath, { recursive: true, force: true });
        sock.ev.removeAllListeners("connection.update");
        sock.ws?.close();
        connections.delete(whatsappId);
        retriesQrCode.delete(whatsappId);
        emitSession(whatsapp);
      } else {
        await whatsapp.update({ qrcode: qr, status: "QRCODE" });
        logger.info(`QR Code generated for whatsapp ${whatsappId} (attempt ${qrRetryCount})`);
        emitSession(whatsapp);
      }
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isForbidden = statusCode === 403;

      if (isForbidden) {
        logger.warn(`WhatsApp ${whatsappId} forbidden (403), clearing session`);
        await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
        fs.rmSync(sessionPath, { recursive: true, force: true });
        connections.delete(whatsappId);
        retriesQrCode.delete(whatsappId);
        emitSession(whatsapp);
        return;
      }

      if (!isLoggedOut) {
        logger.info(`WhatsApp ${whatsappId} reconnecting in 2s...`);
        connections.delete(whatsappId);
        setTimeout(() => connectWhatsApp(whatsappId), 2000);
        return;
      }

      await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
      connections.delete(whatsappId);
      retriesQrCode.delete(whatsappId);
      logger.info(`Whatsapp ${whatsappId} logged out`);
      emitSession(whatsapp);
    }

    if (connection === "open") {
      const number = sock.user?.id
        ? jidNormalizedUser(sock.user.id).split("@")[0]
        : "";
      await whatsapp.update({
        status: "CONNECTED",
        qrcode: "",
        number,
      });
      retriesQrCode.delete(whatsappId);
      logger.info(`Whatsapp ${whatsappId} connected as ${number}`);
      emitSession(whatsapp);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (msg) => {
    for (const message of msg.messages) {
      if (!message.key.fromMe && message.message) {
        await handleWhatsAppMessage(whatsappId, whatsapp.companyId, message, sock);
      }
      if (message.key.fromMe && message.message) {
        await handleMyOwnMessage(whatsappId, whatsapp.companyId, message, sock);
      }
    }
  });

  return sock;
}

export async function requestPairingCode(whatsappId: number, phoneNumber: string) {
  const sock = connections.get(whatsappId);
  if (!sock) throw new Error("WhatsApp not connected. Start session first.");

  const code = await sock.requestPairingCode(phoneNumber);
  logger.info(`Pairing code for ${phoneNumber}: ${code}`);
  return code;
}

export async function disconnectWhatsApp(whatsappId: number) {
  const sock = connections.get(whatsappId);
  if (sock) {
    sock.end(new Error("Manual disconnect"));
    connections.delete(whatsappId);
  }

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (whatsapp) {
    await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
    emitSession(whatsapp);
  }
  retriesQrCode.delete(whatsappId);
}

export async function sendMessage(whatsappId: number, to: string, text: string) {
  const sock = connections.get(whatsappId);
  if (!sock) throw new Error("WhatsApp not connected");

  const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
}

export function getConnection(whatsappId: number): WASocket | undefined {
  return connections.get(whatsappId);
}

export async function getWhatsAppStatus(whatsappId: number) {
  const sock = connections.get(whatsappId);
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  return {
    id: whatsappId,
    name: whatsapp?.name,
    status: whatsapp?.status,
    qrcode: whatsapp?.qrcode,
    number: whatsapp?.number,
    battery: whatsapp?.battery,
    connected: !!sock,
  };
}
