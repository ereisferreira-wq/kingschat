import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import toast from "react-hot-toast";
import { Bot, Save } from "lucide-react";

const PERSIST_OPTIONS: Record<string, { value: string; label: string }[]> = {
  basic: [
    { value: "[1,10,30]", label: "1min, 10min, 30min" },
    { value: "[5,15,30]", label: "5min, 15min, 30min" },
    { value: "[10,30,60]", label: "10min, 30min, 1h" },
  ],
  standard: [
    { value: "[1,5,10,30,60]", label: "1min, 5min, 10min, 30min, 1h" },
    { value: "[5,10,30,60,180]", label: "5min, 10min, 30min, 1h, 3h" },
    { value: "[10,30,60,180,360]", label: "10min, 30min, 1h, 3h, 6h" },
  ],
  pro: [
    { value: "[1,5,10,30,60,180,360,720,1440,2880]", label: "1min, 5min, 10min, 30min, 1h, 3h, 6h, 12h, 24h, 48h" },
    { value: "[5,10,30,60,180,360,720,1440,2880,4320]", label: "5min, 10min, 30min, 1h, 3h, 6h, 12h, 24h, 48h, 72h" },
    { value: "[10,30,60,180,360,720,1440,2880,4320,5760]", label: "10min, 30min, 1h, 3h, 6h, 12h, 24h, 48h, 72h, 96h" },
  ],
};

export default function ChatbotPage() {
  const [config, setConfig] = useState<any>({
    isActive: true,
    attendantName: "",
    sector: "",
    attendanceInstructions: "",
    welcomeMessage: "",
    knowledgeBase: "",
    systemPrompt: "",
    extractionFields: "nome, cidade, placa",
    aiGoal: "",
    persistIntervals: "[]",
    transferToHuman: true,
    transferMessage: "Estou transferindo para um atendente humano. Por favor, aguarde um momento.",
    transferKeywords: "atendente,humano,falar com alguém,quero falar com,transferir,suporte,reclamação,ajuda",
  });
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [productLabels, setProductLabels] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.get("/chatbot/config").then((r) => r.data.config),
      api.get("/company").then((r) => r.data.company),
    ])
      .then(([cfg, company]) => {
        setConfig((prev: any) => ({ ...prev, ...cfg }));
        setPlan(company.plan);
        const existingProducts = (company as any).productsServices || "";
        try {
          const parsed = JSON.parse(existingProducts);
          if (Array.isArray(parsed)) setProductLabels(parsed);
          else setProductLabels(existingProducts ? [existingProducts] : []);
        } catch {
          setProductLabels(existingProducts ? [existingProducts] : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      await api.put("/chatbot/config", config);
      await api.put("/company", {
        productsServices: JSON.stringify(productLabels.filter(Boolean)),
      });
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar");
    }
  };

  const maxProducts = plan?.maxProducts || 3;
  const planKey = plan?.name?.toLowerCase() === "pro" ? "pro"
    : plan?.name?.toLowerCase() === "standard" ? "standard"
    : "basic";
  const persistOptions = PERSIST_OPTIONS[planKey] || PERSIST_OPTIONS.basic;

  const handleProductChange = (idx: number, val: string) => {
    const updated = [...productLabels];
    updated[idx] = val;
    setProductLabels(updated);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chatbot</h1>
            <p className="text-muted-foreground">Configure seu atendente automático</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={config.isActive}
              onClick={() => setConfig({ ...config, isActive: !config.isActive })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium">
              {config.isActive ? "Ativo" : "Inativo"}
            </span>
          </label>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Identidade do Atendente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Nome do Atendente</label>
                    <Input
                      value={config.attendantName}
                      onChange={(e) => setConfig({ ...config, attendantName: e.target.value })}
                      placeholder="Ex: Derick"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Setor</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={config.sector}
                      onChange={(e) => setConfig({ ...config, sector: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      <option value="vendas">Vendas</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="adm">ADM</option>
                      <option value="suporte">Suporte</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-sm font-medium block mb-1">Uso de Emojis</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={config.emojiLevel || "moderate"}
                    onChange={(e) => setConfig({ ...config, emojiLevel: e.target.value })}
                  >
                    <option value="none">Não usar emojis</option>
                    <option value="moderate">Moderado</option>
                    <option value="excessive">Exagerado</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Instruções de Atendimento</label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={config.attendanceInstructions}
                    onChange={(e) => setConfig({ ...config, attendanceInstructions: e.target.value })}
                    placeholder="Ex: Sempre pergunte o nome do cliente. Ofereça os produtos com benefícios, não só preço. Se for reclamação, acolha e transfira."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produtos / Serviços</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: maxProducts }).map((_, idx) => (
                  <div key={idx}>
                    <label className="text-sm font-medium block mb-1">Produto/Serviço {idx + 1}</label>
                    <Input
                      value={productLabels[idx] || ""}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      placeholder={`Ex: Seguro Auto, Seguro Residencial, ...`}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Seu plano permite até {maxProducts} produtos/serviços.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensagem de Boas-Vindas</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                  value={config.welcomeMessage}
                  onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                  placeholder="Olá! Sou o assistente virtual. Como posso ajudar?"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base de Conhecimento</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={config.knowledgeBase || ""}
                  onChange={(e) => setConfig({ ...config, knowledgeBase: e.target.value })}
                  placeholder={`Ex: Horário de funcionamento: seg a sex 8h-18h
Produtos: seguro auto R$150/mês, seguro residencial R$80/mês
Diferenciais: atendimento 24h, carro reserva grátis`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Informações que a IA usará para responder os clientes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Extração de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Meta da IA</label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={config.aiGoal || ""}
                    onChange={(e) => setConfig({ ...config, aiGoal: e.target.value })}
                    placeholder="Ex: Extrair placa, nome, modelo do veículo, cidade ou endereço do cliente durante a conversa"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Objetivo principal que a IA deve seguir ao extrair dados.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Dados para Extrair</label>
                  <Input
                    value={config.extractionFields || ""}
                    onChange={(e) => setConfig({ ...config, extractionFields: e.target.value })}
                    placeholder="nome, cidade, placa"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separe por vírgulas. A IA vai perguntar esses dados e salvar automaticamente no CRM.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Persistência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Intervalos de Follow-up</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={config.persistIntervals || "[]"}
                    onChange={(e) => setConfig({ ...config, persistIntervals: e.target.value })}
                  >
                    <option value="[]">Desligado</option>
                    {persistOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Após o cliente parar de responder, a IA enviará follow-ups nos intervalos acima.
                    Seu plano: {planKey === "pro" ? "Top" : planKey === "standard" ? "Standard" : "Basic"} (até {plan?.maxPersist || 3} mensagens).
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4">
              <Button onClick={save}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
              <Button variant="destructive" onClick={async () => {
                const clean = {
                  ...config,
                  attendanceInstructions: "",
                  systemPrompt: "",
                  knowledgeBase: "",
                };
                setConfig(clean);
                try {
                  await api.put("/chatbot/config", clean);
                  toast.success("IA resetada!");
                } catch { toast.error("Erro ao resetar"); }
              }}>
                Resetar IA
              </Button>
              <Badge variant={config.isActive ? "success" : "secondary"}>
                {config.isActive ? "Bot Ativo" : "Bot Inativo"}
              </Badge>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
