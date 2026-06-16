import { Request, Response } from "express";
import { Op } from "sequelize";
import ScheduleTask from "../../shared/database/models/ScheduleTask";
import ScheduleLog from "../../shared/database/models/ScheduleLog";
import Customer from "../../shared/database/models/Customer";
import { cleanupClosedTickets } from "./schedulerService";

export async function listTasks(req: Request, res: Response) {
  const tasks = await ScheduleTask.findAll({
    where: { companyId: req.companyId },
    order: [["createdAt", "DESC"]],
  });
  res.json({ tasks });
}

export async function getTask(req: Request, res: Response) {
  const task = await ScheduleTask.findOne({
    where: { id: req.params.id, companyId: req.companyId },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ task });
}

export async function createTask(req: Request, res: Response) {
  const {
    name, description, triggerType, triggerValue, triggerTime,
    messageTemplate, repeat, repeatInterval, repeatIntervalType,
    approach, targetType, targetStatus, targetTags,
  } = req.body;

  if (!name || !triggerType || !messageTemplate) {
    return res.status(400).json({ error: "Name, triggerType and messageTemplate are required" });
  }

  const nextRun = calculateNextRun(triggerType, triggerValue, triggerTime);

  const task = await ScheduleTask.create({
    name,
    description,
    triggerType,
    triggerValue,
    triggerTime,
    messageTemplate,
    repeat: repeat || false,
    repeatInterval,
    repeatIntervalType,
    approach,
    targetType: targetType || "all",
    targetStatus,
    targetTags,
    isActive: true,
    nextRun,
    createdBy: req.userId,
    companyId: req.companyId,
  });

  res.status(201).json({ task });
}

export async function updateTask(req: Request, res: Response) {
  const task = await ScheduleTask.findOne({
    where: { id: req.params.id, companyId: req.companyId },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const data = { ...req.body };
  if (data.triggerType || data.triggerValue || data.triggerTime) {
    data.nextRun = calculateNextRun(
      data.triggerType || task.triggerType,
      data.triggerValue || task.triggerValue,
      data.triggerTime || task.triggerTime,
    );
  }

  await task.update(data);
  res.json({ task });
}

export async function toggleTask(req: Request, res: Response) {
  const task = await ScheduleTask.findOne({
    where: { id: req.params.id, companyId: req.companyId },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });

  await task.update({ isActive: !task.isActive });
  res.json({ task });
}

export async function removeTask(req: Request, res: Response) {
  const task = await ScheduleTask.findOne({
    where: { id: req.params.id, companyId: req.companyId },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });

  await task.destroy();
  res.json({ message: "Task removed" });
}

export async function runCleanup(req: Request, res: Response) {
  try {
    await cleanupClosedTickets();
    res.json({ message: "Cleanup concluído" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getLogs(req: Request, res: Response) {
  const { taskId } = req.query;
  const where: any = { companyId: req.companyId };
  if (taskId) where.taskId = taskId;

  const logs = await ScheduleLog.findAll({
    where,
    include: [
      { model: Customer, attributes: ["id", "name", "phone"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: 100,
  });

  res.json({ logs });
}

function calculateNextRun(triggerType: string, triggerValue: number, triggerTime?: string): Date {
  const now = new Date();

  if (triggerType === "after_hours") {
    return new Date(now.getTime() + triggerValue * 60 * 60 * 1000);
  }

  if (triggerType === "after_days") {
    return new Date(now.getTime() + triggerValue * 24 * 60 * 60 * 1000);
  }

  if (triggerType === "fixed_time" && triggerTime) {
    const [hours, minutes] = triggerTime.split(":").map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }

  return now;
}
