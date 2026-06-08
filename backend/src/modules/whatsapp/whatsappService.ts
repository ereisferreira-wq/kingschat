import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import * as fs from "fs";
import * as path from "path";
import Whatsapp from "../../shared/database/models/Whatsapp";
import { getRedis } from "../../shared/services/redis";
import logger from "../../shared/utils/logger";
import { handleWhatsAppMessage } from "../chatbot/chatbotService";

const sessionsDir = path.resolve(__dirname, "../../../sessions");
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

const connections = new Map<number, WASocket>();

export async function connectWhatsApp(whatsappId: number) {
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) throw new Error("WhatsApp not found");

  const sessionPath = path.join(sessionsDir, `whatsapp-${whatsappId}`);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    syncFullHistory: false,
    emitOwnEvents: false,
  });

  connections.set(whatsappId, sock);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await whatsapp.update({ qrcode: qr, status: "QRCODE" });
      logger.info(`QR Code generated for whatsapp ${whatsappId}`);
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        logger.info(`Reconnecting whatsapp ${whatsappId}...`);
        connectWhatsApp(whatsappId);
      } else {
        await whatsapp.update({ status: "DISCONNECTED", session: null });
        connections.delete(whatsappId);
        logger.info(`Whatsapp ${whatsappId} disconnected`);
      }
    }

    if (connection === "open") {
      const number = sock.user?.id?.split(":")[0] || "";
      await whatsapp.update({
        status: "CONNECTED",
        qrcode: null,
        number,
      });
      logger.info(`Whatsapp ${whatsappId} connected as ${number}`);
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
    await whatsapp.update({ status: "DISCONNECTED", qrcode: null });
  }
}

export async function sendMessage(
  whatsappId: number,
  to: string,
  text: string
) {
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
    number: whatsapp?.number,
    battery: whatsapp?.battery,
    connected: !!sock,
  };
}
