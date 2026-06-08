import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

interface AdminResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number | null;
  userName: string | null;
  onSuccess?: () => void;
}

export function AdminResetPasswordModal({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: AdminResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!newPassword || !confirmPassword) {
        toast.error("Todos os campos são obrigatórios");
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }

      if (newPassword.length < 6) {
        toast.error("Senha deve ter pelo menos 6 caracteres");
        return;
      }

      await api.post("/admin/reset-password", {
        userId,
        newPassword,
      });

      toast.success(`Senha de ${userName} resetada com sucesso`);
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao resetar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar Senha - {userName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Nova Senha</label>
            <Input
              type="password"
              placeholder="Digite a nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Confirmar Senha</label>
            <Input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Resetando..." : "Resetar Senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
