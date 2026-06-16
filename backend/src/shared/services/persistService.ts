import { Op } from "sequelize";
import Ticket from "../database/models/Ticket";
import Message from "../database/models/Message";
import Contact from "../database/models/Contact";
import ChatbotConfig from "../database/models/ChatbotConfig";
import Company from "../database/models/Company";
import Plan from "../database/models/Plan";
import Whatsapp from "../database/models/Whatsapp";
import { getConnection } from "../../modules/whatsapp/whatsappService";
import { emitToCompany } from "../../lib/socket";
import logger from "../utils/logger";

const DEFAULT_INTERVALS: Record<string, number[]> = {
  basic: [1, 10, 30],
  standard: [1, 5, 10, 30, 60],
  pro: [1, 5, 10, 30, 60, 180, 360, 720, 1440, 2880],
};

function getIntervals(planName: string, configIntervals: string): number[] {
  if (configIntervals && configIntervals !== "[]") {
    try {
      const parsed = JSON.parse(configIntervals);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const key = planName?.toLowerCase() || "basic";
  return DEFAULT_INTERVALS[key] || DEFAULT_INTERVALS.basic;
}

export async function processPersistFollowUps() {
  try {
    const tickets = await Ticket.findAll({
      where: {
        isBot: true,
        status: { [Op.not]: "closed" },
      },
      include: [
        { model: Contact, attributes: ["id", "name", "number"] },
        {
          model: Company,
          attributes: ["id"],
          include: [{ model: Plan, as: "plan", attributes: ["name", "maxPersist"] }],
        },
      ],
    });

    if (tickets.length === 0) return;

    for (const ticket of tickets) {
      try {
        const plan = (ticket.company as any)?.plan;
        const planName = plan?.name || "basic";
        const maxPersist = plan?.maxPersist || 3;

        if (ticket.persistIndex >= maxPersist) continue;

        const config = await ChatbotConfig.findOne({
          where: { companyId: ticket.companyId, isActive: true },
        });
        if (!config) continue;

        const intervals = getIntervals(planName, config.persistIntervals);

        if (ticket.persistIndex >= intervals.length) continue;

        const lastMsg = await Message.findOne({
          where: { ticketId: ticket.id },
          order: [["createdAt", "DESC"]],
        });
        if (!lastMsg) continue;

        // Only persist if last message was from bot
        if (!lastMsg.fromMe) continue;

        // Check if contact replied after the last bot message
        const contactReplied = await Message.findOne({
          where: {
            ticketId: ticket.id,
            fromMe: false,
            createdAt: { [Op.gt]: lastMsg.createdAt },
          },
        });
        if (contactReplied) continue;

        const elapsed = Date.now() - new Date(lastMsg.createdAt).getTime();
        const intervalMs = intervals[ticket.persistIndex] * 60 * 1000;

        if (elapsed < intervalMs) continue;

        const whatsapp = await Whatsapp.findOne({
          where: { companyId: ticket.companyId, status: "CONNECTED" },
          order: [["isDefault", "DESC"]],
        });
        if (!whatsapp) continue;

        const sock = getConnection(whatsapp.id);
        if (!sock) continue;

        const contact = ticket.contact as any;
        const remoteJid = contact?.number
          ? `${contact.number}@s.whatsapp.net`
          : null;
        if (!remoteJid) continue;

        const contactName = contact?.name || contact?.number || "Cliente";
        const followUpMessages = [
          `Olá ${contactName}! Só passando pra saber se ficou alguma dúvida sobre o que conversamos?`,
          `Oi ${contactName}! Tudo resolvido? Se precisar de mais alguma informação, é só falar!`,
          `Olá ${contactName}! Como está? Só lembrando que estou à disposição se precisar de ajuda.`,
          `Oi ${contactName}! Passando pra saber se precisa de algo mais. Estou aqui pra ajudar!`,
          `${contactName}, tem algo mais em que possa ajudar?`,
          `Olá! Tudo bem? Só verificando se está tudo certo.`,
          `${contactName}, precisa de mais alguma informação?`,
          `Oi! Lembrando que estou disponível se surgir qualquer dúvida.`,
          `Olá ${contactName}! Se precisar, estou aqui.`,
          `${contactName}, qualquer novidade é só chamar!`,
        ];

        const idx = Math.min(ticket.persistIndex, followUpMessages.length - 1);
        const body = followUpMessages[idx];

        try {
          await sock.sendMessage(remoteJid, { text: body });
        } catch (err: any) {
          logger.error(`Persist send failed for ticket ${ticket.id}: ${err.message}`);
          continue;
        }

        const msg = await Message.create({
          body,
          fromMe: true,
          ticketId: ticket.id,
          contactId: ticket.contactId,
          companyId: ticket.companyId,
        });

        await ticket.update({ persistIndex: ticket.persistIndex + 1 });

        emitToCompany(ticket.companyId, "message:new", {
          ticketId: ticket.id,
          message: { id: msg.id, body: msg.body, fromMe: true, createdAt: msg.createdAt },
        });

        logger.info(`Persist #${ticket.persistIndex} sent for ticket ${ticket.id}`);
      } catch (err) {
        logger.error(`Persist error for ticket ${ticket.id}:`, err);
      }
    }
  } catch (err) {
    logger.error("processPersistFollowUps error:", err);
  }
}
