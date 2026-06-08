import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAuthStore } from "../stores/authStore";
import api from "../lib/api";
import toast from "react-hot-toast";
import { CreditCard, Check, Mail, Upload, ArrowUp } from "lucide-react";

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [pixInfo, setPixInfo] = useState<any>(null);

  const [upgradePlanId, setUpgradePlanId] = useState<number | null>(null);
  const [costInfo, setCostInfo] = useState<any>(null);
  const [loadingCost, setLoadingCost] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data.plans));
    api.get("/subscription").then((r) => setCurrentPlan(r.data.company)).catch(() => {});
    api.get("/plan-usage").then((r) => setUsage(r.data)).catch(() => {});
  }, []);

  const isAdminUser = user?.role === "admin";
  const currentPlanId = currentPlan?.planId;

  const showCost = async (planId: number) => {
    setUpgradePlanId(planId);
    setCostInfo(null);
    setReceipt(null);
    setLoadingCost(true);
    try {
      const r = await api.get(`/upgrade/cost/${planId}`);
      setCostInfo(r.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
      setUpgradePlanId(null);
    } finally {
      setLoadingCost(false);
    }
  };

  const loadPix = async () => {
    if (!pixInfo) {
      try {
        const r = await api.get("/pix-info");
        setPixInfo(r.data);
      } catch {}
    }
  };

  const submitUpgrade = async () => {
    if (!upgradePlanId) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("planId", String(upgradePlanId));
      if (receipt) formData.append("receipt", receipt);

      await api.post("/upgrade/request", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Solicitação de upgrade enviada! Aguarde aprovação.");
      setUpgradePlanId(null);
      setCostInfo(null);
      setReceipt(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao solicitar upgrade");
    } finally {
      setSubmitting(false);
    }
  };

  const upgrade = async (planId: number) => {
    try {
      await api.put("/subscription", { planId });
      toast.success("Plano alterado!");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Assinatura</h1>
          <p className="text-muted-foreground">Gerencie seu plano</p>
        </div>

        {currentPlan && (
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>
                {currentPlan.plan?.name || currentPlan.name} — Vence em{" "}
                {new Date(currentPlan.dueDate).toLocaleDateString("pt-BR")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={currentPlan.status ? "success" : "destructive"}>
                {currentPlan.status ? "Ativo" : "Inativo"}
              </Badge>
              {currentPlan.pendingPlanId && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <ArrowUp className="w-4 h-4" />
                  Upgrade solicitado para <strong>{currentPlan.pendingPlan?.name || "outro plano"}</strong> — aguardando aprovação
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {usage && !isAdminUser && (
          <Card>
            <CardHeader>
              <CardTitle>Uso do Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {Object.entries(usage.limits).map(([key, val]: any) => {
                  const pct = val.max > 0 ? Math.round((val.current / val.max) * 100) : 0;
                  const exceeded = val.current >= val.max;
                  return (
                    <div key={key}>
                      <p className="text-sm text-muted-foreground capitalize">{key === "whatsapps" ? "WhatsApp" : key}</p>
                      <p className={`text-lg font-bold ${exceeded ? "text-red-500" : ""}`}>
                        {val.current}/{val.max}
                      </p>
                      <div className="w-full h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                        <div className={`h-full rounded-full ${exceeded ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {!isAdminUser && !currentPlan?.pendingPlanId && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center gap-4 p-4">
              <Mail className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="font-medium">Para mudar de plano, selecione abaixo e faça o upgrade pagando a diferença proporcional</p>
                <p className="text-sm text-muted-foreground">O valor é calculado com base nos dias restantes do seu ciclo atual</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.planId === plan.id;
            const isSelected = upgradePlanId === plan.id;
            return (
              <Card key={plan.id} className={`${isCurrent ? "ring-2 ring-primary" : ""} ${isSelected ? "ring-2 ring-amber-500" : ""}`}>
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-3xl font-bold">
                    R$ {Number(plan.price).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" />{plan.maxUsers} usuário{plan.maxUsers > 1 ? "s" : ""}</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" />{plan.maxConnections} conexão{plan.maxConnections > 1 ? "es" : ""} WhatsApp</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" />Até {plan.maxContacts} contatos</li>
                    {plan.useChatbot && <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" />Chatbot IA</li>}
                    {plan.useRag && <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" />IA treinada com PDFs ({plan.maxDocuments} docs)</li>}
                  </ul>

                  {isAdminUser ? (
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      onClick={() => upgrade(plan.id)}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Plano Atual" : "Assinar"}
                    </Button>
                  ) : (
                    !isCurrent && !currentPlan?.pendingPlanId && (
                      <Button
                        className="w-full"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => showCost(plan.id)}
                        disabled={isSelected && loadingCost}
                      >
                        {isSelected && loadingCost ? "Calculando..." : isSelected ? "Selecionado" : "Fazer Upgrade"}
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {costInfo && upgradePlanId && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Upgrade para {costInfo.targetPlan.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plano atual:</span>
                  <span className="font-medium">{costInfo.currentPlan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Novo plano:</span>
                  <span className="font-medium">{costInfo.targetPlan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Diferença de preço:</span>
                  <span className="font-medium">R$ {costInfo.priceDiff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Dias restantes no ciclo:</span>
                  <span className="font-medium">{costInfo.daysRemaining} dia(s)</span>
                </div>
                <hr className="border-amber-200" />
                <div className="flex justify-between text-base font-bold">
                  <span>Valor proporcional a pagar:</span>
                  <span className="text-amber-700">R$ {costInfo.proratedAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <p className="font-semibold text-amber-800">Pagamento via PIX</p>
                </div>
                {!pixInfo ? (
                  <Button variant="outline" size="sm" onClick={loadPix}>
                    Mostrar dados PIX
                  </Button>
                ) : (
                  <>
                    <p className="text-sm text-amber-700">Banco: {pixInfo.bank}</p>
                    <p className="text-sm text-amber-700">Agência: {pixInfo.agency}</p>
                    <p className="text-sm text-amber-700">Conta: {pixInfo.account}</p>
                    <p className="text-sm text-amber-700">CNPJ: {pixInfo.cnpj}</p>
                    <p className="text-sm text-amber-700">Nome: {pixInfo.name}</p>
                    <div className="bg-white rounded p-2 border border-amber-300 mt-1">
                      <p className="text-sm font-mono text-center font-bold text-amber-800">Chave PIX: {pixInfo.pixKey}</p>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">
                      Pague exatamente <strong>R$ {costInfo.proratedAmount.toFixed(2)}</strong> e envie o comprovante abaixo
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Comprovante de Pagamento (JPG ou PDF)</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-secondary/50 transition">
                  <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{receipt ? receipt.name : "Clique para enviar o comprovante"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Máx 10MB. Aceito: JPG, PNG, PDF</p>
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="flex gap-3">
                <Button onClick={submitUpgrade} disabled={submitting || !receipt} className="bg-amber-500 hover:bg-amber-600 text-black">
                  {submitting ? "Enviando..." : "Solicitar Upgrade"}
                </Button>
                <Button variant="outline" onClick={() => { setUpgradePlanId(null); setCostInfo(null); setReceipt(null); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
