import { Request, Response } from "express";
import { Op } from "sequelize";
import Company from "../../shared/database/models/Company";
import User from "../../shared/database/models/User";
import Plan from "../../shared/database/models/Plan";

export async function getCompany(req: Request, res: Response) {
  const company = await Company.findByPk(req.companyId, { include: [{ model: Plan, as: "plan" }] });
  if (!company) return res.status(404).json({ error: "Company not found" });
  res.json({ company });
}

export async function updateCompany(req: Request, res: Response) {
  const company = await Company.findByPk(req.companyId);
  if (!company) return res.status(404).json({ error: "Company not found" });
  await company.update(req.body);
  res.json({ company });
}

export async function listCompanies(req: Request, res: Response) {
  const { status, search } = req.query;
  const where: any = {};
  if (status && status !== "all") where.status = status === "true";
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const companies = await Company.findAll({
    where,
    include: [
      { model: Plan, as: "plan", attributes: ["id", "name"] },
      { model: User, attributes: ["id", "name", "email", "role"] },
      { model: Plan, as: "pendingPlan", attributes: ["id", "name", "price"] },
    ],
    order: [["createdAt", "DESC"]],
  });

  res.json({ companies });
}

export async function approveCompany(req: Request, res: Response) {
  const company = await Company.findByPk(req.params.id);
  if (!company) return res.status(404).json({ error: "Company not found" });

  await company.update({ status: true });
  res.json({ company });
}

export async function blockCompany(req: Request, res: Response) {
  const company = await Company.findByPk(req.params.id);
  if (!company) return res.status(404).json({ error: "Company not found" });

  await company.update({ status: false });
  res.json({ company });
}
