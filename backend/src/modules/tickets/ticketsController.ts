import { Request, Response } from "express";
import { Op } from "sequelize";
import Ticket from "../../shared/database/models/Ticket";
import Message from "../../shared/database/models/Message";
import Contact from "../../shared/database/models/Contact";
import { transferToHumanApi } from "../chatbot/chatbotService";

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
      { model: Contact, attributes: ["id", "name", "number", "profilePicUrl"] },
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
