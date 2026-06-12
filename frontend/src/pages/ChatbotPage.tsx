import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import toast from "react-hot-toast";
import { Bot, Save, Users, RefreshCw } from "lucide-react";

export default function ChatbotPage() {
  const [config, setConfig] = useState<any>({
    isActive: true,
    aiProvider: "openai",
    aiModel: "gpt-4o",
    systemPrompt: "",
    temperature: 0.7,
    maxTokens: 2048,
    apiKey: "",
    ollamaBaseUrl: "http://localhost:11434",
    welcomeMessage: "",
    farewellMessage: "",
    transferToHuman: false,
    transferKeywords: "",
    transferMessage: "",
    maxTransferAttempts: 3,
  });
  const [loading, setLoading] = useState(true);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    api
      .get("/chatbot/config")
      .then((r) => setConfig(r.data.config))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchOllamaModels = async () => {
    setLoadingModels(true);
    try {
      const r = await api.get("/chatbot/models");
      setOllamaModels(r.data.models || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao buscar modelos");
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (config.aiProvider === "ollama") {
      fetchOllamaModels();
    }
  }, [config.aiProvider]);

  const save = async () => {
    try {
      await api.put("/chatbot/config", config);
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Chatbot IA</h1>
          <p className="text-muted-foreground">
            Configure seu assistente inteligente
          </p>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Provedor de IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={config.aiProvider === "openai" ? "default" : "outline"}
                    onClick={() => setConfig({ ...config, aiProvider: "openai" })}
                  >
                    OpenAI (GPT)
                  </Button>
                  <Button
                    variant={config.aiProvider === "ollama" ? "default" : "outline"}
                    onClick={() => setConfig({ ...config, aiProvider: "ollama" })}
                  >
                    Ollama (Local)
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Modelo</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={config.aiModel}
                      onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
                    >
                      {config.aiProvider === "openai" ? (
                        <>
                          <option value="gpt-5">GPT-5</option>
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          <option value="o1">o1</option>
                          <option value="o1-mini">o1 Mini</option>
                          <option value="o3-mini">o3 Mini</option>
                        </>
                      ) : ollamaModels.length > 0 ? (
                        ollamaModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))
                      ) : (
                        <option value="">{loadingModels ? "Carregando..." : "Nenhum modelo encontrado"}</option>
                      )}
                    </select>
                    {config.aiProvider === "ollama" && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchOllamaModels}
                        disabled={loadingModels}
                        title="Atualizar modelos"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingModels ? "animate-spin" : ""}`} />
                      </Button>
                    )}
                  </div>
                </div>
                {config.aiProvider === "openai" && (
                  <div>
                    <label className="text-sm font-medium block mb-1">API Key OpenAI</label>
                    <Input
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="sk-..."
                    />
                  </div>
                )}
                {config.aiProvider === "ollama" && (
                  <div>
                    <label className="text-sm font-medium block mb-1">URL Base Ollama</label>
                    <Input
                      value={config.ollamaBaseUrl}
                      onChange={(e) => setConfig({ ...config, ollamaBaseUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Personalidade do Bot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Prompt do Sistema
                  </label>
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={config.systemPrompt}
                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    placeholder="Ex: Você é um atendente virtual da empresa X. Responda de forma educada e profissional..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Temperatura ({config.temperature})
                    </label>
                    <input
                      type="range" min="0" max="2" step="0.1"
                      value={config.temperature}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Max Tokens</label>
                    <Input
                      type="number"
                      value={config.maxTokens}
                      onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base de Conhecimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Informações da empresa para a IA consultar
                  </label>
                  <textarea
                    className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    value={config.knowledgeBase || ""}
                    onChange={(e) => setConfig({ ...config, knowledgeBase: e.target.value })}
                    placeholder={`Ex: Somos a empresa XYZ, fundada em 2020.
Atendemos de seg a sex das 8h às 18h.
Nosso produto principal é...
Preços: ...
Política de devolução: ...`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Escreva aqui todas as informações que a IA deve saber para atender seus clientes. 
                    Quanto mais detalhado, melhor será a resposta.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Transferência para Humano
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.transferToHuman}
                    onChange={(e) => setConfig({ ...config, transferToHuman: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    Ativar transferência para atendente humano
                  </span>
                </label>

                {config.transferToHuman && (
                  <>
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Palavras-chave para transferir
                      </label>
                      <Input
                        value={config.transferKeywords}
                        onChange={(e) => setConfig({ ...config, transferKeywords: e.target.value })}
                        placeholder="atendente, humano, falar com alguém, suporte"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Separe por vírgulas. Se o cliente digitar qualquer uma dessas palavras, a conversa é transferida.
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Tentativas antes de transferir
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.maxTransferAttempts}
                        onChange={(e) => setConfig({ ...config, maxTransferAttempts: parseInt(e.target.value) || 3 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Quantas vezes a IA pode falhar em responder antes de transferir pro humano. (recomendado: 3)
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Mensagem de transferência
                      </label>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        rows={2}
                        value={config.transferMessage}
                        onChange={(e) => setConfig({ ...config, transferMessage: e.target.value })}
                        placeholder="Estou transferindo para um atendente humano. Por favor, aguarde."
                      />
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm text-blue-700 dark:text-blue-300">
                      <strong>Como funciona:</strong> Quando o cliente pede atendente ou a IA não sabe responder, ela tenta até <strong>{config.maxTransferAttempts || 3} vezes</strong> antes de transferir pro humano. A cada tentativa, o cliente é convidado a reformular a pergunta.
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensagens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Mensagem de boas-vindas</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    value={config.welcomeMessage}
                    onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                    placeholder="Olá! Como posso ajudar?"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Mensagem de encerramento</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    value={config.farewellMessage}
                    onChange={(e) => setConfig({ ...config, farewellMessage: e.target.value })}
                    placeholder="Obrigado pelo contato!"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4">
              <Button onClick={save}>
                <Save className="w-4 h-4 mr-2" /> Salvar Configurações
              </Button>
              <Badge variant={config.isActive ? "success" : "secondary"}>
                {config.isActive ? "Bot Ativo" : "Bot Inativo"}
              </Badge>
              {config.transferToHuman && (
                <Badge variant="warning">
                  Transferência humana ativa
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
