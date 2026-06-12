import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import { MessageSquare, User, Bot, UserCheck } from "lucide-react";
import { useSocket } from "../hooks/useSocket";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  const loadTickets = useCallback(() => {
    const url = statusFilter ? `/tickets?limit=50&status=${statusFilter}` : "/tickets?limit=50";
    api.get(url).then((r) => setTickets(r.data.tickets));
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useSocket("ticket:new", loadTickets);
  useSocket("ticket:updated", loadTickets);
  useSocket("message:new", loadTickets);

  const statusColors: Record<string, "warning" | "success" | "secondary" | "default"> = {
    pending: "warning",
    open: "success",
    closed: "secondary",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">Atendimentos dos seus clientes</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversas ({tickets.length})</CardTitle>
            <div className="flex gap-2 mt-2">
              {["", "pending", "open", "closed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:border-primary"
                  }`}
                >
                  {s === "" ? "Todas" : s === "pending" ? "Pendentes" : s === "open" ? "Abertas" : "Fechadas"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                Nenhum ticket ainda
              </p>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {ticket.isBot ? (
                          <Bot className="w-5 h-5 text-primary" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {ticket.contact?.name || ticket.contact?.number || "Desconhecido"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {ticket.lastMessage || "..."}
                        </p>
                        {ticket.user?.name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <UserCheck className="w-3 h-3" />
                            {ticket.user.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusColors[ticket.status] || "default"}>
                        {ticket.status === "pending"
                          ? "Pendente"
                          : ticket.status === "open"
                          ? "Aberto"
                          : "Fechado"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.updatedAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
