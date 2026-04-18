"use client";

import React, { useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

export default function CreateProfileModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (profile: Record<string, unknown>) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post(`/profiles`, {
        clientId,
        companyName,
        gstin,
        category,
      });
      const profile = res.data?.profile || res.data;
      onCreated(profile);
      onClose();
      toast.success("Client profile created");
    } catch (err: unknown) {
      console.error(err);
      // Attempt to extract axios-like response safely
      let msg = "Failed to create profile";
      try {
        const maybeAxios = err as {
          response?: { data?: { message?: string } };
        };
        msg =
          maybeAxios?.response?.data?.message || (err as Error).message || msg;
      } catch {}
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create Company Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company Code (clientId)
            </label>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              GSTIN
            </label>
            <input
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              {loading ? "Creating..." : "Create Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
