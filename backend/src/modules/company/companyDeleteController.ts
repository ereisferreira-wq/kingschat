import { Request, Response } from "express";
import User from "../../shared/database/models/User";
import Company from "../../shared/database/models/Company";
import Message from "../../shared/database/models/Message";
import Contact from "../../shared/database/models/Contact";
import Ticket from "../../shared/database/models/Ticket";

import ChatbotConfig from "../../shared/database/models/ChatbotConfig";
import ScheduleTask from "../../shared/database/models/ScheduleTask";
import Whatsapp from "../../shared/database/models/Whatsapp";

export async function deleteCompanyData(req: Request, res: Response) {
  const { confirmationText } = req.body;

  if (confirmationText !== "DELETAR PERMANENTEMENTE") {
    return res.status(400).json({
      error: "Confirmação incorreta. Digite 'DELETAR PERMANENTEMENTE'",
    });
  }

  try {
    const user = await User.findByPk(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete company data" });
    }

    const company = await Company.findByPk(user.companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Buscar todos os usuários da empresa
    const companyUsers = await User.findAll({
      where: { companyId: user.companyId },
    });

    const userIds = companyUsers.map((u) => u.id);

    // Buscar contatos da empresa
    const contacts = await Contact.findAll({
      where: { companyId: user.companyId },
    });
    const contactIds = contacts.map((c) => c.id);

    // Deletar dados em cascata
    if (contactIds.length > 0) {
      await Message.destroy({
        where: { contactId: contactIds },
      });
    }

    await Ticket.destroy({
      where: { companyId: user.companyId },
    });

    await Contact.destroy({
      where: { companyId: user.companyId },
    });

    await ChatbotConfig.destroy({
      where: { companyId: user.companyId },
    });

    await ScheduleTask.destroy({
      where: { companyId: user.companyId },
    });

    await Whatsapp.destroy({
      where: { companyId: user.companyId },
    });

    // Deletar todos os usuários da empresa
    await User.destroy({
      where: { companyId: user.companyId },
    });

    // Deletar a empresa
    await Company.destroy({
      where: { id: user.companyId },
    });

    res.json({
      message: "Dados da empresa deletados permanentemente",
      deletedCompanyId: company.id,
      deletedUsersCount: userIds.length,
    });
  } catch (error: any) {
    console.error("Error deleting company data:", error);
    res.status(500).json({
      error: error.message || "Erro ao deletar dados da empresa",
    });
  }
}
