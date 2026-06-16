import { Op } from "sequelize";
import ScheduleTask from "../../shared/database/models/ScheduleTask";
import ScheduleLog from "../../shared/database/models/ScheduleLog";
import Customer from "../../shared/database/models/Customer";
import Ticket from "../../shared/database/models/Ticket";
import Message from "../../shared/database/models/Message";
import Whatsapp from "../../shared/database/models/Whatsapp";
import { sendMessage } from "../whatsapp/whatsappService";
import logger from "../../shared/utils/logger";
import { processPersistFollowUps } from "../../shared/services/persistService";

const BATCH_SIZE = 50;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hora

let interval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

export function startScheduler() {
  logger.info("Scheduler service started");

  interval = setInterval(async () => {
    try {
      await processDueTasks();
    } catch (err) {
      logger.error("Scheduler error:", err);
    }
    try {
      await processPersistFollowUps();
    } catch (err) {
      logger.error("Persist error:", err);
    }
  }, 60 * 1000);

  processDueTasks();

  cleanupInterval = setInterval(cleanupClosedTickets, CLEANUP_INTERVAL);
  cleanupClosedTickets();
}

export function stopScheduler() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

export async function cleanupClosedTickets() {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const closedTickets = await Ticket.findAll({
      where: {
        status: "closed",
        createdAt: { [Op.lt]: cutoff },
      },
      attributes: ["id"],
      raw: true,
    });

    if (closedTickets.length === 0) return;

    const ids = closedTickets.map((t: any) => t.id);
    await Message.destroy({ where: { ticketId: ids } });
    await Ticket.destroy({ where: { id: ids } });

    logger.info(`Cleanup: deleted ${ids.length} closed tickets older than 48h`);
  } catch (err) {
    logger.error("Cleanup error:", err);
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

async function getCustomerIds(task: ScheduleTask): Promise<number[]> {
  const where: any = { companyId: task.companyId };

  if (task.targetType === "by_status" && task.targetStatus) {
    where.status = task.targetStatus;
  }

  if (task.targetType === "by_tags" && task.targetTags) {
    const tags = task.targetTags.split(",").map((t: string) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      where[Op.or] = tags.map((tag: string) => ({
        tags: { [Op.like]: `%${tag}%` },
      }));
    }
  }

  const customers = await Customer.findAll({ where, attributes: ["id"], raw: true });
  return customers.map((c: any) => c.id);
}

async function executeTask(task: ScheduleTask) {
  const whatsapp = await Whatsapp.findOne({
    where: { companyId: task.companyId, status: "CONNECTED" },
    order: [["isDefault", "DESC"]],
  });

  if (!whatsapp) {
    logger.warn(`Task ${task.id}: no connected WhatsApp for company ${task.companyId}`);
    await task.update({ lastRun: new Date(), nextRun: calculateNextRun(task) });
    return;
  }

  const customerIds = await getCustomerIds(task);
  if (customerIds.length === 0) {
    logger.info(`Task ${task.id}: no customers to send`);
    await task.update({ lastRun: new Date(), nextRun: calculateNextRun(task) });
    return;
  }

  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
    const batch = customerIds.slice(i, i + BATCH_SIZE);
    const customers = await Customer.findAll({
      where: { id: batch },
      attributes: ["id", "name", "phone"],
      raw: true,
    });

    for (const customer of customers) {
      try {
        const phone = customer.phone?.replace(/\D/g, "");
        if (!phone) {
          await ScheduleLog.create({
            taskId: task.id,
            customerId: customer.id,
            status: "failed",
            error: "No phone number",
            companyId: task.companyId,
          });
          failCount++;
          continue;
        }

        const message = task.messageTemplate
          .replace(/\{nome\}/gi, customer.name || "")
          .replace(/\{name\}/gi, customer.name || "");

        await sendMessage(whatsapp.id, phone, message);

        await ScheduleLog.create({
          taskId: task.id,
          customerId: customer.id,
          status: "sent",
          sentAt: new Date(),
          companyId: task.companyId,
        });
        sentCount++;

        await delay(1000);
      } catch (err: any) {
        await ScheduleLog.create({
          taskId: task.id,
          customerId: customer.id,
          status: "failed",
          error: err.message,
          companyId: task.companyId,
        });
        failCount++;
      }
    }
  }

  logger.info(`Task ${task.id}: ${sentCount} sent, ${failCount} failed`);

  const nextRun = calculateNextRun(task);
  await task.update({
    lastRun: new Date(),
    nextRun,
  });
}

function calculateNextRun(task: ScheduleTask): Date | null {
  if (!task.repeat) return null;

  const base = task.lastRun || new Date();
  const interval = task.repeatInterval || 1;

  if (task.repeatIntervalType === "hours") {
    return new Date(base.getTime() + interval * 60 * 60 * 1000);
  }

  return new Date(base.getTime() + interval * 24 * 60 * 60 * 1000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
