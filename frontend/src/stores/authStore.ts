import { create } from "zustand";
import api from "../lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  profileImage: string | null;
  company: {
    id: number;
    name: string;
    status: boolean;
    plan: string | null;
    dueDate: string;
    logo?: string;
  } | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const res = await api.post("/login", { email, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    set({ user: res.data.user, loading: false });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    set({ user: null });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ loading: false });
        return;
      }
      const res = await api.get("/me");
      set({ user: res.data.user, loading: false });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      set({ user: null, loading: false });
    }
  },
}));
