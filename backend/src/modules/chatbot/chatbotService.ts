import OpenAI from "openai";
import axios from "axios";
import { WASocket, proto } from "@whiskeysockets/baileys";
import ChatbotConfig from "../../shared/database/models/ChatbotConfig";
import Ticket from "../../shared/database/models/Ticket";
import Message from "../../shared/database/models/Message";
import Contact from "../../shared/database/models/Contact";
import Customer from "../../shared/database/models/Customer";
import logger from "../../shared/utils/logger";
import { emitToCompany } from "../../lib/socket";
import { getConnection } from "../whatsapp/whatsappService";
import User from "../../shared/database/models/User";

const TRANSFER_FLAG = "[TRANSFERIR]";
const REMAINING_ATTEMPTS_FLAG = "[TENTATIVAS_RESTANTES:";

function getOpenAI(config: ChatbotConfig) {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
  return new OpenAI({ apiKey });
}

async function callOpenAI(
  messages: { role: string; content: string }[],
  config: ChatbotConfig
) {
  const openai = getOpenAI(config);
  const completion = await openai.chat.completions.create({
    model: config.aiModel || "gpt-4o",
    messages: messages as any,
    temperature: config.temperature || 0.7,
    max_tokens: config.maxTokens || 2048,
  });
  return completion.choices[0]?.message?.content || "";
}

async function callOllama(
  messages: { role: string; content: string }[],
  config: ChatbotConfig
) {
  const baseUrl = process.env.OLLAMA_BASE_URL || config.ollamaBaseUrl || "http://localhost:11434";
  const model = config.aiModel || process.env.OLLAMA_MODEL || "llama3";

  logger.info(`callOllama: ${model} @ ${baseUrl}/api/chat`);

  const response = await axios.post(`${baseUrl}/api/chat`, {
    model,
    messages,
    stream: false,
    options: {
      temperature: config.temperature || 0.7,
      num_predict: config.maxTokens || 2048,
    },
  });

  const content = response.data.message?.content || "";
  logger.info(`callOllama response: ${content.slice(0, 100)}...`);
  return content;
}

const DADOS_REGEX = /\[DADOS:\s*(.*?)\]/i;

function parseExtractedData(text: string): Record<string, string> | null {
  const match = text.match(DADOS_REGEX);
  if (!match) return null;
  const pairs = match[1].split(",").map(s => s.trim()).filter(Boolean);
  const data: Record<string, string> = {};
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx > 0) {
      const key = pair.slice(0, eqIdx).trim().toLowerCase();
      const val = pair.slice(eqIdx + 1).trim();
      if (key && val) data[key] = val;
    }
  }
  return Object.keys(data).length > 0 ? data : null;
}

async function saveExtractedData(
  data: Record<string, string>,
  contact: Contact,
  ticketId: number,
  companyId: number
) {
  try {
    const existing = JSON.parse(contact.customFields || "{}");
    const merged = { ...existing, ...data };
    await contact.update({ customFields: JSON.stringify(merged) });

    // Sync to CRM
    const customer = await Customer.findOne({ where: { phone: contact.number, companyId } });
    if (customer) {
      const crmNotes = Object.entries(merged)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      await customer.update({
        name: merged.nome || merged.name || customer.name,
        notes: crmNotes,
        tags: Object.keys(merged).join(", "),
      });
    }

    emitToCompany(companyId, "contact:updated", {
      contactId: contact.id,
      customFields: merged,
    });
  } catch (err) {
    logger.error("Failed to save extracted data:", err);
  }
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function checkTransferKeywords(text: string, keywords: string): boolean {
  const normalized = normalizeText(text);
  const words = keywords.split(",").map((k) => normalizeText(k).trim());
  return words.some((keyword) => keyword && normalized.includes(keyword));
}

async function getAiResponse(
  message: string,
  config: ChatbotConfig,
  companyId: number,
  remainingAttempts: number,
  history?: { role: string; content: string }[]
) {
  const transferInstruction = config.transferToHuman
    ? `\n\nIMPORTANTE: Se você NÃO souber responder a pergunta do cliente, ou se estiver fora do seu conhecimento, escreva "${TRANSFER_FLAG}" no final da sua resposta. O cliente ainda tem ${remainingAttempts} chance(s) antes de ser transferido para um humano. Se ele já usou todas as chances, escreva "${TRANSFER_FLAG}${REMAINING_ATTEMPTS_FLAG}0]" para forçar a transferência.`
    : "";

  const transferPrompt =
    config.transferPrompt ||
    "Você é responsável por responder perguntas sobre a empresa. Seja educado e profissional.";

  const systemPrompt =
    config.systemPrompt || transferPrompt + transferInstruction;

  let context = "";
  if (config.knowledgeBase?.trim()) {
    context = `\n\nBase de conhecimento da empresa:\n${config.knowledgeBase}\n\nUse ESSAS INFORMAÇÕES ACIMA para responder. Se a informação não for suficiente para responder, avise o cliente e adicione "${TRANSFER_FLAG}" ao final.`;
  }

  const extractionFields = (config.extractionFields || "nome, cidade, placa")
    .split(",").map(s => s.trim()).filter(Boolean);

  let extractionPrompt = "";
  if (extractionFields.length > 0) {
    extractionPrompt = `\n\nEXTRAÇÃO DE DADOS DO CLIENTE:\nDurante a conversa, você DEVE perguntar e coletar: ${extractionFields.join(", ")}.\nSempre que obter essas informações, adicione ao FINAL da sua resposta o bloco:\n[DADOS: ${extractionFields.map(f => `${f}=valor`).join(", ")}]\nSubstitua "valor" pelos dados reais do cliente. Se algum campo ainda não foi coletado, não inclua no bloco.\n\nExemplo de resposta com dados:\n"Cliente: nome=João, cidade=SP, placa=ABC-1234"\nResposta: "Perfeito, João! Anotei seus dados. [DADOS: nome=João, cidade=SP, placa=ABC-1234]"`;
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt + context + extractionPrompt },
  ];

  if (history) {
    messages.push(...history);
  }

  messages.push({ role: "user", content: message });

  if (config.aiProvider === "ollama") {
    return callOllama(messages, config);
  }
  return callOpenAI(messages, config);
}

function sendToWhatsApp(whatsappId: number, remoteJid: string, text: string) {
  const sock = getConnection(whatsappId);
  if (!sock) throw new Error("WhatsApp desconectado");
  return sock.sendMessage(remoteJid, { text });
}

async function saveBotMessage(
  whatsappId: number,
  remoteJid: string,
  ticketId: number,
  contactId: number,
  companyId: number,
  body: string,
) {
  const msg = await Message.create({ body, fromMe: true, ticketId, contactId, companyId });
  emitToCompany(companyId, "message:new", {
    ticketId,
    message: { id: msg.id, body: msg.body, fromMe: true, createdAt: msg.createdAt },
  });
  try {
    await sendToWhatsApp(whatsappId, remoteJid, body);
  } catch (err: any) {
    logger.error(`WhatsApp send failed (msg saved locally): ${err.message}`);
  }
  return msg;
}

export async function handleWhatsAppMessage(
  whatsappId: number,
  companyId: number,
  msg: proto.IWebMessageInfo,
  _sock: WASocket
) {
  try {
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";

    if (!text) return;

    const config = await ChatbotConfig.findOne({
      where: { companyId, isActive: true },
    });

    if (!config) return;

    const remoteJid = msg.key.remoteJid;
    if (!remoteJid) return;

    const isGroup = remoteJid.endsWith("@g.us");
    if (isGroup) return;

    const number = remoteJid.replace("@s.whatsapp.net", "");

    let contact = await Contact.findOne({
      where: { number, companyId },
    });

    if (!contact) {
      contact = await Contact.create({
        name: number,
        number,
        companyId,
      });
    }

    let ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        companyId,
        status: ["pending", "open"],
      },
    });

    if (!ticket) {
      ticket = await Ticket.create({
        contactId: contact.id,
        whatsappId,
        companyId,
        status: "pending",
        isBot: true,
        botTransferAttempts: 0,
      });

      try {
        const existing = await Customer.findOne({ where: { phone: contact.number, companyId } });
        if (!existing) {
          await Customer.create({
            name: contact.name || contact.number,
            phone: contact.number,
            status: "lead",
            companyId,
          });
          logger.info(`CRM auto-created for ${contact.number}`);
        }
      } catch (crmErr) {
        logger.error("Failed to auto-create CRM:", crmErr);
      }

      emitToCompany(companyId, "ticket:new", {
        ticket: {
          id: ticket.id,
          status: ticket.status,
          isBot: ticket.isBot,
          updatedAt: ticket.updatedAt,
          contact: { id: contact.id, name: contact.name, number: contact.number },
          lastMessage: text,
        },
      });

      if (config.welcomeMessage) {
        await saveBotMessage(whatsappId, remoteJid, ticket.id, contact.id, companyId, config.welcomeMessage);
      }
    }

    await Message.create({
      body: text,
      fromMe: false,
      ticketId: ticket.id,
      contactId: contact.id,
      companyId,
    });

    emitToCompany(companyId, "ticket:updated", {
      ticketId: ticket.id,
      lastMessage: text,
      contact: { id: contact.id, name: contact.name, number: contact.number },
    });

    emitToCompany(companyId, "message:new", {
      ticketId: ticket.id,
      message: { body: text, fromMe: false },
    });

    if (ticket.status === "open" && !ticket.isBot) {
      logger.info(`Ticket ${ticket.id} already with human`);
      return;
    }

    const maxAttempts = config.maxTransferAttempts || 3;
    let attempts = ticket.botTransferAttempts || 0;

    if (
      config.transferToHuman &&
      checkTransferKeywords(text, config.transferKeywords)
    ) {
      await transferToHuman(ticket, config, contact, remoteJid, whatsappId);
      return;
    }

    const remainingAttempts = Math.max(0, maxAttempts - attempts);
    const historyCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentMessages = await Message.findAll({
      where: { ticketId: ticket.id, companyId },
      attributes: ["body", "fromMe", "createdAt"],
      order: [["createdAt", "ASC"]],
    });
    const history = recentMessages
      .filter((m) => new Date(m.createdAt) >= historyCutoff)
      .slice(-20)
      .map((m) => ({
        role: m.fromMe ? "assistant" : "user",
        content: m.body,
      }));
    const rawResponse = await getAiResponse(
      text,
      config,
      companyId,
      remainingAttempts,
      history
    );

    if (rawResponse.includes(TRANSFER_FLAG)) {
      attempts++;
      await ticket.update({ botTransferAttempts: attempts });

      const cleanResponse = rawResponse.replace(TRANSFER_FLAG, "").trim();
      const forceTransfer = rawResponse.includes(
        `${REMAINING_ATTEMPTS_FLAG}0]`
      );

      if (attempts >= maxAttempts || forceTransfer) {
        if (cleanResponse) {
          await saveBotMessage(whatsappId, remoteJid, ticket.id, contact.id, companyId, cleanResponse);
        }
        try {
          const extracted = parseExtractedData(rawResponse);
          if (extracted) {
            await saveExtractedData(extracted, contact, ticket.id, companyId);
          }
        } catch (_) { }
        await transferToHuman(ticket, config, contact, remoteJid, whatsappId);
        return;
      }

      const retryMessage =
        `Desculpe, ainda não consegui entender exatamente o que você precisa. ` +
        `Tente reformular sua pergunta de outra forma (tentativa ${attempts}/${maxAttempts}). ` +
        `Se preferir, digite "atendente" para falar com um humano.`;

      await saveBotMessage(whatsappId, remoteJid, ticket.id, contact.id, companyId, retryMessage);
      return;
    }

    if (ticket.botTransferAttempts > 0) {
      await ticket.update({ botTransferAttempts: 0 });
    }

    await saveBotMessage(whatsappId, remoteJid, ticket.id, contact.id, companyId, rawResponse);

    try {
      const extracted = parseExtractedData(rawResponse);
      if (extracted) {
        await saveExtractedData(extracted, contact, ticket.id, companyId);
      }
    } catch (_) { }
  } catch (error) {
    logger.error("Error handling WhatsApp message:", error);
    try {
      const remoteJid = msg.key.remoteJid;
      if (remoteJid) {
        const fallbackMsg = "Desculpe, estou com dificuldades técnicas no momento. Sua mensagem foi registrada e um atendente humano será notificado em breve.";
        await sendToWhatsApp(whatsappId, remoteJid, fallbackMsg);
      }
    } catch (_) { }
    try {
      emitToCompany(companyId, "chatbot:error", {
        error: error instanceof Error ? error.message : "Unknown error",
        whatsappId,
        companyId,
      });
    } catch (_) { }
  }
}

async function transferToHuman(
  ticket: Ticket,
  config: ChatbotConfig,
  contact: Contact,
  remoteJid: string,
  whatsappId: number,
) {
  await ticket.update({
    status: "open",
    isBot: false,
    botSessionId: null,
    botTransferAttempts: 0,
  });

  const transferMsg =
    config.transferMessage ||
    "Estou transferindo para um atendente humano. Por favor, aguarde um momento.";

  await saveBotMessage(whatsappId, remoteJid, ticket.id, contact.id, ticket.companyId, transferMsg);

  logger.info(
    `Ticket ${ticket.id} transferred to human (contact: ${contact.number})`
  );
}

export async function transferToHumanApi(
  ticketId: number,
  companyId: number
) {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    include: [Contact],
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  await ticket.update({
    status: "open",
    isBot: false,
    botSessionId: null,
    botTransferAttempts: 0,
  });

  return ticket;
}
