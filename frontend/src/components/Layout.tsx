import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { cn } from "../lib/utils";
import {
  Crown,
  MessageSquare,
  Smartphone,
  FileText,
  Bot,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  CreditCard,
  Settings,
  Users,
  Clock,
  Shield,
  Key,
} from "lucide-react";
import { Button } from "./ui/button";
import { ChangePasswordModal } from "./ChangePasswordModal";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Smartphone, label: "WhatsApp", path: "/whatsapp" },
  { icon: Users, label: "CRM", path: "/crm" },
  { icon: Clock, label: "Agendador", path: "/scheduler" },
  { icon: FileText, label: "Documentos", path: "/documents" },
  { icon: Bot, label: "Chatbot IA", path: "/chatbot" },
  { icon: MessageSquare, label: "Tickets", path: "/tickets" },
  { icon: CreditCard, label: "Assinatura", path: "/subscription" },
  { icon: Settings, label: "Configurações", path: "/company-settings" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const showAdmin = user?.role === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-amber-900/20 transform transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-amber-900/20">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" />
            <MessageSquare className="w-5 h-5 text-amber-400 -ml-1" />
            <h1 className="text-xl font-bold text-amber-400">Kings Chat</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-amber-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {showAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === "/admin"
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-amber-200/60 hover:text-amber-300 hover:bg-amber-500/5"
              )}
            >
              <Shield className="w-5 h-5" />
              Admin
            </Link>
          )}
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-amber-200/60 hover:text-amber-300 hover:bg-amber-500/5"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-amber-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 text-sm font-bold">{user?.name?.charAt(0) || "U"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-200 truncate">{user?.name}</p>
              <p className="text-xs text-amber-200/50 truncate">{user?.company?.name}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-amber-200/60 hover:text-amber-300 hover:bg-amber-500/5" 
              onClick={() => setChangePasswordOpen(true)}
            >
              <Key className="w-4 h-4 mr-2" /> Alterar Senha
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-amber-200/60 hover:text-amber-300 hover:bg-amber-500/5" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 h-16 bg-card border-b border-border flex items-center px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4 text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Plano: <strong>{user?.company?.plan || "Free"}</strong>
            </span>
          </div>
        </header>

        {user?.company?.dueDate && (() => {
          const due = new Date(user.company.dueDate);
          if (isNaN(due.getTime())) return null;
          const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 0) return null;
          if (daysLeft <= 5) {
            return (
              <div className={`mx-6 mt-4 px-4 py-2 rounded-lg text-sm font-medium ${daysLeft <= 2 ? "bg-red-50 text-red-700 border border-red-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                {daysLeft === 1 ? "Último dia de licença! Renove para não perder o acesso." :
                 `Sua licença vence em ${daysLeft} dia(s). Entre em contato com o administrador.`}
              </div>
            );
          }
          return null;
        })()}
        <main className="p-6">{children}</main>
      </div>
      
      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
