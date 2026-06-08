import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  Browsers,
  isJidBroadcast,
  isJidGroup,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import * as fs from "fs";
import * as path from "path";
import Whatsapp from "../../shared/database/models/Whatsapp";
import logger from "../../shared/utils/logger";
import { handleWhatsAppMessage } from "../chatbot/chatbotService";
import { emitToCompany } from "../../lib/socket";

const sessionsDir = path.resolve(__dirname, "../../../sessions");
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

const connections = new Map<number, WASocket>();
const retriesQrCode = new Map<number, number>();

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

export async function connectWhatsApp(whatsappId: number) {
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) throw new Error("WhatsApp not found");

  const sessionPath = path.join(sessionsDir, `whatsapp-${whatsappId}`);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    printQRInTerminal: false,
    syncFullHistory: false,
    emitOwnEvents: true,
    browser: Browsers.appropriate("Desktop"),
    markOnlineOnConnect: false,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid),
  });

  connections.set(whatsappId, sock);
  let qrRetryCount = retriesQrCode.get(whatsappId) || 0;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrRetryCount += 1;
      retriesQrCode.set(whatsappId, qrRetryCount);

      if (qrRetryCount > 3) {
        logger.warn(`WhatsApp ${whatsappId} exceeded QR retries, resetting session`);
        await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
        sock.ev.removeAllListeners("connection.update");
        sock.ws?.close();
        connections.delete(whatsappId);
        retriesQrCode.delete(whatsappId);
      } else {
        await whatsapp.update({ qrcode: qr, status: "QRCODE" });
        logger.info(`QR Code generated for whatsapp ${whatsappId} (attempt ${qrRetryCount})`);
        emitSession(whatsapp);
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        logger.info(`Reconnecting whatsapp ${whatsappId}...`);
        connections.delete(whatsappId);
        setTimeout(() => connectWhatsApp(whatsappId), 2000);
      } else {
        await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
        connections.delete(whatsappId);
        retriesQrCode.delete(whatsappId);
        logger.info(`Whatsapp ${whatsappId} disconnected (logged out)`);
        emitSession(whatsapp);
      }
    }

    if (connection === "open") {
      const number = sock.user?.id
        ? jidNormalizedUser(sock.user.id).split("@")[0]
        : "";
      await whatsapp.update({
        status: "CONNECTED",
        qrcode: "",
        number,
        retries: 0,
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
    }
  });

  return sock;
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

export function getConnection(whatsappId: number) {
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
