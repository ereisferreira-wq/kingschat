import { Op } from "sequelize";
import ScheduleTask from "../../shared/database/models/ScheduleTask";
import ScheduleLog from "../../shared/database/models/ScheduleLog";
import Customer from "../../shared/database/models/Customer";
import logger from "../../shared/utils/logger";

let interval: NodeJS.Timeout | null = null;

export function startScheduler() {
  logger.info("Scheduler service started");

  interval = setInterval(async () => {
    try {
      await processDueTasks();
    } catch (err) {
      logger.error("Scheduler error:", err);
    }
  }, 60 * 1000);

  processDueTasks();
}

export function stopScheduler() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

async function processDueTasks() {
  const now = new Date();

  const tasks = await ScheduleTask.findAll({
    where: {
      isActive: true,
      companyId: { [Op.ne]: null },
      nextRun: { [Op.lte]: now },
    },
  });

  for (const task of tasks) {
    try {
      await executeTask(task);
    } catch (err) {
      logger.error(`Error executing task ${task.id}:`, err);
    }
  }
}

async function executeTask(task: ScheduleTask) {
  let customers: Customer[] = [];

  if (task.targetType === "all") {
    customers = await Customer.findAll({ where: { companyId: task.companyId } });
  } else if (task.targetType === "by_status" && task.targetStatus) {
    customers = await Customer.findAll({
      where: { companyId: task.companyId, status: task.targetStatus },
    });
  } else if (task.targetType === "by_tags" && task.targetTags) {
    const tags = task.targetTags.split(",").map((t: string) => t.trim()).filter(Boolean);
    const allCustomers = await Customer.findAll({ where: { companyId: task.companyId } });
    customers = allCustomers.filter((c: Customer) => {
      if (!c.tags) return false;
      const customerTags = c.tags.split(",").map((t: string) => t.trim().toLowerCase());
      return tags.some((tag: string) => customerTags.includes(tag.toLowerCase()));
    });
  }

  for (const customer of customers) {
    try {
      await ScheduleLog.create({
        taskId: task.id,
        customerId: customer.id,
        status: "sent",
        sentAt: new Date(),
        companyId: task.companyId,
      });

      logger.info(`Task ${task.id}: message queued for customer ${customer.id}`);
    } catch (err: any) {
      await ScheduleLog.create({
        taskId: task.id,
        customerId: customer.id,
        status: "failed",
        error: err.message,
        companyId: task.companyId,
      });
    }
  }

  const nextRun = calculateNextRun(task);
  await task.update({
    lastRun: new Date(),
    nextRun,
  });
}

function calculateNextRun(task: ScheduleTask): Date | null {
  if (!task.repeat) return null;

  const now = new Date();
  const interval = task.repeatInterval || 1;

  if (task.repeatIntervalType === "hours") {
    return new Date(now.getTime() + interval * 60 * 60 * 1000);
  }

  return new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
}
