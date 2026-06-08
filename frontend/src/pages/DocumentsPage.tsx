import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import api from "../lib/api";
import toast from "react-hot-toast";
import { FileText, Upload, Trash2 } from "lucide-react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    api.get("/documents").then((r) => setDocuments(r.data.documents));
  };

  useEffect(() => { load() }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      return toast.error("Apenas PDFs são permitidos");
    }
    if (file.size > 20 * 1024 * 1024) {
      return toast.error("PDF muito grande (máx 20MB)");
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Documento enviado! IA está processando...");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao enviar");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remover este documento?")) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Documento removido");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">
            Envie PDFs para treinar a IA do seu chatbot
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload de PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition">
              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">
                {uploading ? "Enviando..." : "Clique para selecionar um PDF"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Máx 20MB, apenas PDF
              </p>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-medium">{doc.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={doc.status === "ready" ? "success" : doc.status === "error" ? "destructive" : "warning"}>
                    {doc.status === "ready" ? "Pronto" : doc.status === "processing" ? "Processando" : "Erro"}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => remove(doc.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {documents.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum documento enviado ainda</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
