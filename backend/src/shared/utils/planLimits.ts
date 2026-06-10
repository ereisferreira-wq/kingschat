import { Transaction } from "sequelize";
import Company from "../database/models/Company";
import Plan from "../database/models/Plan";
import Customer from "../database/models/Customer";
import Whatsapp from "../database/models/Whatsapp";
import User from "../database/models/User";
import db from "../database/index";

interface LimitCheck {
  allowed: boolean;
  current: number;
  max: number;
  limit: string;
}

async function getCompanyWithPlan(companyId: number, transaction?: Transaction) {
  return Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }],
    transaction,
    lock: transaction ? true : undefined,
  });
}

export async function checkContactLimit(companyId: number, transaction?: Transaction): Promise<LimitCheck> {
  const company = await getCompanyWithPlan(companyId, transaction);
  if (!company?.plan) {
    return { allowed: false, current: 0, max: 0, limit: "contacts" };
  }
  const current = await Customer.count({ where: { companyId }, transaction });
  return { allowed: current < company.plan.maxContacts, current, max: company.plan.maxContacts, limit: "contacts" };
}

export async function checkWhatsAppLimit(companyId: number, transaction?: Transaction): Promise<LimitCheck> {
  const company = await getCompanyWithPlan(companyId, transaction);
  if (!company?.plan) {
    return { allowed: false, current: 0, max: 0, limit: "whatsapp" };
  }
  const current = await Whatsapp.count({ where: { companyId }, transaction });
  return { allowed: current < company.plan.maxConnections, current, max: company.plan.maxConnections, limit: "whatsapp" };
}

export async function checkUserLimit(companyId: number, transaction?: Transaction): Promise<LimitCheck> {
  const company = await getCompanyWithPlan(companyId, transaction);
  if (!company?.plan) {
    return { allowed: false, current: 0, max: 0, limit: "users" };
  }
  const current = await User.count({ where: { companyId }, transaction });
  return { allowed: current < company.plan.maxUsers, current, max: company.plan.maxUsers, limit: "users" };
}

export async function getPlanUsage(companyId: number) {
  const company = await Company.findByPk(companyId, { include: [{ model: Plan, as: "plan" }] });
  if (!company?.plan) return null;

  const [contacts, whatsapps, users] = await Promise.all([
    Customer.count({ where: { companyId } }),
    Whatsapp.count({ where: { companyId } }),
    User.count({ where: { companyId } }),
  ]);

  return {
    plan: { id: company.plan.id, name: company.plan.name },
    limits: {
      contacts: { current: contacts, max: company.plan.maxContacts },
      whatsapps: { current: whatsapps, max: company.plan.maxConnections },
      users: { current: users, max: company.plan.maxUsers },
    },
  };
}

export async function withLimitCheck<T>(
  companyId: number,
  limitCheck: (transaction: Transaction) => Promise<LimitCheck>,
  action: (transaction: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (transaction) => {
    const check = await limitCheck(transaction);
    if (!check.allowed) {
      throw new Error(`Limit exceeded: ${check.limit} (${check.current}/${check.max})`);
    }
    return action(transaction);
  });
}
