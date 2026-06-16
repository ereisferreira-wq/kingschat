import { Request, Response } from "express";
import Whatsapp from "../../shared/database/models/Whatsapp";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
  requestPairingCode,
} from "./whatsappService";
import { checkWhatsAppLimit } from "../../shared/utils/planLimits";

export async function list(req: Request, res: Response) {
  const whatsapps = await Whatsapp.findAll({
    where: { companyId: req.companyId },
    attributes: { exclude: ["session"] },
  });
  res.json({ whatsapps });
}

export async function create(req: Request, res: Response) {
  const { name, sector } = req.body;

  const waLimit = await checkWhatsAppLimit(req.companyId);
  if (!waLimit.allowed) {
    return res.status(403).json({
      error: "Limite de conexões WhatsApp atingido",
      limit: "whatsapp",
      current: waLimit.current,
      max: waLimit.max,
    });
  }

  const existing = await Whatsapp.findOne({
    where: { name, companyId: req.companyId },
  });
  if (existing) {
    return res.status(409).json({ error: "Name already in use" });
  }

  const whatsapp = await Whatsapp.create({
    name,
    sector: sector || "",
    companyId: req.companyId,
    status: "DISCONNECTED",
  });

  res.status(201).json({ whatsapp });
}

export async function connect(req: Request, res: Response) {
  const { id } = req.params;
  const whatsapp = await Whatsapp.findOne({
    where: { id, companyId: req.companyId },
  });

  if (!whatsapp) {
    return res.status(404).json({ error: "WhatsApp not found" });
  }

  await disconnectWhatsApp(whatsapp.id);
  await connectWhatsApp(whatsapp.id);
  res.json({ message: "Connecting..." });
}

export async function disconnect(req: Request, res: Response) {
  const { id } = req.params;
  const whatsapp = await Whatsapp.findOne({
    where: { id, companyId: req.companyId },
  });

  if (!whatsapp) {
    return res.status(404).json({ error: "WhatsApp not found" });
  }

  await disconnectWhatsApp(whatsapp.id);
  res.json({ message: "Disconnected" });
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params;
  const whatsapp = await Whatsapp.findOne({
    where: { id, companyId: req.companyId },
  });

  if (!whatsapp) {
    return res.status(404).json({ error: "WhatsApp not found" });
  }

  await disconnectWhatsApp(whatsapp.id);
  await whatsapp.destroy();
  res.json({ message: "Removed" });
}

export async function status(req: Request, res: Response) {
  const { id } = req.params;
  const result = await getWhatsAppStatus(Number(id));
  res.json(result);
}

export async function pairingCode(req: Request, res: Response) {
  const { id } = req.params;
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: "phoneNumber is required" });
  }

  const code = await requestPairingCode(Number(id), phoneNumber);
  res.json({ code, message: "Enter this code in WhatsApp > Linked Devices > Link a Device" });
}
