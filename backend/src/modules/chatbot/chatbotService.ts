import axios from "axios";
import { proto, isLidUser } from "@whiskeysockets/baileys";
import ChatbotConfig from "../../shared/database/models/ChatbotConfig";
import Ticket from "../../shared/database/models/Ticket";
import Message from "../../shared/database/models/Message";
import Contact from "../../shared/database/models/Contact";
import Customer from "../../shared/database/models/Customer";
import Whatsapp from "../../shared/database/models/Whatsapp";
import logger from "../../shared/utils/logger";
import { emitToCompany } from "../../lib/socket";
import { getConnection } from "../../shared/services/connectionManager";


const TRANSFER_FLAG = "[TRANSFERIR]";
const TRANSFER_SETOR_FLAG = "[TRANSFERIR_SETOR:";
const REMAINING_ATTEMPTS_FLAG = "[TENTATIVAS_RESTANTES:";

async function callGroq(messages: { role: string; content: string }[]) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.AI_MODEL || "llama-3.1-8b-instant";

  logger.info(`callGroq: ${model}`);

  const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 200,
  }, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  const content = response.data.choices?.[0]?.message?.content || "";
  logger.info(`callGroq response: ${content.slice(0, 100)}...`);
  return content;
}

async function callOllama(messages: { role: string; content: string }[]) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.AI_MODEL || "qwen2.5:3b";

  logger.info(`callOllama: ${model} @ ${baseUrl}/api/chat`);

  const response = await axios.post(`${baseUrl}/api/chat`, {
    model,
    messages,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 30,
      num_ctx: 2048,
    },
  }, { timeout: 120000 });

  const content = response.data.message?.content || "";
  logger.info(`callOllama response: ${content.slice(0, 100)}...`);
  return content;
}

async function callAI(messages: { role: string; content: string }[]) {
  if (process.env.GROQ_API_KEY) {
    return callGroq(messages);
  }
  return callOllama(messages);
}

const DADOS_REGEX = /\[DADOS:\s*(.*?)\]/i;

function stripDados(text: string): string {
  return text.replace(DADOS_REGEX, '').trim();
}

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
    const newName = merged.nome || merged.name || "";
    const updateData: any = { customFields: JSON.stringify(merged) };
    if (newName && contact.name === contact.number) {
      updateData.name = newName;
    }
    await contact.update(updateData);

    const customer = await Customer.findOne({ where: { phone: contact.number, companyId } });
    const crmNotes = Object.entries(merged)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    if (customer) {
      await customer.update({
        name: newName || customer.name,
        notes: crmNotes,
        tags: Object.keys(merged).join(", "),
      });
    } else {
      await Customer.create({
        name: newName || contact.name || contact.number,
        phone: contact.number,
        notes: crmNotes,
        tags: Object.keys(merged).join(", "),
        status: "lead",
        companyId,
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
  whatsappId: number,
  history?: { role: string; content: string }[],
  collectedFields?: string[]
) {
  const name = config.attendantName || "Atendente";
  const sector = config.sector ? ` do setor ${config.sector}` : "";

  const allWas = await Whatsapp.findAll({
    where: { companyId },
    attributes: ["sector"],
  });
  const sectorsList = [...new Set(allWas.map(s => s.sector).filter(Boolean))];

  const mainPrompt = config.systemPrompt?.trim()
    ? config.systemPrompt
    : `Você é ${name}, atendente${sector} REAL (não IA). Responda em 1ª pessoa. Máximo 50 palavras.`;

  const emojiInstruction = config.emojiLevel === "none"
    ? `\n\nNÃO use emojis. Mantenha apenas texto.`
    : config.emojiLevel === "excessive"
      ? `\n\nUse muitos emojis para tornar a conversa divertida e expressiva. Seja exagerado com emojis.`
      : `\n\nUse emojis com moderação para tornar a conversa mais amigável quando apropriado.`;

  const transferInstruction = config.transferToHuman
    ? `\n\nNão soube responder? Escreva "${TRANSFER_FLAG}" ao final. Tentativas: ${remainingAttempts}. Fim: "${TRANSFER_FLAG}${REMAINING_ATTEMPTS_FLAG}0]"`
    : "";

  const instructions = config.attendanceInstructions
    ? `\n\nInstruções de atendimento:\n${config.attendanceInstructions}`
    : "";

  let context = "";
  if (config.knowledgeBase?.trim()) {
    context = `\n\nBase de conhecimento:\n${config.knowledgeBase}`;
  }

  let sectorTransferInstruction = "";
  if (sectorsList.length > 1) {
    sectorTransferInstruction =
      `\n\nSETORES DISPONÍVEIS: ${sectorsList.join(", ")}. ` +
      `Se o cliente precisar de um setor diferente do seu, escreva "${TRANSFER_SETOR_FLAG}setor]" ex: "${TRANSFER_SETOR_FLAG}vendas]".`;
  }

  const aiGoal = config.aiGoal?.trim()
    ? `\n\nMETA DA IA:\n${config.aiGoal}`
    : "";

  const extractionFields = config.extractionFields?.trim()
    ? config.extractionFields.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const remainingFields = collectedFields && collectedFields.length > 0
    ? extractionFields.filter(f => !collectedFields.includes(f.toLowerCase()))
    : extractionFields;
  const collectedNote = collectedFields && collectedFields.length > 0
    ? `\n\nJÁ COLETADO: ${collectedFields.join(", ")}. NÃO pergunte novamente.`
    : "";
  const extractionInstruction = remainingFields.length > 0
    ? `\n\nExtraia do cliente: ${remainingFields.join(", ")}. ` +
      `Quando obtiver todos, responda com "[DADOS: campo=valor, campo2=valor2]" SOMENTE com campos preenchidos.` + collectedNote
    : collectedNote;

  const fullSystemPrompt = mainPrompt + emojiInstruction + aiGoal + context + instructions + sectorTransferInstruction + extractionInstruction + transferInstruction;

  const messages: { role: string; content: string }[] = [
    { role: "system", content: fullSystemPrompt },
  ];

  if (history) {
    messages.push(...history);
  }

  messages.push({ role: "user", content: message });

  return callAI(messages);
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
    const sock = getConnection(whatsappId);
    if (!sock) throw new Error("WhatsApp desconectado");
    await sock.sendMessage(remoteJid, { text: body });
  } catch (err: any) {
    logger.error(`WhatsApp send failed (msg saved locally): ${err.message}`);
  }
  return msg;
}

export async function handleWhatsAppMessage(
  whatsappId: number,
  companyId: number,
  msg: proto.IWebMessageInfo,
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

    let number = remoteJid.split("@")[0];
    if (isLidUser(remoteJid)) {
      try {
        const sock = getConnection(whatsappId);
        const sockAny = sock as any;
        const lidMapping = sockAny?.signalRepository?.lidMapping;
        if (lidMapping?.getPNForLID) {
          const pn = await lidMapping.getPNForLID(remoteJid);
          if (pn) number = pn;
        }
      } catch (_) {}
    }

    let contact = await Contact.findOne({
      where: { number, companyId },
    });

    if (!contact) {
      contact = await Contact.create({
        name: msg.pushName || number,
        number,
        companyId,
      });
    } else if (msg.pushName && contact.name === contact.number) {
      await contact.update({ name: msg.pushName });
    }

    let isNewTicket = false;
    let ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        companyId,
        status: ["pending", "open"],
      },
    });

    if (!ticket) {
      isNewTicket = true;
      ticket = await Ticket.create({
        contactId: contact.id,
        whatsappId,
        companyId,
        status: "pending",
        isBot: true,
        botTransferAttempts: 0,
      });
    }

    // Save incoming message FIRST — antes de qualquer processamento
    const savedMsg = await Message.create({
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
      message: { id: savedMsg.id, body: text, fromMe: false, createdAt: savedMsg.createdAt },
    });

    if (isNewTicket) {
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
        } else if (contact.name !== contact.number) {
          await existing.update({ name: contact.name });
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

    // History por contato (numero), nao apenas ticket — pra ter contexto de conversas anteriores
    const recentMessages = await Message.findAll({
      where: { contactId: contact.id, companyId },
      attributes: ["body", "fromMe", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    // Remove marcadores [DADOS: ...] do historio pra nao confundir a IA
    const history = recentMessages
      .reverse()
      .map((m) => ({
        role: m.fromMe ? "assistant" : "user",
        content: m.body.replace(/\[DADOS:[^\]]*\]/g, '').trim(),
      }));
    // Dados coletados SOMENTE neste ticket (nao carrega de conversas anteriores)
    let collectedFields: string[] = [];
    const dadosRegex = /\[DADOS:\s*(.*?)\]/i;
    for (const msg of recentMessages) {
      if (msg.fromMe) {
        const match = msg.body.match(dadosRegex);
        if (match) {
          const pairs = match[1].split(",").map(s => s.trim()).filter(Boolean);
          for (const pair of pairs) {
            const eqIdx = pair.indexOf("=");
            if (eqIdx > 0) {
              const key = pair.slice(0, eqIdx).trim().toLowerCase();
              const val = pair.slice(eqIdx + 1).trim();
              if (key && val && !collectedFields.includes(key)) collectedFields.push(key);
            }
          }
        }
      }
    }
    let rawResponse = await getAiResponse(
      text,
      config,
      companyId,
      remainingAttempts,
      whatsappId,
      history,
      collectedFields
    );

    // Re-check if ticket was claimed during AI processing
    const freshTicket = await Ticket.findByPk(ticket.id, { attributes: ["isBot", "status"] });
    if (freshTicket && (!freshTicket.isBot || freshTicket.status === "closed")) {
      logger.info(`Ticket ${ticket.id} was taken by human while AI was thinking, discarding response`);
      return;
    }

    // Filtro de seguranca: remove precos e percentuais da resposta
    rawResponse = rawResponse.replace(/R?\$[\d\s.,]+/g, '').trim();
    rawResponse = rawResponse.replace(/\d+[\s]?reais/gi, '').trim();
    rawResponse = rawResponse.replace(/\d+%/g, '').trim();

    const sectorMatch = rawResponse.match(/\[TRANSFERIR_SETOR:([a-zà-ú]+)\]/i);
    if (sectorMatch) {
      const targetSector = sectorMatch[1].toLowerCase();
      const cleanResponse = rawResponse.replace(/\[TRANSFERIR_SETOR:[a-zà-ú]+\]/i, '').trim();
      const targetWa = await Whatsapp.findOne({
        where: { companyId, sector: targetSector, status: "CONNECTED" },
      });
      await ticket.update({
        status: "open",
        isBot: false,
        sector: targetSector,
        whatsappId: targetWa?.id || whatsappId,
      });
      if (cleanResponse) {
        await saveBotMessage(whatsappId, remoteJid, ticket.id, contact.id, companyId, `${stripDados(cleanResponse)}\n\n🔀 Transferi para o setor ${targetSector.toUpperCase()}.`);
      }
      emitToCompany(companyId, "ticket:updated", {
        ticketId: ticket.id,
        sector: targetSector,
        status: "open",
        isBot: false,
        contact: { id: contact.id, name: contact.name, number: contact.number },
      });
      return;
    }

    if (rawResponse.includes(TRANSFER_FLAG)) {
      attempts++;
      await ticket.update({ botTransferAttempts: attempts });

      const cleanResponse = rawResponse.replace(TRANSFER_FLAG, "").trim();
      const forceTransfer = rawResponse.includes(
        `${REMAINING_ATTEMPTS_FLAG}0]`
      );

      if (attempts >= maxAttempts || forceTransfer) {
        if (cleanResponse) {
          await saveBotMessage(whatsappId, remoteJid, ticket.id, contact.id, companyId, stripDados(cleanResponse));
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

    await saveBotMessage(whatsappId, remoteJid, ticket.id, contact.id, companyId, stripDados(rawResponse));

    try {
      const extracted = parseExtractedData(rawResponse);
      if (extracted) {
        await saveExtractedData(extracted, contact, ticket.id, companyId);
      }
    } catch (_) { }
  } catch (error) {
    logger.error("Error handling WhatsApp message:", error);
    try {
      const fbRemoteJid = msg.key.remoteJid;
      if (fbRemoteJid) {
        const fbSock = getConnection(whatsappId);
        if (fbSock) {
          const fallbackMsg = "Desculpe, estou com dificuldades técnicas no momento. Sua mensagem foi registrada e um atendente humano será notificado em breve.";
          await fbSock.sendMessage(fbRemoteJid, { text: fallbackMsg });
        }
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
    persistIndex: 0,
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
