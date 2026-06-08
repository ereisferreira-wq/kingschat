import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import toast from "react-hot-toast";
import { Plus, Smartphone, QrCode, Trash2, WifiOff } from "lucide-react";

export default function WhatsAppPage() {
  const [whatsapps, setWhatsapps] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [showQR, setShowQR] = useState<number | null>(null);

  const load = () => {
    api.get("/whatsapp").then((r) => setWhatsapps(r.data.whatsapps));
  };

  useEffect(() => { load() }, []);

  const create = async () => {
    if (!name) return toast.error("Digite um nome");
    try {
      await api.post("/whatsapp", { name });
      toast.success("Conexão criada!");
      setName("");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const connect = async (id: number) => {
    try {
      await api.post(`/whatsapp/${id}/connect`);
      toast.success("Conectando...");
      setShowQR(id);
      setTimeout(load, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const disconnect = async (id: number) => {
    try {
      await api.post(`/whatsapp/${id}/disconnect`);
      toast.success("Desconectado");
      setShowQR(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remover esta conexão?")) return;
    try {
      await api.delete(`/whatsapp/${id}`);
      toast.success("Removido");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">WhatsApp</h1>
            <p className="text-muted-foreground">Gerencie suas conexões</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nova Conexão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Nome da conexão (ex: Vendas)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button onClick={create}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {whatsapps.map((w) => (
            <Card key={w.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${w.status === "CONNECTED" ? "bg-green-50" : "bg-gray-50"}`}>
                    {w.status === "CONNECTED" ? (
                      <Smartphone className="w-6 h-6 text-green-600" />
                    ) : (
                      <Smartphone className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-sm text-muted-foreground">{w.number || "---"}</p>
                    <Badge
                      variant={
                        w.status === "CONNECTED"
                          ? "success"
                          : w.status === "QRCODE"
                          ? "warning"
                          : "secondary"
                      }
                      className="mt-1"
                    >
                      {w.status === "CONNECTED" ? "Conectado" : w.status === "QRCODE" ? "Aguardando QR" : "Desconectado"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {w.status !== "CONNECTED" && (
                    <Button size="sm" onClick={() => connect(w.id)}>
                      <QrCode className="w-4 h-4 mr-1" /> Conectar
                    </Button>
                  )}
                  {w.status === "CONNECTED" && (
                    <Button size="sm" variant="outline" onClick={() => disconnect(w.id)}>
                      <WifiOff className="w-4 h-4 mr-1" /> Desconectar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(w.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {whatsapps.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma conexão ainda. Adicione uma acima.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
