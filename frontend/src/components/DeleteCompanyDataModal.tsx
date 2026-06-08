import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { AlertTriangle } from "lucide-react";

interface DeleteCompanyDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteCompanyDataModal({ open, onOpenChange, onSuccess }: DeleteCompanyDataModalProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (confirmationText !== "DELETAR PERMANENTEMENTE") {
        toast.error("Texto de confirmação incorreto");
        return;
      }

      await api.post("/company/delete-data", {
        confirmationText,
      });

      toast.success("Dados deletados com sucesso. Você será desconectado.");
      
      // Aguardar um momento antes de redirecionar
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao deletar dados");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Deletar Dados Permanentemente
          </DialogTitle>
          <DialogDescription className="text-base">
            Esta ação é irreversível e irá deletar todos os dados da sua empresa incluindo:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 text-sm text-muted-foreground bg-red-50 p-4 rounded-lg">
          <div>✓ Usuários e contas</div>
          <div>✓ Conversas e mensagens</div>
          <div>✓ Contatos e clientes</div>
          <div>✓ Documentos e PDFs</div>
          <div>✓ Tickets e logs</div>
          <div>✓ Configurações do chatbot</div>
          <div>✓ Dados de agendamentos</div>
        </div>

        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-red-600 block mb-2">
              Para confirmar, digite exatamente:
            </label>
            <div className="bg-gray-100 p-3 rounded border border-gray-300 font-mono text-sm mb-2">
              DELETAR PERMANENTEMENTE
            </div>
            <Input
              type="text"
              placeholder="Digite o texto acima"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
              disabled={loading}
              className="border-red-300 focus:border-red-500"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || confirmationText !== "DELETAR PERMANENTEMENTE"}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Deletando..." : "Deletar Tudo"}
            </Button>
          </DialogFooter>
        </form>

        <p className="text-xs text-gray-500 text-center">
          ⚠️ Esta ação não pode ser desfeita. Certifique-se de fazer backup dos dados importantes primeiro.
        </p>
      </DialogContent>
    </Dialog>
  );
}
