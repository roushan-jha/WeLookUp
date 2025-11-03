"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type User = {
  _id?: string;
  email?: string;
  role?: string;
};

export default function AccountPage() {
  const { token, logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/api/v1";
    let mounted = true;
    setLoading(true);
  (async () => {
      try {
    const { fetchWithTimeout } = await import("../../utils/fetchWithTimeout");
  const res = await fetchWithTimeout(`${API_BASE}/auth/me`, { headers: { "x-auth-token": token } }, 30000);
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = json?.message || `Failed to fetch user: ${res.status}`;
          // If token is invalid or user not found, logout and redirect to login
          if (res.status === 401 || res.status === 404) {
            await logout();
            return;
          }
          throw new Error(msg);
        }

        if (!mounted) return;
        setUser(json.user || json);
      } catch (err: unknown) {
        const maybeName = (err as unknown as { name?: string })?.name;
        if (maybeName === 'AbortError') {
          setError('Request timed out — please try again');
        } else {
          setError((err as Error)?.message || String(err));
        }
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
        <div className="mb-2"><strong>Email:</strong> {user?.email}</div>
        <div className="mb-2"><strong>Role:</strong> {user?.role}</div>
        <div className="mb-2"><strong>ID:</strong> {user?._id}</div>
      </div>
    </div>
  );
}
