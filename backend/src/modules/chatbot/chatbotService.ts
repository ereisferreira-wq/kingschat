import OpenAI from "openai";
import axios from "axios";
import { WASocket, proto } from "@whiskeysockets/baileys";
import ChatbotConfig from "../../shared/database/models/ChatbotConfig";
import Ticket from "../../shared/database/models/Ticket";
import Message from "../../shared/database/models/Message";
import Contact from "../../shared/database/models/Contact";
import { queryRag, hasDocuments } from "../rag/ragService";
import logger from "../../shared/utils/logger";

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
    model: config.aiModel || "gpt-3.5-turbo",
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
  const baseUrl = config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3";

  const response = await axios.post(`${baseUrl}/api/chat`, {
    model,
    messages,
    stream: false,
    options: {
      temperature: config.temperature || 0.7,
      num_predict: config.maxTokens || 2048,
    },
  });

  return response.data.message?.content || "";
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
  remainingAttempts: number
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
  if (config.useRag && hasDocuments(companyId)) {
    const docs = await queryRag(companyId, message, config.aiProvider);
    if (docs) {
      context = `\n\nInformações de referência da empresa:\n${docs}\n\nUse essas informações para responder. Se a informação nos documentos não for suficiente, avise e adicione "${TRANSFER_FLAG}" ao final.`;
    }
  }

  const messages = [
    { role: "system", content: systemPrompt + context },
    { role: "user", content: message },
  ];

  if (config.aiProvider === "ollama") {
    return callOllama(messages, config);
  }
  return callOpenAI(messages, config);
}

export async function handleWhatsAppMessage(
  whatsappId: number,
  companyId: number,
  msg: proto.IWebMessageInfo,
  sock: WASocket
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

      if (config.welcomeMessage) {
        await sock.sendMessage(remoteJid, {
          text: config.welcomeMessage,
        });
        await Message.create({
          body: config.welcomeMessage,
          fromMe: true,
          ticketId: ticket.id,
          contactId: contact.id,
          companyId,
        });
      }
    }

    await Message.create({
      body: text,
      fromMe: false,
      ticketId: ticket.id,
      contactId: contact.id,
      companyId,
    });

    // Already transferred to human
    if (ticket.status === "open" && !ticket.isBot) {
      logger.info(`Ticket ${ticket.id} already with human`);
      return;
    }

    const maxAttempts = config.maxTransferAttempts || 3;
    let attempts = ticket.botTransferAttempts || 0;

    // Check for transfer keywords (user explicitly asking for human)
    if (
      config.transferToHuman &&
      checkTransferKeywords(text, config.transferKeywords)
    ) {
      await transferToHuman(ticket, config, contact, remoteJid, sock);
      return;
    }

    // Get AI response
    const remainingAttempts = Math.max(0, maxAttempts - attempts);
    const rawResponse = await getAiResponse(
      text,
      config,
      companyId,
      remainingAttempts
    );

    // Check if AI flagged for transfer
    if (rawResponse.includes(TRANSFER_FLAG)) {
      attempts++;
      await ticket.update({ botTransferAttempts: attempts });

      const cleanResponse = rawResponse.replace(TRANSFER_FLAG, "").trim();
      const forceTransfer = rawResponse.includes(
        `${REMAINING_ATTEMPTS_FLAG}0]`
      );

      if (attempts >= maxAttempts || forceTransfer) {
        // Send the last AI response (without the transfer flag) and then transfer
        if (cleanResponse) {
          await sock.sendMessage(remoteJid, { text: cleanResponse });
          await Message.create({
            body: cleanResponse,
            fromMe: true,
            ticketId: ticket.id,
            contactId: contact.id,
            companyId,
          });
        }
        await transferToHuman(ticket, config, contact, remoteJid, sock);
        return;
      }

      // Still has attempts left — ask the user to rephrase
      const retryMessage =
        `Desculpe, ainda não consegui entender exatamente o que você precisa. ` +
        `Tente reformular sua pergunta de outra forma (tentativa ${attempts}/${maxAttempts}). ` +
        `Se preferir, digite "atendente" para falar com um humano.`;

      await sock.sendMessage(remoteJid, { text: retryMessage });
      await Message.create({
        body: retryMessage,
        fromMe: true,
        ticketId: ticket.id,
        contactId: contact.id,
        companyId,
      });
      return;
    }

    // Bot answered successfully — reset attempts counter
    if (ticket.botTransferAttempts > 0) {
      await ticket.update({ botTransferAttempts: 0 });
    }

    await sock.sendMessage(remoteJid, { text: rawResponse });
    await Message.create({
      body: rawResponse,
      fromMe: true,
      ticketId: ticket.id,
      contactId: contact.id,
      companyId,
    });
  } catch (error) {
    logger.error("Error handling WhatsApp message:", error);
  }
}

async function transferToHuman(
  ticket: Ticket,
  config: ChatbotConfig,
  contact: Contact,
  remoteJid: string,
  sock: WASocket
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

  await sock.sendMessage(remoteJid, { text: transferMsg });
  await Message.create({
    body: transferMsg,
    fromMe: true,
    ticketId: ticket.id,
    contactId: contact.id,
    companyId: ticket.companyId,
  });

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
