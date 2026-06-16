import { Request, Response } from "express";
import { Op } from "sequelize";
import Ticket from "../../shared/database/models/Ticket";
import Message from "../../shared/database/models/Message";
import Contact from "../../shared/database/models/Contact";
import User from "../../shared/database/models/User";
import { transferToHumanApi } from "../chatbot/chatbotService";
import { getConnection } from "../whatsapp/whatsappService";
import { emitToCompany } from "../../lib/socket";
import logger from "../../shared/utils/logger";

export async function list(req: Request, res: Response) {
  const { status, page = "1", limit = "20" } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where: any = { companyId: req.companyId };
  if (status) {
    where.status = status;
  }

  const { rows, count } = await Ticket.findAndCountAll({
    where,
    include: [
      { model: Contact, attributes: ["id", "name", "number", "profilePicUrl", "customFields"] },
      { model: User, attributes: ["id", "name"] },
      { model: Message, limit: 1, order: [["createdAt", "DESC"]] },
    ],
    order: [["updatedAt", "DESC"]],
    limit: Number(limit),
    offset,
  });

  res.json({
    tickets: rows,
    total: count,
    page: Number(page),
    totalPages: Math.ceil(count / Number(limit)),
  });
}

export async function getById(req: Request, res: Response) {
  const { id } = req.params;
  const ticket = await Ticket.findOne({
    where: { id, companyId: req.companyId },
    include: [
      { model: Contact },
      { model: User, attributes: ["id", "name"] },
      {
        model: Message,
        order: [["createdAt", "ASC"]],
      },
    ],
  });

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  res.json({ ticket });
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  const ticket = await Ticket.findOne({
    where: { id, companyId: req.companyId },
  });

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  await ticket.update({ status });
  res.json({ ticket });
}

export async function transferToHuman(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const ticket = await transferToHumanApi(Number(id), req.companyId);
    res.json({ message: "Ticket transferred to human", ticket });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function assignTicket(req: Request, res: Response) {
  const { id } = req.params;
  const ticket = await Ticket.findOne({
    where: { id, companyId: req.companyId },
  });
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  await ticket.update({ userId: req.userId, isBot: false, status: "open", persistIndex: 0 });
  emitToCompany(req.companyId, "ticket:updated", { ticketId: ticket.id });
  res.json({ ticket });
}

export async function sendMessage(req: Request, res: Response) {
  const { id } = req.params;
  const { body } = req.body;
  if (!body?.trim()) {
    return res.status(400).json({ error: "Message body is required" });
  }

  const ticket = await Ticket.findOne({
    where: { id, companyId: req.companyId },
    include: [Contact],
  });
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  // Auto-assign to sender + mark human-handled
  const updates: any = { isBot: false, status: "open", persistIndex: 0 };
  if (!ticket.userId) updates.userId = req.userId;
  await ticket.update(updates);

  const msg = await Message.create({
    body: body.trim(),
    fromMe: true,
    ticketId: ticket.id,
    contactId: ticket.contactId,
    companyId: req.companyId,
  });

  await ticket.update({ lastMessage: body.trim() });

  emitToCompany(req.companyId, "message:new", {
    ticketId: ticket.id,
    message: {
      id: msg.id,
      body: msg.body,
      fromMe: true,
      createdAt: msg.createdAt,
    },
  });

  try {
    const sock = getConnection(ticket.whatsappId);
    if (sock) {
      const remoteJid = `${ticket.contact.number}@s.whatsapp.net`;
      await sock.sendMessage(remoteJid, { text: body });
    }
  } catch (err: any) {
    logger.error(`Failed to send user message via WhatsApp: ${err.message}`);
  }

  res.json({ message: msg });
}
