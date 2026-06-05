"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "@/lib/api";

type User = {
  _id?: string;
  email?: string;
  role?: string;
  name?: string;
  domain?: string;
};

export default function AccountPage() {
  const { token, logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`/auth/me`);
        if (!mounted) return;
        setUser(res.data?.user || res.data);
      } catch (err: unknown) {
        const maybeName = (err as unknown as { name?: string })?.name;
        if (maybeName === "AbortError") {
          setError("Request timed out — please try again");
        } else {
          setError((err as Error)?.message || String(err));
        }
        // on 401/404, force logout
        try {
          // call logout; prefix with void to avoid floating-promise lint
          void logout();
        } catch {}
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, logout]);

  if (!token) return <div className="p-6">Please log in to view your account.</div>;
  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Account</h1>
      <div className="p-4 border rounded">
        <div className="mb-2"><strong>Name:</strong> {user?.name}</div>
        <div className="mb-2"><strong>Email:</strong> {user?.email}</div>
        <div className="mb-2"><strong>Domain:</strong> {user?.domain}</div>
        <div className="mb-2"><strong>Role:</strong> {user?.role}</div>
        <div className="mb-2"><strong>ID:</strong> {user?._id}</div>
      </div>
    </div>
  );
}
