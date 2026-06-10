import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../stores/authStore";
import { Settings, Trash2, Bot, Sparkles } from "lucide-react";
import { DeleteCompanyDataModal } from "../components/DeleteCompanyDataModal";

export default function CompanySettingsPage() {
  const { user, loadUser } = useAuthStore();
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [businessArea, setBusinessArea] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user?.company) {
      setName(user.company.name || "");
      setBusinessArea((user.company as any).businessArea || "");
      setBusinessHours((user.company as any).businessHours || "");
      setProductsServices((user.company as any).productsServices || "");
    }
    api.get("/company").then((r) => {
      setName(r.data.company.name || "");
      setLogo(r.data.company.logo || "");
      setBusinessArea(r.data.company.businessArea || "");
      setBusinessHours(r.data.company.businessHours || "");
      setProductsServices(r.data.company.productsServices || "");
    }).catch(() => {});
  }, [user]);

  const save = async () => {
    try {
      await api.put("/company", { name, logo, businessArea, businessHours, productsServices });
      await loadUser();
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar");
    }
  };

  const generatePrompt = async () => {
    if (!name || !businessArea) {
      toast.error("Preencha o nome e o segmento da empresa primeiro");
      return;
    }
    setGenerating(true);
    try {
      await api.post("/chatbot/generate-prompt");
      toast.success("Prompt gerado automaticamente! Vá em Chatbot IA para ver.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao gerar prompt");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Personalize sua empresa</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Nome da Empresa</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Segmento / Ramo de Atuação</label>
              <Input
                value={businessArea}
                onChange={(e) => setBusinessArea(e.target.value)}
                placeholder="Ex: Padaria, Mecânica, Loja de Roupas, Salão de Beleza..."
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Horário de Funcionamento</label>
              <Input
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="Ex: seg a sex das 8h às 18h, sáb das 8h às 12h"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Produtos e Serviços</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={productsServices}
                onChange={(e) => setProductsServices(e.target.value)}
                placeholder="Liste os principais produtos e serviços que sua empresa oferece..."
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">URL do Logo</label>
              <Input
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
            {logo && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <img src={logo} alt="Preview" className="w-12 h-12 object-contain rounded" />
                <span className="text-sm text-muted-foreground">Preview do logo</span>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={save}>Salvar</Button>
              <Button
                variant="outline"
                onClick={generatePrompt}
                disabled={generating}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {generating ? "Gerando..." : "Gerar Prompt Automático"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-red-700 mb-2">Deletar Todos os Dados</h3>
              <p className="text-sm text-red-600 mb-4">
                Se você não vai mais usar nosso serviço, pode deletar permanentemente todos os seus dados.
              </p>
              <Button 
                onClick={() => setDeleteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Deletar Dados Permanentemente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteCompanyDataModal 
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
      />
    </Layout>
  );
}