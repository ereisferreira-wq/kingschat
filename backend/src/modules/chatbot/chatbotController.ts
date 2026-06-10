import { Request, Response } from "express";
import ChatbotConfig from "../../shared/database/models/ChatbotConfig";
import Company from "../../shared/database/models/Company";

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
        "Você é um assistente de atendimento ao cliente. Responda de forma educada e profissional.",
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

export async function generatePrompt(req: Request, res: Response) {
  const company = await Company.findByPk(req.companyId);
  if (!company) return res.status(404).json({ error: "Company not found" });

  const { businessArea, businessHours, productsServices } = company;
  const name = company.name || "Minha Empresa";
  const segmento = businessArea || "nosso segmento";
  const horario = businessHours || "seg a sex das 8h as 18h";
  const produtos = productsServices || "nossos produtos e servicos";

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

PRODUTOS E SERVIÇOS:
${produtos}

REGRAS DE OURO:
1. IDENTIFICAÇÃO → Sempre comece se apresentando: "Olá! Sou o assistente virtual da ${name}. Como posso ajudar?"
2. HORÁRIO → Se for fora do horário comercial, avise: "No momento estamos fora do horário de atendimento. Funcionamos de ${horario}. Deixe sua mensagem que retornaremos assim que possível."
3. ORÇAMENTOS → Se pedirem preços ou orçamentos, forneça as informações disponíveis. Se precisar de detalhes personalizados, colete nome e telefone e avise que um atendente entrará em contato.
4. AGENDAMENTO → Para agendamentos, pergunte: data preferida, horário, e o que deseja. Confirme os dados antes de finalizar.
5. RECLAMAÇÕES → Acolha a reclamação, peça desculpas educadamente, e transfira para um atendente humano resolver.
6. NÃO SABE → Se não souber responder, diga: "Não tenho essa informação no momento, mas vou transferir você para um atendente humano que poderá ajudar."
7. DADOS DO CLIENTE → Se precisar de dados como nome, telefone ou endereço, pergunte de forma educada e nunca exija informações sensíveis.
8. CONVERSA NATURAL → Não seja robótico. Varie as saudações e respostas. Use linguagem natural como uma pessoa real atenderia.
9. OBJETIVIDADE → Seja direto nas respostas. Evite textos muito longos. Vá direto ao ponto.
10. ENCERRAMENTO → Ao finalizar, pergunte se precisa de mais algo e deseje um bom dia/tarde/noite.

TOM DE VOZ:
- Profissional mas caloroso
- Respeitoso e paciente
- Solucionador (foco em resolver o problema do cliente)
- Proativo (sugere produtos/serviços relacionados quando pertinente)`;

  const knowledgeBase = `═══════════════════════════════════════════
  BASE DE CONHECIMENTO — ${name}
═══════════════════════════════════════════

DADOS DA EMPRESA:
• Nome fantasia: ${name}
• Segmento: ${segmento}
• Horário de funcionamento: ${horario}

PRODUTOS E SERVIÇOS OFERECIDOS:
${produtos}

FLUXO DE ATENDIMENTO PADRÃO:
1. Saudação → "Olá! Sou o assistente virtual da ${name}. Como posso ajudar?"
2. Identificação da necessidade → Ouvir/ler o que o cliente precisa
3. Resposta/Resolução → Fornecer informação ou solução
4. Oferta adicional → Perguntar se precisa de algo mais
5. Encerramento → "Foi um prazer ajudar! Se precisar, estou aqui. Tenha um excelente dia!"

TIPOS DE ATENDIMENTO:
• Dúvidas sobre produtos
• Orçamentos e preços
• Agendamento de serviços
• Reclamações e suporte
• Informações gerais sobre a empresa

INSTRUÇÕES ESPECÍFICAS:
- Em caso de dúvidas sobre valores, consulte a lista de produtos com preços se disponível.
- Para agendamentos, colete: nome, telefone, data desejada, horário desejado.
- Para reclamações, peça desculpas, acolha e transfira para atendente humano.
- Pedidos de informação que você não tem, transfira para humano.`;

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
