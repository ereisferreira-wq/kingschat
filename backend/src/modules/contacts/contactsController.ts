import { Request, Response } from "express";
import Contact from "../../shared/database/models/Contact";
import Customer from "../../shared/database/models/Customer";

export async function updateContact(req: Request, res: Response) {
  const { id } = req.params;
  const { customFields, name } = req.body;

  const contact = await Contact.findOne({
    where: { id, companyId: req.companyId },
  });

  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (customFields !== undefined) {
    const existing = JSON.parse(contact.customFields || "{}");
    updates.customFields = JSON.stringify({ ...existing, ...customFields });
  }

  await contact.update(updates);

  // Sync to CRM
  try {
    const merged = JSON.parse(updates.customFields || contact.customFields || "{}");
    const notes = Object.entries(merged).map(([k, v]) => `${k}: ${v}`).join("\n");
    await Customer.update(
      { name: merged.nome || merged.name || name || contact.name, notes },
      { where: { phone: contact.number, companyId: req.companyId } }
    );
  } catch (_) {}

  res.json({ contact });
}
