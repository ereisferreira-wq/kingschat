import { Request, Response } from "express";
import { Op } from "sequelize";
import SystemNotice from "../../shared/database/models/SystemNotice";

export async function getNotice(req: Request, res: Response) {
  const notice = await SystemNotice.findOne({ order: [["createdAt", "DESC"]] });
  if (!notice) return res.json({ notice: { message: "", isActive: false, scheduledAt: null } });

  const now = new Date();

  // Se tem agendamento futuro, retorna status "scheduled" com countdown
  if (notice.scheduledAt && new Date(notice.scheduledAt) > now) {
    return res.json({
      notice: {
        message: notice.message,
        isActive: false,
        scheduledAt: notice.scheduledAt,
        status: "scheduled",
      },
    });
  }

  // Se tem agendamento passado ou foi ativado manualmente, ativa por 1h
  if (notice.isActive || (notice.scheduledAt && new Date(notice.scheduledAt) <= now)) {
    const startedAt = notice.scheduledAt ? new Date(notice.scheduledAt) : new Date(notice.createdAt);
    const oneHourLater = new Date(startedAt.getTime() + 60 * 60 * 1000);

    if (now > oneHourLater) {
      await notice.update({ isActive: false });
      return res.json({ notice: { message: "", isActive: false, scheduledAt: null } });
    }

    if (!notice.isActive) await notice.update({ isActive: true });

    // Calcula tempo restante
    const msLeft = oneHourLater.getTime() - now.getTime();
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

    return res.json({
      notice: {
        message: notice.message,
        isActive: true,
        scheduledAt: notice.scheduledAt,
        expiresIn: `${hoursLeft}h ${minutesLeft}m`,
        status: "active",
      },
    });
  }

  res.json({ notice: { message: notice.message || "", isActive: false, scheduledAt: null } });
}

export async function updateNotice(req: Request, res: Response) {
  const { message, isActive, scheduledAt } = req.body;
  let notice = await SystemNotice.findOne({ order: [["createdAt", "DESC"]] });

  const data: any = {};
  if (message !== undefined) data.message = message;
  if (isActive !== undefined) data.isActive = !!isActive;
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt || null;

  if (!notice) {
    notice = await SystemNotice.create(data);
  } else {
    await notice.update(data);
  }

  res.json({ notice });
}
