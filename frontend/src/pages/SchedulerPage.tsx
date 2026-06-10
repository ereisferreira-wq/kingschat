import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import toast from "react-hot-toast";
import {
  Plus, Clock, Calendar, Repeat, MessageSquare,
  Play, Square, Trash2, Eye, X, History, ChevronLeft, ChevronRight,
  CalendarDays, List,
} from "lucide-react";

function useCalendar(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }
  return { year, month, weeks, monthName: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
}

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function SchedulerPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", triggerType: "after_hours", triggerValue: 1,
    triggerTime: "", messageTemplate: "", repeat: false,
    repeatInterval: 1, repeatIntervalType: "days",
    approach: "", targetType: "all", targetStatus: "lead", targetTags: "",
  });

  const load = () => {
    api.get("/scheduler").then(r => setTasks(r.data.tasks));
  };

  useEffect(() => { load() }, []);

  const cal = useCalendar(calDate);

  const loadLogs = async (taskId?: number) => {
    const params = taskId ? `?taskId=${taskId}` : "";
    const r = await api.get(`/scheduler/logs${params}`);
    setLogs(r.data.logs);
    setShowLogs(true);
  };

  const resetForm = () => {
    setForm({
      name: "", description: "", triggerType: "after_hours", triggerValue: 1,
      triggerTime: "", messageTemplate: "", repeat: false,
      repeatInterval: 1, repeatIntervalType: "days",
      approach: "", targetType: "all", targetStatus: "lead", targetTags: "",
    });
    setEditing(null);
    setShowForm(false);
    setSelectedDate(null);
  };

  const openEdit = (t: any) => {
    setForm({
      name: t.name, description: t.description || "",
      triggerType: t.triggerType, triggerValue: t.triggerValue,
      triggerTime: t.triggerTime || "",
      messageTemplate: t.messageTemplate, repeat: t.repeat,
      repeatInterval: t.repeatInterval || 1,
      repeatIntervalType: t.repeatIntervalType || "days",
      approach: t.approach || "", targetType: t.targetType,
      targetStatus: t.targetStatus || "lead", targetTags: t.targetTags || "",
    });
    setEditing(t);
    setShowForm(true);
  };

  const openDateForm = (day: number) => {
    const dateStr = `${cal.year}-${String(cal.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    resetForm();
    setForm(f => ({ ...f, triggerType: "fixed_time", triggerTime: dateStr + "T08:00" }));
    setSelectedDate(dateStr);
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.messageTemplate) {
      return toast.error("Nome e template são obrigatórios");
    }
    try {
      if (editing) {
        await api.put(`/scheduler/${editing.id}`, form);
        toast.success("Tarefa atualizada!");
      } else {
        await api.post("/scheduler", form);
        toast.success("Tarefa criada!");
      }
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar");
    }
  };

  const toggle = async (id: number) => {
    try {
      await api.patch(`/scheduler/${id}/toggle`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remover esta tarefa?")) return;
    try {
      await api.delete(`/scheduler/${id}`);
      toast.success("Tarefa removida");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const triggerLabel = (t: any) => {
    if (t.triggerType === "after_hours") return `Após ${t.triggerValue}h`;
    if (t.triggerType === "after_days") return `Após ${t.triggerValue} dias`;
    if (t.triggerType === "fixed_time" && t.triggerTime) {
      const d = new Date(t.triggerTime);
      return isNaN(d.getTime()) ? t.triggerTime : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    }
    return "-";
  };

  const targetLabel = (t: any) => {
    if (t.targetType === "all") return "Todos os clientes";
    if (t.targetType === "by_tags") return `Tags: ${t.targetTags}`;
    const st: any = { lead: "Leads", qualified: "Qualificados", proposal: "Proposta", negotiation: "Negociação", won: "Fechados", lost: "Perdidos", inactive: "Inativos" };
    return st[t.targetStatus] || t.targetStatus;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agendador</h1>
            <p className="text-muted-foreground">Disparo programado de mensagens</p>
          </div>
          <div className="flex gap-2">
            <div className="flex border rounded-md overflow-hidden">
              <button onClick={() => setView("list")} className={`px-3 py-2 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setView("calendar")} className={`px-3 py-2 text-sm ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"}`}>
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
            <Button variant="outline" onClick={() => loadLogs()}>
              <History className="w-4 h-4 mr-2" /> Logs
            </Button>
            <Button onClick={() => { resetForm(); setShowForm(true) }}>
              <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
            </Button>
          </div>
        </div>

        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editing ? "Editar Tarefa" : "Nova Tarefa"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={save} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Nome *</label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Descrição</label>
                    <textarea className="border rounded-md px-3 py-2 w-full text-sm bg-background min-h-[60px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Tipo de Disparo</label>
                    <select className="border rounded-md px-3 py-2 w-full text-sm bg-background" value={form.triggerType} onChange={e => setForm({ ...form, triggerType: e.target.value })}>
                      <option value="after_hours">Após X horas</option>
                      <option value="after_days">Após X dias</option>
                      <option value="fixed_time">Data/hora fixa</option>
                    </select>
                  </div>
                  {form.triggerType !== "fixed_time" ? (
                    <div>
                      <label className="text-sm font-medium block mb-1">Valor</label>
                      <Input type="number" min="1" value={form.triggerValue} onChange={e => setForm({ ...form, triggerValue: Number(e.target.value) })} />
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium block mb-1">Data e Hora</label>
                      <Input type="datetime-local" value={form.triggerTime} onChange={e => setForm({ ...form, triggerTime: e.target.value })} />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Template da Mensagem *</label>
                    <textarea className="border rounded-md px-3 py-2 w-full text-sm bg-background min-h-[100px]" value={form.messageTemplate} onChange={e => setForm({ ...form, messageTemplate: e.target.value })} placeholder="Olá {nome}, tudo bem?..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Alvo</label>
                    <select className="border rounded-md px-3 py-2 w-full text-sm bg-background" value={form.targetType} onChange={e => setForm({ ...form, targetType: e.target.value })}>
                      <option value="all">Todos os clientes</option>
                      <option value="by_status">Por status</option>
                      <option value="by_tags">Por tags</option>
                    </select>
                  </div>
                  {form.targetType === "by_status" && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Status alvo</label>
                      <select className="border rounded-md px-3 py-2 w-full text-sm bg-background" value={form.targetStatus} onChange={e => setForm({ ...form, targetStatus: e.target.value })}>
                        <option value="lead">Lead</option>
                        <option value="qualified">Qualificado</option>
                        <option value="proposal">Proposta</option>
                        <option value="negotiation">Negociação</option>
                        <option value="won">Fechado</option>
                        <option value="lost">Perdido</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                  )}
                  {form.targetType === "by_tags" && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Tags alvo</label>
                      <Input value={form.targetTags} onChange={e => setForm({ ...form, targetTags: e.target.value })} placeholder="vip, lead, promoção" />
                      <p className="text-xs text-muted-foreground mt-1">Separe por vírgulas. Clientes que tiverem qualquer uma dessas tags serão alvo.</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="repeat" checked={form.repeat} onChange={e => setForm({ ...form, repeat: e.target.checked })} className="rounded" />
                    <label htmlFor="repeat" className="text-sm font-medium">Repetir</label>
                  </div>
                  {form.repeat && (
                    <>
                      <div>
                        <label className="text-sm font-medium block mb-1">Intervalo</label>
                        <Input type="number" min="1" value={form.repeatInterval} onChange={e => setForm({ ...form, repeatInterval: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1">Tipo</label>
                        <select className="border rounded-md px-3 py-2 w-full text-sm bg-background" value={form.repeatIntervalType} onChange={e => setForm({ ...form, repeatIntervalType: e.target.value })}>
                          <option value="hours">Horas</option>
                          <option value="days">Dias</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium block mb-1">Mudar Abordagem</label>
                    <textarea className="border rounded-md px-3 py-2 w-full text-sm bg-background min-h-[60px]" value={form.approach} onChange={e => setForm({ ...form, approach: e.target.value })} placeholder="Ex: Após 3 dias sem resposta, mudar tom para urgência..." />
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

        {showLogs && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Logs de Execução</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowLogs(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-secondary/30 rounded">
                    <span>{log.customer?.name || "---"}</span>
                    <Badge variant={log.status === "sent" ? "success" : "destructive"}>{log.status === "sent" ? "Enviado" : "Falha"}</Badge>
                    <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-muted-foreground text-center py-4">Nenhum log ainda</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {view === "calendar" ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{cal.monthName}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" onClick={() => setCalDate(new Date(cal.year, cal.month - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCalDate(new Date())}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCalDate(new Date(cal.year, cal.month + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                  <div key={d} className="bg-muted text-center text-xs font-semibold py-2 text-muted-foreground">{d}</div>
                ))}
                {cal.weeks.flat().map((day, i) => {
                  const dateStr = day ? `${cal.year}-${String(cal.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
                  const dayTasks = dateStr ? tasks.filter(t => t.triggerTime && t.triggerTime.startsWith(dateStr)) : [];
                  return (
                    <div
                      key={i}
                      onClick={() => day && openDateForm(day)}
                      className={`bg-card min-h-[80px] p-1 text-sm cursor-pointer hover:bg-secondary/50 transition-colors ${day ? "" : "bg-muted/30"} ${selectedDate === dateStr ? "ring-2 ring-primary" : ""}`}
                    >
                      {day && (
                        <>
                          <span className="text-xs font-medium">{day}</span>
                          <div className="space-y-0.5 mt-1">
                            {dayTasks.slice(0, 2).map(t => (
                              <div key={t.id} className="text-[10px] bg-primary/10 text-primary rounded px-1 truncate leading-tight">{t.name}</div>
                            ))}
                            {dayTasks.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayTasks.length - 2} mais</div>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-full ${t.isActive ? "bg-green-50" : "bg-gray-50"}`}>
                      {t.isActive ? <Play className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{t.name}</p>
                        <Badge variant={t.isActive ? "success" : "secondary"}>{t.isActive ? "Ativo" : "Pausado"}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {triggerLabel(t)}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {targetLabel(t)}</span>
                        {t.repeat && <span className="flex items-center gap-1"><Repeat className="w-3 h-3" /> A cada {t.repeatInterval} {t.repeatIntervalType === "hours" ? "h" : "d"}</span>}
                        {t.nextRun && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Próximo: {new Date(t.nextRun).toLocaleString("pt-BR")}</span>}
                      </div>
                      {t.approach && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Abordagem: {t.approach}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="ghost" onClick={() => loadLogs(t.id)} title="Ver logs">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggle(t.id)}>
                      {t.isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tasks.length === 0 && (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma tarefa agendada</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
