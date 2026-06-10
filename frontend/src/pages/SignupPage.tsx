import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Crown, MessageSquare, Check, Upload, CreditCard } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", companyName: "" });
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [pixInfo, setPixInfo] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/plans").then((r) => {
      setPlans(r.data.plans);
      if (r.data.plans.length > 0) setSelectedPlanId(r.data.plans[0].id);
    });
  }, []);

  const loadPix = async (planId: number) => {
    setSelectedPlanId(planId);
    if (!pixInfo) {
      try {
        const r = await api.get("/pix-info");
        setPixInfo(r.data);
      } catch {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return toast.error("Selecione um plano");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("phone", form.phone);
      formData.append("companyName", form.companyName);
      formData.append("planId", String(selectedPlanId));
      if (receipt) formData.append("receipt", receipt);

      const res = await api.post("/signup", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      useAuthStore.getState().loadUser();
      const user = res.data.user;
      if (user?.company?.status) {
        toast.success("Conta criada com sucesso!");
        navigate("/dashboard");
      } else {
        toast.success("Conta criada! Aguarde aprovação.");
        navigate("/pending");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen flex items-start justify-center bg-background py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-8 h-8 text-amber-400" />
            <MessageSquare className="w-7 h-7 text-amber-400 -ml-1" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Kings Chat</h1>
          <p className="text-muted-foreground mt-1">Crie sua conta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cadastro</CardTitle>
            <CardDescription>Escolha seu plano e faça o cadastro</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium block mb-1">Nome</label>
                  <Input placeholder="Seu nome" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Email</label>
                  <Input type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Senha</label>
                  <Input type="password" placeholder="********" value={form.password} onChange={(e) => updateField("password", e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Telefone</label>
                  <Input placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Empresa</label>
                  <Input placeholder="Nome da sua empresa" value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-3">Escolha seu plano</label>
                <div className="grid gap-3 md:grid-cols-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => loadPix(plan.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedPlanId === plan.id ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50" : "hover:border-amber-300"}`}
                    >
                      <p className="font-semibold text-lg">{plan.name}</p>
                      <p className="text-2xl font-bold text-amber-600">R$ {Number(plan.price).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{plan.maxContacts} contatos</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> {plan.maxUsers} usuário{plan.maxUsers > 1 ? "s" : ""}</p>
                        <p className="text-xs flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> {plan.maxConnections} WhatsApp</p>
                        {plan.useChatbot && <p className="text-xs flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Chatbot IA</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPlanId && pixInfo && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-amber-600" />
                    <p className="font-semibold text-amber-800">Dados para Pagamento via PIX</p>
                  </div>
                  <p className="text-sm text-amber-700">Banco: {pixInfo.bank}</p>
                  <p className="text-sm text-amber-700">Agência: {pixInfo.agency}</p>
                  <p className="text-sm text-amber-700">Conta: {pixInfo.account}</p>
                  <p className="text-sm text-amber-700">CNPJ: {pixInfo.cnpj}</p>
                  <p className="text-sm text-amber-700">Nome: {pixInfo.name}</p>
                  <div className="bg-white rounded p-2 border border-amber-300 mt-1">
                    <p className="text-sm font-mono text-center font-bold text-amber-800">Chave PIX: {pixInfo.pixKey}</p>
                  </div>
                </div>
              )}

              {selectedPlanId && (
                <div>
                  <label className="text-sm font-medium block mb-1">Comprovante de Pagamento (JPG ou PDF)</label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-secondary/50 transition">
                    <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{receipt ? receipt.name : "Clique para enviar o comprovante"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Máx 10MB. Aceito: JPG, PNG, PDF</p>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
                  </label>
                </div>
              )}

              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" disabled={loading || !selectedPlanId}>
                {loading ? "Criando..." : "Criar conta"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary hover:underline">Faça login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
