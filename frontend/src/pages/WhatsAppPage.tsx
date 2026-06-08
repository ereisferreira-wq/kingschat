import { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import toast from "react-hot-toast";
import { Plus, Smartphone, QrCode, Trash2, WifiOff, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSocket } from "../hooks/useSocket";

export default function WhatsAppPage() {
  const [whatsapps, setWhatsapps] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [showQR, setShowQR] = useState<number | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const showQRRef = useRef<number | null>(null);

  const load = () => {
    api.get("/whatsapp").then((r) => setWhatsapps(r.data.whatsapps));
  };

  useEffect(() => { load() }, []);

  useEffect(() => { showQRRef.current = showQR; }, [showQR]);

  useSocket("whatsappSession", (data: any) => {
    if (data?.action === "update" && data?.session) {
      setWhatsapps((prev) => {
        const idx = prev.findIndex((w) => w.id === data.session.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...data.session };
          return updated;
        }
        return prev;
      });

      if (data.session.qrcode && showQRRef.current === data.session.id) {
        setQrData(data.session.qrcode);
      }

      if (data.session.status === "CONNECTED" && showQRRef.current === data.session.id) {
        setShowQR(null);
        setQrData(null);
      }
    }
  });

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
      setQrData(null);
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
            <Card key={w.id} className="relative">
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

              {showQR === w.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-xl text-center">
                    {qrData ? (
                      <>
                        <QRCodeSVG value={qrData} size={256} />
                        <p className="text-sm text-muted-foreground mt-3">
                          Escaneie com o WhatsApp
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Gerando QR Code...
                        </p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => { setShowQR(null); setQrData(null); disconnect(w.id); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
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
