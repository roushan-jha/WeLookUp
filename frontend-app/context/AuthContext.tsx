"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";
import api, { setAuthToken } from "@/lib/api";

type AuthContextType = {
  token: string | null;
  isAuthenticated: boolean;
  user?: { id?: string; name?: string; domain?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api/v1";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<{
    id?: string;
    name?: string;
    domain?: string;
  } | null>(null);
  const router = useRouter();
  const toast = useToast();

  const login = async (email: string, password: string) => {
    const res = await api.post(`/auth/login`, { email, password });
    const t = res.data?.token;
    const u = res.data?.user;
    if (t) {
      try {
        localStorage.setItem("token", t);
      } catch {}
      setToken(t);
      setAuthToken(t);
    } else {
      throw new Error("No token returned from login");
    }
    if (u) setUser(u);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post(`/auth/register`, { name, email, password });
    const t = res.data?.token;
    const u = res.data?.user;
    if (t) {
      try {
        localStorage.setItem("token", t);
      } catch {}
      setToken(t);
      setAuthToken(t);
    }
    if (u) setUser(u);
  };

  const logout = async () => {
    try {
      const url = `${API_BASE}/auth/logout`;
      console.log(
        "[AuthContext] logout: calling backend",
        url,
        "token present?",
        !!token,
      );
      await api.post(`/auth/logout`);
      console.log("[AuthContext] logout: backend responded");
    } catch (err: unknown) {
      const msg = (err as Error)?.message || String(err);
      console.warn("[AuthContext] logout: backend call failed", msg);
      // continue to clear client state even if backend fails
    }
    try {
      localStorage.removeItem("token");
    } catch (e: unknown) {
      console.warn(
        "[AuthContext] logout: failed to remove token from localStorage",
        String(e),
      );
    }
    setToken(null);
    setUser(null);
    setAuthToken(null);
    if (toast && typeof toast.success === "function") {
      try {
        toast.success("Logged out successfully");
      } catch {}
    }
    // use replace to avoid keeping the protected page in history
    try {
      router.replace("/login");
    } catch {
      // fallback to push
      router.push("/login");
    }
  };

  const value: AuthContextType = {
    token,
    isAuthenticated: !!token,
    user,
    login,
    register,
    logout,
  };

  // On mount, set auth header and fetch current user if token exists
  useEffect(() => {
    if (token) {
      setAuthToken(token);
      // Attempt to fetch /auth/me
      api
        .get(`/auth/me`)
        .then((res) => {
          if (res.data?.user) setUser(res.data.user);
        })
        .catch((err) => {
          console.warn(
            "[AuthContext] failed to fetch current user",
            err?.message || err,
          );
        });
    } else {
      setAuthToken(null);
    }
  }, [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
