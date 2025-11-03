"use client";

import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

type AuthContextType = {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/api/v1";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  });
  const router = useRouter();

  const login = async (email: string, password: string) => {
    const url = `${API_BASE}/auth/login`;
    const res = await axios.post(url, { email, password });
    const t = res.data?.token;
    if (t) {
      localStorage.setItem("token", t);
      setToken(t);
    } else {
      throw new Error("No token returned from login");
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const url = `${API_BASE}/auth/register`;
    const res = await axios.post(url, { name, email, password });
    // Registration endpoint returns token per backend; if it does, store it.
    const t = res.data?.token;
    if (t) {
      localStorage.setItem("token", t);
      setToken(t);
    }
  };

  const logout = async () => {
    try {
      const url = `${API_BASE}/auth/logout`;
      console.log('[AuthContext] logout: calling backend', url, 'token present?', !!token);
      await axios.post(url, null, { headers: { "x-auth-token": token || "" } });
      console.log('[AuthContext] logout: backend responded');
    } catch (err: unknown) {
      const msg = (err as Error)?.message || String(err);
      console.warn('[AuthContext] logout: backend call failed', msg);
      // continue to clear client state even if backend fails
    }
    try {
      localStorage.removeItem("token");
    } catch (e: unknown) {
      console.warn('[AuthContext] logout: failed to remove token from localStorage', String(e));
    }
    setToken(null);
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
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
