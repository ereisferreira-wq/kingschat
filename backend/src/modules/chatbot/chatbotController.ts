import { Request, Response } from "express";
import axios from "axios";
import ChatbotConfig from "../../shared/database/models/ChatbotConfig";
import Company from "../../shared/database/models/Company";
import logger from "../../shared/utils/logger";

export async function getConfig(req: Request, res: Response) {
  let config = await ChatbotConfig.findOne({
    where: { companyId: req.companyId },
  });

  if (!config) {
    config = await ChatbotConfig.create({
      companyId: req.companyId,
      isActive: true,
      aiProvider: "openai",
      aiModel: "gpt-4o",
      systemPrompt:
        "Você é um assistente de atendimento ao cliente. Responda de forma educada e profissional. Durante a conversa, pergunte o nome, cidade e placa do veículo do cliente para registro.",
      temperature: 0.7,
      maxTokens: 2048,
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

export async function listModels(req: Request, res: Response) {
  try {
    const config = await ChatbotConfig.findOne({
      where: { companyId: req.companyId },
    });
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || config?.ollamaBaseUrl || "http://localhost:11434";
    logger.info(`listModels: fetching from ${ollamaBaseUrl}/api/tags`);
    const response = await axios.get(`${ollamaBaseUrl}/api/tags`, { timeout: 5000 });
    const models = response.data.models || [];
    res.json({ models: models.map((m: any) => m.name) });
  } catch (error: any) {
    logger.error(`listModels error: ${error.message}`);
    res.status(502).json({ error: "Falha ao buscar modelos Ollama: " + error.message });
  }
}

export async function generatePrompt(req: Request, res: Response) {
  const company = await Company.findByPk(req.companyId);
  if (!company) return res.status(404).json({ error: "Company not found" });

  const { businessArea, businessHours, productsServices, differentials } = company;
  const name = company.name || "Minha Empresa";
  const segmento = businessArea || "nosso segmento";
  const horario = businessHours || "seg a sex das 8h as 18h";
  const produtos = productsServices || "nossos produtos e servicos";
  const vantagens = differentials || "";

  const diffSection = vantagens
    ? `\nDIFERENCIAIS E VANTAGENS:\n${vantagens}\n`
    : "";

  const systemPrompt = `VOCÊ É: O assistente virtual oficial da ${name}.

PERSONALIDADE:
- Educado, prestativo e profissional, mas com um tom amigável e natural.
- Responde sempre de forma clara, direta e em português do Brasil.
- Mantém um tom positivo, mesmo em situações de reclamação ou problema.
- Quando não souber responder, admite educadamente e oferece transferir para um humano.

SOBRE A EMPRESA:
- Nome: ${name}
- Segmento: ${segmento}
- Horário de funcionamento: ${horario}
${diffSection}
PRODUTOS E SERVIÇOS:
${produtos}

VENDA CONSULTIVA — REGRA ESSENCIAL:
Quando o cliente perguntar sobre um produto ou serviço, SEMPRE destaque os benefícios e vantagens, não apenas o nome e preço. Explique POR QUE ele deveria contratar/comprar. Use o diferencial da empresa como argumento de venda.

Exemplo de venda consultiva:
Cliente: "Quanto é o café?"
Resposta fraca: "O café é R$5."
Resposta FORTE: "O café é R$5 — e é um dos nossos carros-chefe! Ele é feito com grãos selecionados e torra especial, e nossos clientes amam. Se quiser experimentar com um pão de queijo quentinho, fazemos um combo por R$8!"

REGRAS DE OURO:
1. IDENTIFICAÇÃO → Sempre comece se apresentando: "Olá! Sou o assistente virtual da ${name}. Como posso ajudar?"
2. COLETA DE DADOS → Durante a conversa, pergunte educadamente o NOME, CIDADE e PLACA do veículo do cliente. Anote esses dados mentalmente para registrar.
3. HORÁRIO → Se for fora do horário comercial, avise: "No momento estamos fora do horário de atendimento. Funcionamos de ${horario}. Deixe sua mensagem que retornaremos assim que possível."
4. VENDA CONSULTIVA → Sempre destaque vantagens ao falar de produtos/preços. Mostre o valor, não só o valor monetário.
5. ORÇAMENTOS → Se pedirem preços ou orçamentos, forneça as informações com benefícios. Se precisar de detalhes personalizados, colete nome e telefone.
6. AGENDAMENTO → Pergunte: data preferida, horário, e o que deseja. Confirme os dados antes de finalizar.
7. RECLAMAÇÕES → Acolha, peça desculpas, e transfira para atendente humano.
8. NÃO SABE → "Não tenho essa informação, mas vou transferir para um atendente humano que poderá ajudar."
9. CONVERSA NATURAL → Varie saudações e respostas. Nada de respostas decoradas.
10. OBJETIVIDADE → Seja direto. Evite textos muito longos.
11. ENCERRAMENTO → Pergunte se precisa de mais algo e deseje um bom dia/tarde/noite.

TOM DE VOZ:
- Profissional mas caloroso
- Respeitoso e paciente
- Solucionador (foco em resolver)
- Proativo (sugira produtos relacionados)`;

  const knowledgeBase = `═══════════════════════════════════════════
  BASE DE CONHECIMENTO — ${name}
═══════════════════════════════════════════

DADOS DA EMPRESA:
• Nome: ${name}
• Segmento: ${segmento}
• Horário de funcionamento: ${horario}
${diffSection}
PRODUTOS E SERVIÇOS:
${produtos}

FLUXO DE ATENDIMENTO PADRÃO:
1. Saudação personalizada
2. Identificar o que o cliente precisa
3. Responder destacando vantagens e benefícios
4. Sugerir produtos/serviços relacionados
5. Encerrar perguntando se precisa de algo mais

TÉCNICA DE VENDA CONSULTIVA:
- Sempre responda com benefícios, não só características
- Ex: ao invés de "Temos bolo de cenoura por R$25"
- Diga: "Temos bolo de cenoura por R$25 — é o favorito dos nossos clientes, bem fofinho e com cobertura generosa. Quer encomendar um?"
- Use os diferenciais da empresa para justificar valor

INSTRUÇÕES:
- Consulte a lista de produtos com preços e vantagens
- Para agendamentos, colete: nome, telefone, data, horário
- Para reclamações, peça desculpas e transfira para humano
- Dúvidas sem resposta na base → transfira para humano
- Durante o atendimento, pergunte o NOME, CIDADE e PLACA do cliente para cadastro. Se o cliente já forneceu, agradeça e confirme.`;

  let config = await ChatbotConfig.findOne({
    where: { companyId: req.companyId },
  });

  if (!config) {
    config = await ChatbotConfig.create({
      companyId: req.companyId,
      isActive: true,
      aiProvider: "openai",
      aiModel: "gpt-4o",
      systemPrompt,
      knowledgeBase,
      temperature: 0.7,
      maxTokens: 2048,
    });
  } else {
    await config.update({ systemPrompt, knowledgeBase });
  }

  await company.update({ promptAutoGenerated: true });

  res.json({ config, generated: true });
}
