import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useAuthStore } from "../stores/authStore";
import api from "../lib/api";
import toast from "react-hot-toast";
import { Search, CheckCircle, XCircle, Building, Mail, Calendar, ArrowUp, Trash2, Users, DollarSign, Save, X } from "lucide-react";

export default function AdminPanel() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [plans, setPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ name: "", price: "", maxUsers: 1, maxConnections: 1, maxContacts: 500, useChatbot: false });

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter !== "all") params.set("status", filter);
    api.get(`/admin/companies?${params}`).then(r => setCompanies(r.data.companies)).catch(() => {});
  };

  useEffect(() => { load() }, [search, filter]);

  const loadPlans = () => {
    api.get("/admin/plans").then(r => setPlans(r.data.plans)).catch(() => {});
  };

  useEffect(() => { loadPlans() }, []);

  const approve = async (id: number) => {
    try {
      await api.put(`/admin/companies/${id}/approve`);
      toast.success("Empresa ativada!");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const block = async (id: number) => {
    try {
      await api.put(`/admin/companies/${id}/block`);
      toast.success("Empresa bloqueada!");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const approveUpgrade = async (id: number) => {
    try {
      await api.put(`/admin/upgrade/${id}/approve`);
      toast.success("Upgrade aprovado!");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const rejectUpgrade = async (id: number) => {
    try {
      await api.put(`/admin/upgrade/${id}/reject`);
      toast.success("Upgrade rejeitado");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="text-center py-20">
          <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  const openPlanEdit = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: String(plan.price),
      maxUsers: plan.maxUsers,
      maxConnections: plan.maxConnections,
      maxContacts: plan.maxContacts,
      useChatbot: plan.useChatbot,
    });
  };

  const savePlan = async () => {
    if (!editingPlan || !planForm.name || !planForm.price) return toast.error("Nome e preço são obrigatórios");
    try {
      await api.put(`/plans/${editingPlan.id}`, {
        name: planForm.name,
        price: parseFloat(planForm.price),
        maxUsers: planForm.maxUsers,
        maxConnections: planForm.maxConnections,
        maxContacts: planForm.maxContacts,
        useChatbot: planForm.useChatbot,
      });
      toast.success("Plano atualizado!");
      setEditingPlan(null);
      loadPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar plano");
    }
  };

  const pendingUpgrades = companies.filter(c => c.pendingPlanId);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie todas as empresas cadastradas</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/users")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gerenciamento</p>
                  <h3 className="text-lg font-semibold">Usuários</h3>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Visualizar e resetar senhas</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/cleanup")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Manutenção</p>
                  <h3 className="text-lg font-semibold">Limpeza de Dados</h3>
                </div>
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Monitorar empresas inativas</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/upgrade-requests")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <h3 className="text-lg font-semibold">Upgrades Pendentes</h3>
                </div>
                <ArrowUp className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Aprovar ou rejeitar upgrades</p>
            </CardContent>
          </Card>
        </div>

        {pendingUpgrades.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <ArrowUp className="w-5 h-5" />
                Upgrades Pendentes ({pendingUpgrades.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingUpgrades.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Plano atual: {c.plan?.name} → Solicita: {c.pendingPlan?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveUpgrade(c.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500" onClick={() => rejectUpgrade(c.id)}>
                      <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Planos e Preços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plans.map(plan => (
                <div key={plan.id} className="border rounded-lg p-4">
                  {editingPlan?.id === plan.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="text-xs font-medium block mb-1">Nome</label>
                          <Input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Preço (R$)</label>
                          <Input value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Usuários</label>
                          <Input type="number" min={1} value={planForm.maxUsers} onChange={e => setPlanForm({ ...planForm, maxUsers: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">WhatsApps</label>
                          <Input type="number" min={1} value={planForm.maxConnections} onChange={e => setPlanForm({ ...planForm, maxConnections: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Contatos</label>
                          <Input type="number" min={1} value={planForm.maxContacts} onChange={e => setPlanForm({ ...planForm, maxContacts: parseInt(e.target.value) || 500 })} />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input type="checkbox" id="planChatbot" checked={planForm.useChatbot} onChange={e => setPlanForm({ ...planForm, useChatbot: e.target.checked })} className="rounded" />
                          <label htmlFor="planChatbot" className="text-sm">Chatbot IA</label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={savePlan}><Save className="w-3 h-3 mr-1" /> Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-2xl font-bold">R$ {Number(plan.price).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.maxUsers} usuário(s) · {plan.maxConnections} WhatsApp(s) · {plan.maxContacts} contatos · {plan.useChatbot ? "Chatbot IA" : "Sem chatbot"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openPlanEdit(plan)}>
                        Editar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar empresas..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Pendentes</option>
          </select>
        </div>

        <div className="space-y-3">
          {companies.map(c => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-3 rounded-full ${c.status ? "bg-green-50" : "bg-yellow-50"}`}>
                    <Building className={`w-5 h-5 ${c.status ? "text-green-600" : "text-yellow-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.name}</p>
                      <Badge variant={c.status ? "success" : "warning"}>
                        {c.status ? "Ativo" : "Pendente"}
                      </Badge>
                      {c.pendingPlanId && (
                        <Badge variant="warning">
                          <ArrowUp className="w-3 h-3 mr-1" /> Upgrade: {c.pendingPlan?.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Criado: {new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {c.users?.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {c.users.map((u: any) => (
                          <span key={u.id} className="text-xs bg-secondary px-2 py-0.5 rounded">
                            {u.name} ({u.role})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {c.pendingPlanId && (
                    <>
                      <Button size="sm" onClick={() => approveUpgrade(c.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Aprov. Upgrade
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500" onClick={() => rejectUpgrade(c.id)}>
                        <XCircle className="w-4 h-4 mr-1" /> Rej. Upgrade
                      </Button>
                    </>
                  )}
                  {c.status ? (
                    <Button size="sm" variant="outline" onClick={() => block(c.id)} className="text-red-500">
                      <XCircle className="w-4 h-4 mr-1" /> Bloquear
                    </Button>
                  ) : (
                    !c.pendingPlanId && (
                      <Button size="sm" onClick={() => approve(c.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {companies.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma empresa encontrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
