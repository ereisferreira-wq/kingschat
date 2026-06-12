import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useSocket } from "../hooks/useSocket";
import { ArrowLeft, Send, Bot, User, Phone, MapPin, Car, Loader2, Save } from "lucide-react";

export default function TicketChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contactCity, setContactCity] = useState("");
  const [contactPlate, setContactPlate] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/tickets/${id}`).then((r) => {
      setTicket(r.data.ticket);
      setMessages(r.data.ticket.messages || []);
      const contact = r.data.ticket.contact;
      if (contact) {
        setContactCity(contact.city || "");
        setContactPlate(contact.licensePlate || "");
      }
    }).catch(() => {
      navigate("/tickets");
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  useSocket("message:new", (data: any) => {
    if (data.ticketId !== Number(id)) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === data.message.id)) return prev;
      return [...prev, data.message];
    });
    setTicket((prev: any) => {
      if (!prev) return prev;
      return { ...prev, lastMessage: data.message.body };
    });
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
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleSaveContact = async () => {
    if (!ticket?.contact?.id) return;
    setSavingContact(true);
    try {
      await api.put(`/contacts/${ticket.contact.id}`, { city: contactCity, licensePlate: contactPlate });
      toast.success("Dados do contato salvos");
    } catch {
      toast.error("Erro ao salvar dados");
    } finally {
      setSavingContact(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusColors: Record<string, "warning" | "success" | "secondary" | "default"> = {
    pending: "warning",
    open: "success",
    closed: "secondary",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    open: "Aberto",
    closed: "Fechado",
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

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            {ticket.isBot ? (
              <Bot className="w-5 h-5 text-primary" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {ticket.contact?.name || ticket.contact?.number || "Desconhecido"}
            </p>
            {ticket.contact?.number && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {ticket.contact.number}
              </p>
            )}
          </div>
          <Badge variant={statusColors[ticket.status] || "default"}>
            {statusLabels[ticket.status] || ticket.status}
          </Badge>
          {ticket.isBot && (
            <Badge variant="default">
              <Bot className="w-3 h-3 mr-1" />
              IA
            </Badge>
          )}
        </div>

        {/* Customer Data */}
        {ticket.contact && (
          <div className="flex items-center gap-2 py-2 px-3 border-b bg-muted/30">
            <div className="flex items-center gap-1 flex-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs px-1 py-0.5 placeholder:text-muted-foreground"
                placeholder="Cidade"
                value={contactCity}
                onChange={(e) => setContactCity(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 flex-1">
              <Car className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs px-1 py-0.5 placeholder:text-muted-foreground uppercase"
                placeholder="Placa"
                value={contactPlate}
                onChange={(e) => setContactPlate(e.target.value.toUpperCase())}
              />
            </div>
            <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={handleSaveContact} disabled={savingContact}>
              <Save className="w-3 h-3" />
            </Button>
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
                <div
                  key={msg.id}
                  className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isFromMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isFromMe ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
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
      </div>
    </Layout>
  );
}
