import { Request, Response } from "express";
import ChatbotConfig from "../../shared/database/models/ChatbotConfig";

export async function getConfig(req: Request, res: Response) {
  let config = await ChatbotConfig.findOne({
    where: { companyId: req.companyId },
  });

  if (!config) {
    config = await ChatbotConfig.create({
      companyId: req.companyId,
      isActive: true,
      aiProvider: "openai",
      aiModel: "gpt-4o-mini",
      systemPrompt:
        "Você é um assistente de atendimento ao cliente. Responda de forma educada e profissional.",
      temperature: 0.7,
      maxTokens: 2048,
      useRag: false,
      knowledgeBase: "",
    });
  }

  res.json({ config });
}

export async function updateConfig(req: Request, res: Response) {
  const data = req.body;

  let config = await ChatbotConfig.findOne({
    where: { companyId: req.companyId },
  });

  if (!config) {
    config = await ChatbotConfig.create({
      companyId: req.companyId,
      ...data,
    });
  } else {
    await config.update(data);
  }

  res.json({ config });
}
