import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../stores/authStore";
import { Settings, Trash2 } from "lucide-react";
import { DeleteCompanyDataModal } from "../components/DeleteCompanyDataModal";

export default function CompanySettingsPage() {
  const { user, loadUser } = useAuthStore();
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (user?.company) {
      setName(user.company.name || "");
    }
    api.get("/company").then((r) => {
      setName(r.data.company.name || "");
      setLogo(r.data.company.logo || "");
    }).catch(() => {});
  }, [user]);

  const save = async () => {
    try {
      await api.put("/company", { name, logo });
      await loadUser();
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar");
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
              <label className="text-sm font-medium block mb-1">Nome do Cliente / Empresa</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">URL do Logo</label>
              <Input
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Insira a URL de uma imagem para o logo da empresa
              </p>
            </div>
            {logo && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <img src={logo} alt="Preview" className="w-12 h-12 object-contain rounded" />
                <span className="text-sm text-muted-foreground">Preview do logo</span>
              </div>
            )}
            <Button onClick={save}>Salvar</Button>
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
                Se você não vai mais usar nosso serviço, pode deletar permanentemente todos os seus dados da VPS.
                Isso irá liberar espaço e remover completamente sua empresa, usuários, mensagens, contatos e documentos.
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
