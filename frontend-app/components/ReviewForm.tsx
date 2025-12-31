"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type Props = {
  profileId: string;
  onCreated?: (review: Record<string, unknown>) => void;
};

export default function ReviewForm({ profileId, onCreated }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    paymentDelayDays: "",
    reviewText: "",
    qualityOfService: "",
    customerSupport: "",
    onTimeDelivery: "",
    valueForMoney: "",
    communicationResponsiveness: "",
    technicalExpertise: "",
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/api/v1";

  function onChange(e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const { name, value } = target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("clientProfileId", profileId);
      fd.append("paymentDelayDays", form.paymentDelayDays);
      fd.append("reviewText", form.reviewText);
      fd.append("qualityOfService", form.qualityOfService);
      fd.append("customerSupport", form.customerSupport);
      fd.append("onTimeDelivery", form.onTimeDelivery);
      fd.append("valueForMoney", form.valueForMoney);
      fd.append("communicationResponsiveness", form.communicationResponsiveness);
      fd.append("technicalExpertise", form.technicalExpertise);
      if (invoiceFile) fd.append("invoice", invoiceFile);

      const res = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: {
          ...(token ? { "x-auth-token": token } : {}),
        },
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to submit review");
      }

      const data = await res.json();
      setLoading(false);
      setForm({
        paymentDelayDays: "",
        reviewText: "",
        qualityOfService: "",
        customerSupport: "",
        onTimeDelivery: "",
        valueForMoney: "",
        communicationResponsiveness: "",
        technicalExpertise: "",
      });
      setInvoiceFile(null);
      if (onCreated) onCreated(data.review || data);
    } catch (err: unknown) {
      setLoading(false);
      setError((err as Error)?.message || String(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 border rounded-md">
      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className="mb-2">
        <label className="block text-sm">Payment delay (days)</label>
        <input name="paymentDelayDays" value={form.paymentDelayDays} onChange={onChange} className="w-full p-2 border rounded" />
      </div>

      <div className="mb-2">
        <label className="block text-sm">Review</label>
  <textarea name="reviewText" value={form.reviewText} onChange={onChange} className="w-full p-2 border rounded" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <input name="qualityOfService" placeholder="QualityOfService (1-5)" value={form.qualityOfService} onChange={onChange} className="p-2 border rounded" />
        <input name="customerSupport" placeholder="CustomerSupport (1-5)" value={form.customerSupport} onChange={onChange} className="p-2 border rounded" />
        <input name="onTimeDelivery" placeholder="OnTimeDelivery (1-5)" value={form.onTimeDelivery} onChange={onChange} className="p-2 border rounded" />
        <input name="valueForMoney" placeholder="ValueForMoney (1-5)" value={form.valueForMoney} onChange={onChange} className="p-2 border rounded" />
        <input name="communicationResponsiveness" placeholder="CommunicationResponsiveness (1-5)" value={form.communicationResponsiveness} onChange={onChange} className="p-2 border rounded" />
        <input name="technicalExpertise" placeholder="TechnicalExpertise (1-5)" value={form.technicalExpertise} onChange={onChange} className="p-2 border rounded" />
      </div>

      <div className="mb-2">
        <label className="block text-sm">Invoice (optional)</label>
        <input type="file" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} />
      </div>

      <div className="flex items-center gap-2">
        <button disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">
          {loading ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </form>
  );
}
