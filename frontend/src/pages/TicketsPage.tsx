import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import { MessageSquare, User, Bot } from "lucide-react";
import { useSocket } from "../hooks/useSocket";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);

  const loadTickets = useCallback(() => {
    api.get("/tickets?limit=50").then((r) => setTickets(r.data.tickets));
  }, []);

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
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900 transition"
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
