import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { AdminResetPasswordModal } from "@/components/AdminResetPasswordModal";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { RotateCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      setUsers(response.data.users || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setResetPasswordOpen(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">Gerencie usuários e altere senhas conforme necessário</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Usuários da Empresa</span>
              <Button size="sm" variant="outline" onClick={loadUsers} disabled={loading}>
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
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-semibold">Nome</th>
                      <th className="text-left py-2 px-2 font-semibold">Email</th>
                      <th className="text-left py-2 px-2 font-semibold">Função</th>
                      <th className="text-left py-2 px-2 font-semibold">Status</th>
                      <th className="text-left py-2 px-2 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">{user.name}</td>
                        <td className="py-3 px-2 text-muted-foreground">{user.email}</td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                            className={
                              user.role === "admin"
                                ? "bg-amber-500 text-amber-950"
                                : "bg-gray-200 text-gray-900"
                            }
                          >
                            {user.role === "admin" ? "Administrador" : "Usuário"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                            className={user.isActive ? "bg-green-500" : "bg-gray-400"}
                          >
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPassword(user)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            Resetar Senha
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminResetPasswordModal
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        userId={selectedUser?.id || null}
        userName={selectedUser?.name || null}
        onSuccess={loadUsers}
      />
    </Layout>
  );
}
