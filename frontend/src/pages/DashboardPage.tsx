import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import api from "../lib/api";
import toast from "react-hot-toast";
import { Smartphone, MessageSquare, FileText, TrendingUp, ArrowUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({});
  const [usage, setUsage] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/whatsapp").then((r) => r.data.whatsapps),
      api.get("/tickets?limit=5").then((r) => r.data),
      api.get("/documents").then((r) => r.data.documents),
      api.get("/plan-usage").then((r) => setUsage(r.data)).catch(() => {}),
    ])
      .then(([whatsapps, tickets, documents]) => {
        setStats({
          whatsapps: whatsapps.length,
          connected: whatsapps.filter((w: any) => w.status === "CONNECTED").length,
          tickets: tickets.total || 0,
          documents: documents.length,
        });
      })
      .catch(() => toast.error("Erro ao carregar dados do dashboard"));
  }, []);

  const nearLimit = (current: number, max: number) => max > 0 && current >= max;
  const anyNearLimit = usage && Object.values(usage.limits).some((v: any) => nearLimit(v.current, v.max));

  const usageBars = usage ? [
    { label: "Contatos", current: usage.limits.contacts.current, max: usage.limits.contacts.max },
    { label: "WhatsApp", current: usage.limits.whatsapps.current, max: usage.limits.whatsapps.max },
    { label: "Documentos", current: usage.limits.documents.current, max: usage.limits.documents.max },
  ] : [];

  const cards = [
    {
      title: "WhatsApp",
      value: `${stats.connected || 0}/${stats.whatsapps || 0}`,
      sub: `${stats.whatsapps || 0} conexões`,
      icon: Smartphone,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Tickets",
      value: stats.tickets || 0,
      sub: "conversas ativas",
      icon: MessageSquare,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Documentos",
      value: stats.documents || 0,
      sub: "PDFs para IA",
      icon: FileText,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Status do Bot",
      value: stats.connected > 0 ? "Ativo" : "Inativo",
      sub: "IA respondendo",
      icon: TrendingUp,
      color: stats.connected > 0 ? "text-green-600" : "text-gray-400",
      bg: stats.connected > 0 ? "bg-green-50 dark:bg-green-950" : "bg-gray-50 dark:bg-gray-800",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu sistema</p>
        </div>

        {anyNearLimit && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Você atingiu o limite de algum recurso</p>
                  <p className="text-sm text-red-600">Faça um upgrade para continuar usando sem restrições</p>
                </div>
              </div>
              <Button onClick={() => navigate("/subscription")} className="bg-red-500 hover:bg-red-600 text-white">
                <ArrowUp className="w-4 h-4 mr-2" /> Fazer Upgrade
              </Button>
            </CardContent>
          </Card>
        )}

        {usageBars.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Consumo do Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {usageBars.map(({ label, current, max }) => {
                  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
                  const exceeded = current >= max;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{label}</span>
                        <span className={exceeded ? "text-red-500 font-bold" : ""}>{current}/{max}</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${exceeded ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Próximos passos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Badge variant={stats.whatsapps > 0 ? "success" : "warning"}>
                  {stats.whatsapps > 0 ? "OK" : "1"}
                </Badge>
                <span>Conecte seu WhatsApp</span>
              </li>
              <li className="flex items-center gap-3">
                <Badge variant={stats.documents > 0 ? "success" : "warning"}>
                  {stats.documents > 0 ? "OK" : "2"}
                </Badge>
                <span>Envie PDFs para treinar a IA</span>
              </li>
              <li className="flex items-center gap-3">
                <Badge variant={stats.connected > 0 && stats.documents > 0 ? "success" : "warning"}>
                  {stats.connected > 0 && stats.documents > 0 ? "OK" : "3"}
                </Badge>
                <span>Configure o chatbot no menu "Chatbot IA"</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
