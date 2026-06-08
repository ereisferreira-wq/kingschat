import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { RotateCw, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface Company {
  id: number;
  name: string;
  email: string;
  status: boolean;
  plan?: string;
  createdAt: string;
}

export default function AdminDataCleanupPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/companies");
      setCompanies(response.data.companies || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (company: Company) => {
    setSelectedCompany(company);
    setConfirmationText("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (confirmationText !== "DELETAR PERMANENTEMENTE") {
      toast.error("Texto de confirmação incorreto");
      return;
    }

    if (!selectedCompany) return;

    setDeleting(true);
    try {
      // Usar um endpoint de admin para deletar dados de empresa específica
      // Por enquanto, iremos suportar apenas através do painel do próprio usuário
      toast.error("Por favor, peça ao admin da empresa para deletar seus dados");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao deletar dados");
    } finally {
      setDeleting(false);
    }
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Limpeza de Dados</h1>
          <p className="text-muted-foreground">
            Monitore e gerencie dados de empresas inativas na VPS
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Empresas no Sistema</span>
              <Button size="sm" variant="outline" onClick={loadCompanies} disabled={loading}>
                <RotateCw className="w-4 h-4 mr-2" /> Atualizar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Procurar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando empresas...</p>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma empresa encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold">Nome</th>
                      <th className="text-left py-2 px-2 font-semibold">Email</th>
                      <th className="text-left py-2 px-2 font-semibold">Plano</th>
                      <th className="text-left py-2 px-2 font-semibold">Status</th>
                      <th className="text-left py-2 px-2 font-semibold">Criada em</th>
                      <th className="text-left py-2 px-2 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => (
                      <tr key={company.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{company.name}</td>
                        <td className="py-3 px-2 text-muted-foreground">{company.email}</td>
                        <td className="py-3 px-2">{company.plan || "N/A"}</td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={company.status ? "default" : "secondary"}
                            className={company.status ? "bg-green-500" : "bg-gray-400"}
                          >
                            {company.status ? "Ativa" : "Bloqueada"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(company.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3 px-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(company)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Deletar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
              <strong>Nota:</strong> Os admins de cada empresa podem deletar seus próprios dados através
              das Configurações → Zona de Perigo. Esses dados desaparecem permanentemente do sistema.
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Deletar Dados da Empresa</DialogTitle>
            <DialogDescription>
              Peça para o admin da empresa deletar os dados através das configurações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded text-sm">
              <strong>Empresa:</strong> {selectedCompany?.name}
              <br />
              <strong>Email:</strong> {selectedCompany?.email}
            </div>
            <p className="text-sm text-muted-foreground">
              O admin da empresa {selectedCompany?.name} deve acessar suas Configurações e clicar em
              "Deletar Dados Permanentemente" na seção Zona de Perigo para remover todos os dados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
