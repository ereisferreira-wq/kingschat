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
  const [step, setStep] = useState(1);
  const [confirmationText, setConfirmationText] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep(1);
    setConfirmationText("");
    setLoading(false);
  };

  const handleFirstConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationText !== "DELETAR PERMANENTEMENTE") {
      toast.error("Texto de confirmação incorreto");
      return;
    }
    setStep(2);
  };

  const handleFinalDelete = async () => {
    setLoading(true);
    try {
      await api.post("/company/delete-data", {
        confirmationText,
      });
      toast.success("Dados deletados com sucesso. Você será desconectado.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao deletar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            {step === 1 ? "Deletar Dados Permanentemente" : "Confirmação Final"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {step === 1
              ? "Esta ação é irreversível e irá deletar todos os dados da sua empresa incluindo:"
              : "Tem certeza absoluta? Esta é sua última chance de cancelar."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <>
            <div className="space-y-2 text-sm text-muted-foreground bg-red-50 p-4 rounded-lg">
              <div>✓ Usuários e contas</div>
              <div>✓ Conversas e mensagens</div>
              <div>✓ Contatos e clientes</div>
              <div>✓ Documentos e PDFs</div>
              <div>✓ Tickets e logs</div>
              <div>✓ Configurações do chatbot</div>
              <div>✓ Dados de agendamentos</div>
            </div>

            <form onSubmit={handleFirstConfirm} className="space-y-4">
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
                  className="border-red-300 focus:border-red-500"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={confirmationText !== "DELETAR PERMANENTEMENTE"}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Continuar
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="space-y-6 py-4">
            <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 text-center">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-2" />
              <p className="text-red-700 font-bold text-lg">VOCÊ TEM CERTEZA?</p>
              <p className="text-red-600 text-sm mt-1">Todos os dados serão perdidos permanentemente.</p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                Voltar
              </Button>
              <Button
                onClick={handleFinalDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {loading ? "Deletando..." : "Sim, deletar tudo"}
              </Button>
            </DialogFooter>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          ⚠️ Esta ação não pode ser desfeita. Certifique-se de fazer backup dos dados importantes primeiro.
        </p>
      </DialogContent>
    </Dialog>
  );
}
