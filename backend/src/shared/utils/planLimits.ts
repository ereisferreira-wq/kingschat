import Company from "../database/models/Company";
import Plan from "../database/models/Plan";
import Customer from "../database/models/Customer";
import Whatsapp from "../database/models/Whatsapp";
import Document from "../database/models/Document";
import User from "../database/models/User";

interface LimitCheck {
  allowed: boolean;
  current: number;
  max: number;
  limit: string;
}

export async function checkContactLimit(companyId: number): Promise<LimitCheck> {
  const company = await Company.findByPk(companyId, { include: [{ model: Plan, as: "plan" }] });
  if (!company || !company.plan) {
    return { allowed: false, current: 0, max: 0, limit: "contacts" };
  }
  const current = await Customer.count({ where: { companyId } });
  const max = company.plan.maxContacts;
  return { allowed: current < max, current, max, limit: "contacts" };
}

export async function checkWhatsAppLimit(companyId: number): Promise<LimitCheck> {
  const company = await Company.findByPk(companyId, { include: [{ model: Plan, as: "plan" }] });
  if (!company || !company.plan) {
    return { allowed: false, current: 0, max: 0, limit: "whatsapp" };
  }
  const current = await Whatsapp.count({ where: { companyId } });
  const max = company.plan.maxConnections;
  return { allowed: current < max, current, max, limit: "whatsapp" };
}

export async function checkDocumentLimit(companyId: number): Promise<LimitCheck> {
  const company = await Company.findByPk(companyId, { include: [{ model: Plan, as: "plan" }] });
  if (!company || !company.plan) {
    return { allowed: false, current: 0, max: 0, limit: "documents" };
  }
  const current = await Document.count({ where: { companyId } });
  const max = company.plan.maxDocuments;
  return { allowed: current < max, current, max, limit: "documents" };
}

export async function checkUserLimit(companyId: number): Promise<LimitCheck> {
  const company = await Company.findByPk(companyId, { include: [{ model: Plan, as: "plan" }] });
  if (!company || !company.plan) {
    return { allowed: false, current: 0, max: 0, limit: "users" };
  }
  const current = await User.count({ where: { companyId } });
  const max = company.plan.maxUsers;
  return { allowed: current < max, current, max, limit: "users" };
}

export async function getPlanUsage(companyId: number) {
  const company = await Company.findByPk(companyId, { include: [{ model: Plan, as: "plan" }] });
  if (!company || !company.plan) {
    return null;
  }
  const plan = company.plan;
  const [contacts, whatsapps, documents, users] = await Promise.all([
    Customer.count({ where: { companyId } }),
    Whatsapp.count({ where: { companyId } }),
    Document.count({ where: { companyId } }),
    User.count({ where: { companyId } }),
  ]);
  return {
    plan: { id: plan.id, name: plan.name },
    limits: {
      contacts: { current: contacts, max: plan.maxContacts },
      whatsapps: { current: whatsapps, max: plan.maxConnections },
      documents: { current: documents, max: plan.maxDocuments },
      users: { current: users, max: plan.maxUsers },
    },
  };
}
