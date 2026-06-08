import { Request, Response } from "express";
import { Op } from "sequelize";
import Customer from "../../shared/database/models/Customer";
import User from "../../shared/database/models/User";
import Whatsapp from "../../shared/database/models/Whatsapp";
import { sendMessage } from "../whatsapp/whatsappService";
import { checkContactLimit } from "../../shared/utils/planLimits";

export async function list(req: Request, res: Response) {
  const { status, search } = req.query;
  const where: any = { companyId: req.companyId };

  if (status && status !== "all") where.status = status;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const customers = await Customer.findAll({
    where,
    include: [{ model: User, attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
  });

  res.json({ customers });
}

export async function getById(req: Request, res: Response) {
  const customer = await Customer.findOne({
    where: { id: req.params.id, companyId: req.companyId },
    include: [{ model: User, attributes: ["id", "name"] }],
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json({ customer });
}

export async function create(req: Request, res: Response) {
  const { name, phone, email, status, notes, tags, nextFollowUp } = req.body;

  if (!name) return res.status(400).json({ error: "Name is required" });

  const contactLimit = await checkContactLimit(req.companyId);
  if (!contactLimit.allowed) {
    return res.status(403).json({
      error: "Limite de contatos atingido",
      limit: "contacts",
      current: contactLimit.current,
      max: contactLimit.max,
    });
  }

  const customer = await Customer.create({
    name,
    phone,
    email,
    status: status || "lead",
    notes,
    tags,
    nextFollowUp,
    userId: req.userId,
    companyId: req.companyId,
  });

  res.status(201).json({ customer });
}

export async function update(req: Request, res: Response) {
  const customer = await Customer.findOne({
    where: { id: req.params.id, companyId: req.companyId },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  await customer.update(req.body);
  res.json({ customer });
}

export async function remove(req: Request, res: Response) {
  const customer = await Customer.findOne({
    where: { id: req.params.id, companyId: req.companyId },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  await customer.destroy();
  res.json({ message: "Customer removed" });
}

export async function stats(req: Request, res: Response) {
  const total = await Customer.count({ where: { companyId: req.companyId } });
  const byStatus = await Customer.findAll({
    where: { companyId: req.companyId },
    attributes: ["status", [Customer.sequelize!.fn("COUNT", Customer.sequelize!.col("id")), "count"]],
    group: ["status"],
    raw: true,
  });

  const followUps = await Customer.count({
    where: {
      companyId: req.companyId,
      nextFollowUp: { [Op.ne]: null, [Op.lte]: new Date() },
    },
  });

  res.json({ total, byStatus, followUps });
}

export async function exportCSV(req: Request, res: Response) {
  const customers = await Customer.findAll({
    where: { companyId: req.companyId },
    order: [["createdAt", "DESC"]],
  });

  const header = "id,nome,telefone,email,status,tags,observacoes,ultimoContato,proximoContato,criadoEm";
  const rows = customers.map(c =>
    [
      c.id,
      escapeCsv(c.name),
      c.phone || "",
      c.email || "",
      c.status || "",
      escapeCsv(c.tags || ""),
      escapeCsv(c.notes || ""),
      c.lastContact ? c.lastContact.toISOString() : "",
      c.nextFollowUp ? c.nextFollowUp.toISOString() : "",
      c.createdAt ? c.createdAt.toISOString() : "",
    ].join(",")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=crm-export.csv");
  res.send([header, ...rows].join("\n"));
}

function escapeCsv(val: string) {
  if (val.includes(",") || val.includes("\"") || val.includes("\n")) {
    return `"${val.replace(/"/g, "\"\"")}"`;
  }
  return val;
}

export async function importCSV(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: "CSV file required" });

  const contactLimit = await checkContactLimit(req.companyId);
  if (!contactLimit.allowed) {
    return res.status(403).json({
      error: "Limite de contatos atingido",
      limit: "contacts",
      current: contactLimit.current,
      max: contactLimit.max,
    });
  }

  const content = req.file.buffer.toString("utf-8");
  const lines = content.split("\n").filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ error: "CSV vazio ou inválido" });

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const results = { created: 0, updated: 0, errors: 0 };

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      headers.forEach((h, idx) => {
        if (idx < values.length) row[h] = values[idx].trim();
      });

      const name = row.nome || row.name;
      if (!name) { results.errors++; continue; }

      const phone = row.telefone || row.phone || "";
      const email = row.email || "";
      const status = row.status || "lead";
      const tags = row.tags || "";
      const notes = row.observacoes || row.notes || "";

      const existing = phone
        ? await Customer.findOne({ where: { phone, companyId: req.companyId } })
        : null;

      if (existing) {
        await existing.update({ name, email, status, tags, notes });
        results.updated++;
      } else {
        await Customer.create({ name, phone, email, status, tags, notes, userId: req.userId, companyId: req.companyId });
        results.created++;
      }
    } catch {
      results.errors++;
    }
  }

  res.json(results);
}

function parseCSVLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") { current += "\""; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function bulkSend(req: Request, res: Response) {
  const { customerIds, template, minDelay = 30, maxDelay = 60 } = req.body;

  if (!customerIds?.length || !template) {
    return res.status(400).json({ error: "customerIds e template são obrigatórios" });
  }

  const whatsapp = await Whatsapp.findOne({
    where: { companyId: req.companyId, status: "CONNECTED" },
  });

  if (!whatsapp) {
    return res.status(400).json({ error: "Nenhum WhatsApp conectado encontrado" });
  }

  const customers = await Customer.findAll({
    where: { id: customerIds, companyId: req.companyId },
  });

  if (!customers.length) {
    return res.status(400).json({ error: "Nenhum cliente encontrado" });
  }

  res.json({ message: `Envio iniciado para ${customers.length} cliente(s)`, total: customers.length });

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (const customer of customers) {
    if (!customer.phone) continue;
    const msg = template.replace(/\{nome\}/gi, customer.name).replace(/\{email\}/gi, customer.email);
    try {
      await sendMessage(whatsapp.id, customer.phone, msg);
    } catch (err) {
      console.error(`Falha ao enviar para ${customer.name}:`, err);
    }
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000;
    await sleep(delay);
  }
}
