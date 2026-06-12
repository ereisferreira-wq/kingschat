import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useSocket } from "../hooks/useSocket";
import useAuthStore from "../stores/authStore";
import {
  ArrowLeft, Send, Bot, User, Phone, Loader2, Save, XCircle, UserCheck
} from "lucide-react";

export default function TicketChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extractionFields, setExtractionFields] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [savingFields, setSavingFields] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadTicket = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/tickets/${id}`).then((r) => {
      const t = r.data.ticket;
      setTicket(t);
      setMessages(t.messages || []);
      const cf = parseCustomFields(t.contact?.customFields);
      setCustomFieldValues(cf);
    }).catch(() => {
      navigate("/tickets");
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    loadTicket();
    api.get("/chatbot/config").then((r) => {
      const raw = r.data.config?.extractionFields || "nome, cidade, placa";
      setExtractionFields(raw.split(",").map((s: string) => s.trim()).filter(Boolean));
    }).catch(() => {});
  }, [loadTicket]);

  function parseCustomFields(json?: string): Record<string, string> {
    try { return JSON.parse(json || "{}"); } catch { return {}; }
  }

  useSocket("message:new", (data: any) => {
    if (data.ticketId !== Number(id)) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === data.message.id)) return prev;
      return [...prev, data.message];
    });
  });

  useSocket("ticket:updated", (data: any) => {
    if (data.ticketId === Number(id)) loadTicket();
  });

  useSocket("contact:updated", (data: any) => {
    if (data.contactId === ticket?.contact?.id) {
      setCustomFieldValues(data.customFields || {});
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${id}/messages`, { body: body.trim() });
      setMessages((prev) => [...prev, res.data.message]);
      setBody("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async () => {
    try {
      await api.patch(`/tickets/${id}/assign`);
      toast.success("Ticket assumido!");
      loadTicket();
    } catch { toast.error("Erro ao assumir ticket"); }
  };

  const handleClose = async () => {
    try {
      await api.patch(`/tickets/${id}/status`, { status: "closed" });
      toast.success("Ticket fechado");
      loadTicket();
    } catch { toast.error("Erro ao fechar ticket"); }
  };

  const handleSaveFields = async () => {
    if (!ticket?.contact?.id) return;
    setSavingFields(true);
    try {
      await api.put(`/contacts/${ticket.contact.id}`, { customFields: customFieldValues });
      toast.success("Dados salvos");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSavingFields(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusColors: Record<string, "warning" | "success" | "secondary" | "default"> = {
    pending: "warning", open: "success", closed: "secondary",
  };
  const statusLabels: Record<string, string> = {
    pending: "Pendente", open: "Aberto", closed: "Fechado",
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Ticket não encontrado</div>
      </Layout>
    );
  }

  const isAssignedToMe = ticket.user?.id === currentUser?.id;
  const isClosed = ticket.status === "closed";

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {ticket.isBot ? <Bot className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {ticket.contact?.name || ticket.contact?.number || "Desconhecido"}
            </p>
            {ticket.contact?.number && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> {ticket.contact.number}
              </p>
            )}
            {ticket.user?.name && (
              <p className="text-xs text-muted-foreground">
                <UserCheck className="w-3 h-3 inline mr-1" />
                {ticket.user.name}
              </p>
            )}
          </div>
          <Badge variant={statusColors[ticket.status] || "default"}>
            {statusLabels[ticket.status] || ticket.status}
          </Badge>
          {ticket.isBot && (
            <Badge variant="default"><Bot className="w-3 h-3 mr-1" />IA</Badge>
          )}
          {!isClosed && (
            <div className="flex gap-1 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={handleAssign} disabled={isAssignedToMe}>
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Assumir
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose}>
                <XCircle className="w-3.5 h-3.5 mr-1" /> Fechar
              </Button>
            </div>
          )}
        </div>

        {/* Dynamic Customer Fields */}
        {ticket.contact && extractionFields.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 px-3 border-b bg-muted/30">
            {extractionFields.map((field) => (
              <div key={field} className="flex flex-col">
                <label className="text-[10px] uppercase text-muted-foreground font-medium">{field}</label>
                <input
                  className="bg-transparent border-b border-dashed border-muted-foreground/30 outline-none text-xs px-1 py-0.5 focus:border-primary"
                  placeholder={field}
                  value={customFieldValues[field] || ""}
                  onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex items-end pb-0.5">
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={handleSaveFields} disabled={savingFields}>
                <Save className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Nenhuma mensagem ainda</p>
          ) : (
            messages.map((msg: any) => {
              const isFromMe = msg.fromMe;
              return (
                <div key={msg.id} className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isFromMe
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isFromMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!isClosed && (
          <div className="border-t pt-4">
            <div className="flex gap-2 items-end">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                rows={2}
                className="flex-1 min-h-[44px] max-h-32 rounded-lg border border-input bg-background px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleSend} disabled={!body.trim() || sending} size="icon" className="h-[44px] w-[44px] shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Enter para enviar · Shift+Enter para nova linha</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
