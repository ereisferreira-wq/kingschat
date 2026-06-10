import { Request, Response } from "express";
import Plan from "../../shared/database/models/Plan";
import Subscription from "../../shared/database/models/Subscription";
import Company from "../../shared/database/models/Company";
import { getPlanUsage } from "../../shared/utils/planLimits";

export async function listPlans(req: Request, res: Response) {
  const plans = await Plan.findAll({ where: { isActive: true } });
  res.json({ plans });
}

export async function listAllPlans(req: Request, res: Response) {
  const plans = await Plan.findAll({ order: [["price", "ASC"]] });
  res.json({ plans });
}

export async function createPlan(req: Request, res: Response) {
  const data = req.body;
  const plan = await Plan.create(data);
  res.status(201).json({ plan });
}

export async function updatePlan(req: Request, res: Response) {
  const { id } = req.params;
  const plan = await Plan.findByPk(id);
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }
  await plan.update(req.body);
  res.json({ plan });
}

export async function getMySubscription(req: Request, res: Response) {
  const company = await Company.findByPk(req.companyId, {
    include: [{ model: Plan, as: "plan" }, { model: Plan, as: "pendingPlan" }],
  });
  const subscription = await Subscription.findOne({
    where: { companyId: req.companyId },
    include: [Plan],
  });

  res.json({ company, subscription });
}

export async function getUpgradeCost(req: Request, res: Response) {
  const { planId } = req.params;

  const targetPlan = await Plan.findByPk(planId);
  if (!targetPlan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const company = await Company.findByPk(req.companyId, { include: [Plan] });
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  const currentPlan = company.plan;
  if (!currentPlan) {
    return res.status(400).json({ error: "No current plan" });
  }

  if (currentPlan.id === targetPlan.id) {
    return res.status(400).json({ error: "Already on this plan" });
  }

  if (Number(targetPlan.price) <= Number(currentPlan.price)) {
    return res.json({
      currentPlan,
      targetPlan,
      proratedAmount: 0,
      daysRemaining: 0,
      message: "Downgrade — no additional cost",
    });
  }

  const dueDate = new Date(company.dueDate);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.max(1, Math.ceil((dueDate.getTime() - now.getTime()) / msPerDay));
  const daysInMonth = 30;
  const priceDiff = Number(targetPlan.price) - Number(currentPlan.price);
  const proratedAmount = (priceDiff / daysInMonth) * daysRemaining;

  res.json({
    currentPlan,
    targetPlan,
    proratedAmount: Math.round(proratedAmount * 100) / 100,
    daysRemaining,
    daysInMonth,
    priceDiff,
  });
}

export async function requestUpgrade(req: Request, res: Response) {
  const { planId } = req.body;
  const receiptPath = req.file ? (req.file as any).path : "";

  if (!planId) {
    return res.status(400).json({ error: "planId required" });
  }

  const targetPlan = await Plan.findByPk(planId);
  if (!targetPlan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const company = await Company.findByPk(req.companyId, { include: [Plan] });
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  const currentPlan = company.plan;
  if (!currentPlan) {
    return res.status(400).json({ error: "No current plan" });
  }

  if (currentPlan.id === targetPlan.id) {
    return res.status(400).json({ error: "Already on this plan" });
  }

  await company.update({
    pendingPlanId: planId,
    upgradeReceipt: receiptPath,
  });

  res.json({
    message: "Upgrade request submitted. Waiting for admin approval.",
    pendingPlan: targetPlan,
  });
}

export async function approveUpgrade(req: Request, res: Response) {
  const { id } = req.params;

  const company = await Company.findByPk(id, {
    include: [{ model: Plan, as: "pendingPlan" }],
  });
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  if (!company.pendingPlanId) {
    return res.status(400).json({ error: "No pending upgrade" });
  }

  const targetPlan = await Plan.findByPk(company.pendingPlanId);
  if (!targetPlan) {
    return res.status(404).json({ error: "Pending plan not found" });
  }

  await company.update({
    planId: company.pendingPlanId,
    pendingPlanId: null,
    upgradeReceipt: "",
  });

  let subscription = await Subscription.findOne({
    where: { companyId: company.id },
  });
  if (subscription) {
    await subscription.update({
      planId: company.planId,
      status: "active",
    });
  }

  res.json({ message: "Upgrade approved", company });
}

export async function rejectUpgrade(req: Request, res: Response) {
  const { id } = req.params;

  const company = await Company.findByPk(id);
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  await company.update({
    pendingPlanId: null,
    upgradeReceipt: "",
  });

  res.json({ message: "Upgrade rejected" });
}

export async function getPlanUsageEndpoint(req: Request, res: Response) {
  const usage = await getPlanUsage(req.companyId);
  if (!usage) {
    return res.status(404).json({ error: "Company or plan not found" });
  }
  res.json(usage);
}

export async function updateSubscription(req: Request, res: Response) {
  const { planId, paymentReference } = req.body;

  const plan = await Plan.findByPk(planId);
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const company = await Company.findByPk(req.companyId);
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  await company.update({ planId });

  let subscription = await Subscription.findOne({
    where: { companyId: req.companyId },
  });

  if (subscription) {
    await subscription.update({
      planId,
      status: "active",
      paymentReference,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } else {
    subscription = await Subscription.create({
      companyId: req.companyId,
      planId,
      status: "active",
      paymentReference,
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  res.json({ subscription, company });
}
