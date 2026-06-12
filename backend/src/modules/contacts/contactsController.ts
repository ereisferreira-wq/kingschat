import { Request, Response } from "express";
import Contact from "../../shared/database/models/Contact";

export async function updateContact(req: Request, res: Response) {
  const { id } = req.params;
  const { city, licensePlate, name } = req.body;

  const contact = await Contact.findOne({
    where: { id, companyId: req.companyId },
  });

  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const updates: any = {};
  if (city !== undefined) updates.city = city;
  if (licensePlate !== undefined) updates.licensePlate = licensePlate;
  if (name !== undefined) updates.name = name;

  await contact.update(updates);

  res.json({ contact });
}
