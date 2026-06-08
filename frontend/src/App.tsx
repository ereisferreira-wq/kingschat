import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./stores/authStore";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import DocumentsPage from "./pages/DocumentsPage";
import ChatbotPage from "./pages/ChatbotPage";
import TicketsPage from "./pages/TicketsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import CrmPage from "./pages/CrmPage";
import SchedulerPage from "./pages/SchedulerPage";
import AdminPanel from "./pages/AdminPanel";
import UsersManagementPage from "./pages/UsersManagementPage";
import AdminDataCleanupPage from "./pages/AdminDataCleanupPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.company && !user.company.status) {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return null;
  if (user) {
    if (user.company && !user.company.status) {
      return <Navigate to="/pending" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />
        <Route
          path="/pending"
          element={<PendingPage />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/whatsapp"
          element={
            <ProtectedRoute>
              <WhatsAppPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chatbot"
          element={
            <ProtectedRoute>
              <ChatbotPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <TicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company-settings"
          element={
            <ProtectedRoute>
              <CompanySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm"
          element={
            <ProtectedRoute>
              <CrmPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheduler"
          element={
            <ProtectedRoute>
              <SchedulerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UsersManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cleanup"
          element={
            <ProtectedRoute>
              <AdminDataCleanupPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function PendingPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-yellow-100 dark:bg-yellow-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ClockIcon />
        </div>
        <h1 className="text-2xl font-bold mb-2">Aguardando Aprovação</h1>
        <p className="text-muted-foreground mb-6">
          Sua conta foi criada com sucesso! Estamos aguardando a liberação do administrador.
          Você receberá um email quando sua empresa for ativada.
        </p>
        {user && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 mb-6 text-left space-y-2">
            <p className="text-sm"><strong>Empresa:</strong> {user.company?.name}</p>
            <p className="text-sm"><strong>Email:</strong> {user.email}</p>
            <p className="text-sm"><strong>Status:</strong> <span className="text-yellow-600">Pendente</span></p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { logout(); }}
            className="text-sm text-muted-foreground hover:text-primary underline"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
