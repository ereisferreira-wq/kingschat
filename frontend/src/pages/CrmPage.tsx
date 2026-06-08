import React, { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import toast from "react-hot-toast";
import {
  Plus, Search, Users, Phone, Mail, User, Calendar, X,
  Download, Upload, Send, Clock,
} from "lucide-react";

const statusList = [
  { value: "lead", label: "Lead", color: "bg-blue-100 text-blue-800" },
  { value: "qualified", label: "Qualificado", color: "bg-indigo-100 text-indigo-800" },
  { value: "proposal", label: "Proposta", color: "bg-purple-100 text-purple-800" },
  { value: "negotiation", label: "Negociação", color: "bg-yellow-100 text-yellow-800" },
  { value: "won", label: "Fechado", color: "bg-green-100 text-green-800" },
  { value: "lost", label: "Perdido", color: "bg-red-100 text-red-800" },
  { value: "inactive", label: "Inativo", color: "bg-gray-100 text-gray-800" },
];

const statusMap = Object.fromEntries(statusList.map(s => [s.value, s]));

export default function CrmPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState<any>({ total: 0, byStatus: [], followUps: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", status: "lead", notes: "", tags: "", nextFollowUp: "" });
  const [showBulk, setShowBulk] = useState(false);
  const [bulkTemplate, setBulkTemplate] = useState("");
  const [bulkMinDelay, setBulkMinDelay] = useState(30);
  const [bulkMaxDelay, setBulkMaxDelay] = useState(60);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    api.get(`/crm?${params}`).then(r => setCustomers(r.data.customers));
    api.get("/crm/stats").then(r => setStats(r.data));
  };

  useEffect(() => { load() }, [search, statusFilter]);

  const resetForm = () => {
    setForm({ name: "", phone: "", email: "", status: "lead", notes: "", tags: "", nextFollowUp: "" });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (c: any) => {
    setForm({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      status: c.status || "lead",
      notes: c.notes || "",
      tags: c.tags || "",
      nextFollowUp: c.nextFollowUp ? c.nextFollowUp.slice(0, 16) : "",
    });
    setEditing(c);
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return toast.error("Nome é obrigatório");
    try {
      const payload = { ...form };
      if (editing) {
        await api.put(`/crm/${editing.id}`, payload);
        toast.success("Cliente atualizado!");
      } else {
        await api.post("/crm", payload);
        toast.success("Cliente criado!");
      }
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remover este cliente?")) return;
    try {
      await api.delete(`/crm/${id}`);
      toast.success("Cliente removido");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const statusCount = (value: string) => {
    const item = stats.byStatus?.find((s: any) => s.status === value);
    return item ? item.count : 0;
  };

  const exportCSV = async () => {
    try {
      const res = await api.get("/crm/export/csv", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "clientes.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao exportar");
    }
  };

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/crm/import/csv", formData);
      toast.success(`Importado: ${res.data.created} criados, ${res.data.updated} atualizados, ${res.data.errors} erros`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao importar");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map(c => c.id));
    }
  };

  const sendBulk = async () => {
    if (!bulkTemplate) return toast.error("Template da mensagem é obrigatório");
    if (selectedIds.length === 0) return toast.error("Selecione pelo menos um cliente");
    setSending(true);
    try {
      await api.post("/crm/bulk-send", {
        customerIds: selectedIds,
        template: bulkTemplate,
        minDelay: bulkMinDelay,
        maxDelay: bulkMaxDelay,
      });
      toast.success(`Envio iniciado para ${selectedIds.length} cliente(s) com delay aleatório entre ${bulkMinDelay}s e ${bulkMaxDelay}s`);
      setShowBulk(false);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">CRM</h1>
            <p className="text-muted-foreground">Gestão de clientes e leads</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Importar
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
            <Button variant="outline" onClick={() => { setShowBulk(true); setSelectedIds([]); }}>
              <Send className="w-4 h-4 mr-2" /> Disparo em Massa
            </Button>
            <Button onClick={() => { resetForm(); setShowForm(true) }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Cliente
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Leads</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-blue-600">{statusCount("lead")}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Negociação</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-yellow-600">{statusCount("negotiation")}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Fechados</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{statusCount("won")}</p></CardContent>
          </Card>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, telefone ou email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            {statusList.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={save} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium block mb-1">Nome *</label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Telefone</label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Email</label>
                    <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Status</label>
                    <select className="border rounded-md px-3 py-2 w-full text-sm bg-background" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {statusList.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Tags (separadas por vírgula)</label>
                    <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="ex: vip, hot, promoção" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Próximo Contato</label>
                    <Input type="datetime-local" value={form.nextFollowUp} onChange={e => setForm({ ...form, nextFollowUp: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Observações</label>
                    <textarea className="border rounded-md px-3 py-2 w-full text-sm bg-background min-h-[80px]" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit">{editing ? "Atualizar" : "Criar"}</Button>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {showBulk && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Disparo em Massa</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowBulk(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {selectedIds.length > 0
                  ? `${selectedIds.length} cliente(s) selecionado(s) para envio`
                  : "Selecione os clientes na lista abaixo usando os checkboxes"}
              </p>
              <div>
                <label className="text-sm font-medium block mb-1">Template da Mensagem</label>
                <textarea
                  className="border rounded-md px-3 py-2 w-full text-sm bg-background min-h-[100px]"
                  value={bulkTemplate}
                  onChange={e => setBulkTemplate(e.target.value)}
                  placeholder="Olá {nome}, tudo bem? Passando pra fazer uma proposta..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Delay mínimo (segundos)</label>
                  <Input type="number" min="5" value={bulkMinDelay} onChange={e => setBulkMinDelay(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Delay máximo (segundos)</label>
                  <Input type="number" min="5" value={bulkMaxDelay} onChange={e => setBulkMaxDelay(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={sendBulk} disabled={sending}>
                  {sending ? "Enviando..." : <><Send className="w-4 h-4 mr-2" /> Enviar para {selectedIds.length} cliente(s)</>}
                </Button>
                <Button variant="outline" onClick={() => setShowBulk(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 mb-2">
          <input type="checkbox" onChange={selectAll} checked={selectedIds.length === customers.length && customers.length > 0} className="rounded" />
          <span className="text-sm text-muted-foreground">Selecionar todos</span>
          {selectedIds.length > 0 && (
            <span className="text-sm font-medium text-primary">{selectedIds.length} selecionado(s)</span>
          )}
        </div>

        <div className="space-y-3">
          {customers.map(c => {
            const st = statusMap[c.status] || statusMap.lead;
            return (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1">
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{c.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                        {c.tags && c.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                          <span key={t} className="text-xs bg-secondary px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    {c.nextFollowUp && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.nextFollowUp).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-red-500">Remover</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {customers.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cliente encontrado</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
