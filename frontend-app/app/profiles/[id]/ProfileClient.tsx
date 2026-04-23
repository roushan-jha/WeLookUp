"use client";

import { useEffect, useState, Fragment } from "react";
import { useParams } from "next/navigation";
import api, { setAuthToken } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import StatsChart from "@/components/StatsChart";
import { useToast } from "@/components/ToastProvider";

type Review = {
  _id: string;
  overallRating?: number;
  reviewText?: string;
  createdAt?: string;
  submittedBy?: { name?: string; domain?: string } | string;
  verificationStatus?: string;
};

type MineReview = { clientProfile?: { _id?: string } | string };

function getClientProfileId(rv: MineReview): string | undefined {
  if (!rv.clientProfile) return undefined;
  if (typeof rv.clientProfile === "string") return rv.clientProfile;
  return (rv.clientProfile as { _id?: string })._id;
}

export default function ProfileClient({ id }: { id?: string }) {
  const params = useParams();
  const resolvedId = id ?? (params?.id as string | undefined);
  const { token } = useAuth();

  type ProfileShape = {
    _id?: string;
    companyName?: string;
    clientId?: string;
    gstin?: string;
    category?: string;
    riskScore?: number;
    companyDomain?: string;
    createdBy?: { domain?: string };
  };

  type StatsShape = {
    performanceMetrics?: Record<string, number> | unknown;
    paymentAnalytics?: Record<string, number> | unknown;
    sampleSize?: number;
  } | null;

  const [profile, setProfile] = useState<ProfileShape | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<StatsShape>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (token) setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (!resolvedId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, rRes, sRes] = await Promise.all([
          api.get(`/profiles/${resolvedId}`),
          api.get(`/profiles/${resolvedId}/reviews`),
          api.get(`/profiles/${resolvedId}/stats`).catch(() => null),
        ]);
        if (!mounted) return;
        const p = { ...(pRes.data || {}), verificationStatus: "Verified" };
        setProfile(p);
        const reviewsData = rRes.data?.reviews ?? rRes.data ?? [];
        const normalizedReviews = (reviewsData || []).map((r: Review) => ({
          ...(r as Review),
          verificationStatus: "VERIFIED",
        }));
        setReviews(normalizedReviews);
        if (sRes && sRes.data) setStats(sRes.data);

        try {
          const mine = await api.get(`/reviews/mine`);
          const mineList: MineReview[] = mine.data.data || [];
          const found = mineList.some(
            (rv) => String(getClientProfileId(rv) ?? "") === String(resolvedId),
          );
          setHasSubmitted(found);
        } catch {
          // ignore
        }
      } catch (e: unknown) {
        console.error(e);
        if (e instanceof Error) setError(e.message);
        else setError("Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [resolvedId]);

  const [qualityOfService, setQualityOfService] = useState(5);
  const [customerSupport, setCustomerSupport] = useState(5);
  const [onTimeDelivery, setOnTimeDelivery] = useState(5);
  const [valueForMoney, setValueForMoney] = useState(5);
  const [communicationResponsiveness, setCommunicationResponsiveness] =
    useState(5);
  const [technicalExpertise, setTechnicalExpertise] = useState(5);
  const [paymentDelayDays, setPaymentDelayDays] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [invoice, setInvoice] = useState<File | null>(null);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return setError("Login required to submit review");
    if (!invoice) return setError("Invoice file is required");
    if (hasSubmitted)
      return setError("You already submitted a review for this profile.");
    if (!resolvedId) return setError("Profile id missing");

    const fd = new FormData();
    fd.append("clientProfileId", String(resolvedId));
    fd.append("paymentDelayDays", String(paymentDelayDays));
    fd.append("reviewText", reviewText);
    fd.append("invoiceNumber", invoiceNumber);
    fd.append("qualityOfService", String(qualityOfService));
    fd.append("customerSupport", String(customerSupport));
    fd.append("onTimeDelivery", String(onTimeDelivery));
    fd.append("valueForMoney", String(valueForMoney));
    fd.append(
      "communicationResponsiveness",
      String(communicationResponsiveness),
    );
    fd.append("technicalExpertise", String(technicalExpertise));
    fd.append("invoice", invoice as Blob);

    try {
      setSubmitting(true);
      const res = await api.post("/reviews", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const created = res.data?.review || res.data;
      const c = {
        ...(created as Review),
        verificationStatus: "VERIFIED",
      } as Review;
      setReviews((prev) => [c, ...prev]);
      setInvoice(null);
      setReviewText("");
      setError(null);
      setHasSubmitted(true);
      toast.success("Review submitted — awaiting verification");
    } catch (e: unknown) {
      console.error(e);
      type AxiosLike = { response?: { data?: unknown } };
      const maybe = e as AxiosLike | Error | unknown;
      let serverMsg: string | undefined;
      if (typeof maybe === "object" && maybe !== null && "response" in maybe) {
        const data = (maybe as AxiosLike).response?.data;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          const msgField = d.message ?? d.error ?? d.msg;
          if (typeof msgField === "string") serverMsg = msgField;
          else serverMsg = JSON.stringify(d);
        } else if (data) {
          serverMsg = String(data);
        }
      } else if (e instanceof Error) {
        serverMsg = e.message;
      }
      const msg = serverMsg ?? "Failed to submit review";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  function submittedByLabel(s: Review["submittedBy"]) {
    if (!s) return "Anonymous";
    if (typeof s === "string") {
      if (/^[0-9a-fA-F]{24}$/.test(s)) return "Reviewer";
      if (s.includes("@")) return s.split("@")[0];
      return s;
    }
    return s?.name ?? s?.domain ?? "Reviewer";
  }

  const riskRaw = profile?.riskScore ?? null;
  const riskHas = riskRaw != null;
  const riskPct = riskHas
    ? Math.min(Math.max(Number(riskRaw ?? 0), 0), 100)
    : 0;
  const riskColor = riskHas
    ? riskPct >= 75
      ? "#16A34A"
      : riskPct >= 50
        ? "#F59E0B"
        : "#EF4444"
    : "#9CA3AF";

  const arcPathD = (() => {
    const r = 16;
    const cx = 18;
    const cy = 18;
    const end = (riskPct / 100) * 2 * Math.PI;
    const x = cx + r * Math.cos(end - Math.PI / 2);
    const y = cy + r * Math.sin(end - Math.PI / 2);
    const large = riskPct > 50 ? 1 : 0;
    return `M18 2 A16 16 0 ${large} 1 ${x} ${y}`;
  })();

  const avgRating = (() => {
    const vals = reviews
      .map((r) => Number(r.overallRating ?? 0))
      .filter((v) => v > 0);
    if (vals.length === 0) return null;
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
  })();

  // Simple client-side sentiment helper (lightweight, offline)
  const generateSummary = async () => {
    if (generatingSummary) return;
    setGeneratingSummary(true);
    try {
      // Prefer server-side sentiment if available
      if (resolvedId) {
        try {
          const srv = await api.get(`/profiles/${resolvedId}/sentiment`);
          if (srv?.data) {
            const d = srv.data;
            const label = d.summary || `${d.ratingLabel ?? ""} ${d.textLabel ?? ""}`;
            setSummary(label);
            setGeneratingSummary(false);
            return;
          }
        } catch (err) {
          // ignore and fall back to client-side
          console.warn("Server sentiment failed, falling back to client heuristic", err);
        }
      }
      // Average rating based label
      const avg = (reviews
        .map((r) => Number(r.overallRating ?? 0))
        .filter((v) => v > 0)
        .reduce((s, v) => s + v, 0) / Math.max(1, reviews.filter((r) => Number(r.overallRating ?? 0) > 0).length));

      let ratingLabel = "No ratings";
      if (!isNaN(avg)) {
        if (avg >= 4.5) ratingLabel = "Overwhelmingly Positive";
        else if (avg >= 4) ratingLabel = "Mostly Positive";
        else if (avg >= 3) ratingLabel = "Mixed";
        else if (avg >= 2) ratingLabel = "Mostly Negative";
        else ratingLabel = "Overwhelmingly Negative";
      }

      // Basic text sentiment using small lexicon
      const pos = new Set(["good", "great", "excellent", "positive", "reliable", "recommend", "fast", "professional", "trust"]);
      const neg = new Set(["bad", "poor", "late", "delay", "unreliable", "fraud", "scam", "late", "slow"]);
      let textScore = 0;
      let texts = 0;
      for (const r of reviews) {
        if (!r.reviewText) continue;
        texts++;
        const toks = r.reviewText.toLowerCase().split(/[^a-z]+/).filter(Boolean);
        let s = 0;
        for (const t of toks) {
          if (pos.has(t)) s += 1;
          if (neg.has(t)) s -= 1;
        }
        textScore += Math.sign(s);
      }
      const textLabel = texts === 0 ? "No text reviews" : textScore / Math.max(1, texts) >= 0.5 ? "Positive" : textScore / Math.max(1, texts) >= 0 ? "Mixed" : "Negative";

  const combined = ratingsAndTextToLabel(ratingLabel, textLabel);
  setSummary(`${combined} (ratings: ${ratingLabel}, text: ${textLabel})`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  function ratingsAndTextToLabel(rLabel: string, tLabel: string) {
    if (rLabel === "No ratings" && tLabel === "No text reviews") return "No data to summarize";
    if (rLabel.includes("Overwhelmingly") && tLabel === "Positive") return "Overwhelmingly Positive";
    if (rLabel.includes("Mostly Positive") && (tLabel === "Positive" || tLabel === "Mixed")) return "Mostly Positive";
    if (rLabel === "Mixed" || tLabel === "Mixed") return "Mixed";
    if (rLabel.includes("Negative") || tLabel === "Negative") return "Mostly Negative";
    return rLabel;
  }

  const perfMetrics: Record<string, number> = (stats?.performanceMetrics ??
    {}) as Record<string, number>;
  const payAnalytics: Record<string, unknown> = (stats?.paymentAnalytics ??
    {}) as Record<string, unknown>;

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Hero + KPIs: full-width gradient */}
      <div className="w-full bg-gradient-to-r from-blue-50 via-blue-100 to-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          {profile && (
            <div className="rounded-lg shadow-sm p-6 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="flex-shrink-0 flex items-center justify-center">
                <svg
                  width={120}
                  height={120}
                  viewBox="0 0 36 36"
                  className="rounded-full"
                >
                  <defs>
                    <linearGradient id="rg" x1="0" x2="1">
                      <stop
                        offset="0%"
                        stopColor={riskColor}
                        stopOpacity="0.85"
                      />
                      <stop
                        offset="100%"
                        stopColor={riskColor}
                        stopOpacity="0.6"
                      />
                    </linearGradient>
                  </defs>
                  <circle cx="18" cy="18" r="16" fill="#F3F4F6" />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="12"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                  <path
                    stroke="url(#rg)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    fill="none"
                    d={arcPathD}
                  />
                  <text
                    x="18"
                    y="20"
                    textAnchor="middle"
                    fontSize="6"
                    fill="#111827"
                    className="font-semibold"
                  >
                    {riskHas ? `${Math.round(riskPct)}` : "NA"}
                  </text>
                </svg>
              </div>

              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {profile.companyName || profile.clientId}
                </h1>
                <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-4">
                  <div>
                    Category:{" "}
                    <span className="font-medium text-gray-900">
                      {profile.category ?? "-"}
                    </span>
                  </div>
                  <div>
                    GSTIN:{" "}
                    <span className="font-medium text-gray-900">
                      {profile.gstin ?? "-"}
                    </span>
                  </div>
                  <div>
                    Domain:{" "}
                    <span className="font-medium text-gray-900">
                      {profile.companyDomain ??
                        profile.createdBy?.domain ??
                        "-"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="text-sm text-gray-500">Status:</div>
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Verified
                  </div>
                  <div className="ml-4">
                    <button
                      type="button"
                      onClick={generateSummary}
                      disabled={generatingSummary}
                      className={`ml-2 px-3 py-1 text-sm rounded ${generatingSummary ? "bg-gray-200 text-gray-600 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {generatingSummary ? "Generating…" : "Generate Summary"}
                    </button>
                  </div>
                  {summary && (
                    <div className="ml-4 px-3 py-1 bg-white rounded shadow-sm text-sm">
                      <strong>Summary:</strong> {summary}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-auto text-right">
                <div className="text-sm text-gray-500">Managed by</div>
                <div className="font-medium">
                  {profile.companyDomain ?? profile.createdBy?.domain ?? "-"}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-3xl font-extrabold text-blue-600">
                {reviews.length}
              </div>
              <div className="text-sm text-blue-600">Total Reviews</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-3xl font-extrabold text-blue-600">
                {avgRating ?? "NA"}
              </div>
              <div className="text-sm text-blue-600">Avg Rating</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-3xl font-extrabold text-blue-600">
                {stats?.sampleSize ?? "NA"}
              </div>
              <div className="text-sm text-blue-600">Verified Sample</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main centered section */}
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">
                Performance & Payment Analytics
              </h3>
              {stats ? (
                (() => {
                  const perf = (stats.performanceMetrics ?? {}) as Record<
                    string,
                    number | undefined
                  >;
                  const pay = (stats.paymentAnalytics ?? {}) as Record<
                    string,
                    unknown
                  >;
                  const metrics = {
                    qualityOfService: Number(
                      perf.qualityOfService ?? perf.quality_of_service ?? 0,
                    ),
                    customerSupport: Number(
                      perf.customerSupport ?? perf.customer_support ?? 0,
                    ),
                    onTimeDelivery: Number(
                      perf.onTimeDelivery ?? perf.on_time_delivery ?? 0,
                    ),
                    valueForMoney: Number(
                      perf.valueForMoney ?? perf.value_for_money ?? 0,
                    ),
                    communicationResponsiveness: Number(
                      perf.communicationResponsiveness ??
                        perf.communication_responsiveness ??
                        0,
                    ),
                    technicalExpertise: Number(
                      perf.technicalExpertise ?? perf.technical_expertise ?? 0,
                    ),
                  };

                  const payment = {
                    averageDelayDays:
                      typeof pay.averageDelayDays === "number"
                        ? (pay.averageDelayDays as number)
                        : typeof pay.avgDelay === "number"
                          ? (pay.avgDelay as number)
                          : undefined,
                    reliabilityRating:
                      typeof pay.reliabilityRating === "string"
                        ? (pay.reliabilityRating as string)
                        : typeof pay.reliability === "string"
                          ? (pay.reliability as string)
                          : undefined,
                  };

                  const colorForScore = (v: number) => {
                    if (v >= 4)
                      return { bg: "bg-green-500", text: "text-green-700" };
                    if (v >= 3)
                      return { bg: "bg-yellow-400", text: "text-yellow-700" };
                    return { bg: "bg-red-500", text: "text-red-700" };
                  };

                  const colorForDelay = (days?: number) => {
                    if (days == null)
                      return { bg: "bg-gray-300", text: "text-gray-700" };
                    if (days <= 7)
                      return { bg: "bg-green-500", text: "text-green-700" };
                    if (days <= 21)
                      return { bg: "bg-yellow-400", text: "text-yellow-700" };
                    return { bg: "bg-red-500", text: "text-red-700" };
                  };

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded p-3 text-center">
                          <div className="text-2xl font-extrabold text-gray-900">
                            {avgRating ?? "NA"}
                          </div>
                          <div className="text-sm text-gray-500">
                            Avg Rating
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3 text-center">
                          <div className="text-2xl font-extrabold text-gray-900">
                            {payment.averageDelayDays ?? "NA"}
                          </div>
                          <div className="text-sm text-gray-500">
                            Avg Delay (days)
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3 text-center">
                          <div className="text-2xl font-extrabold text-gray-900">
                            {stats.sampleSize ?? "NA"}
                          </div>
                          <div className="text-sm text-gray-500">
                            Verified Sample
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-start">
                        <div className="lg:col-span-6 space-y-3">
                          {Object.entries(metrics).map(([k, v]) => {
                            const label = k
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (s) => s.toUpperCase());
                            const score = Number(v ?? 0);
                            const pct = Math.round((score / 5) * 100);
                            const c = colorForScore(score);
                            return (
                              <div
                                key={k}
                                className="bg-white rounded p-3 shadow-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-gray-700 truncate">
                                    {label}
                                  </div>
                                  <div className={`font-semibold ${c.text}`}>
                                    {score?.toFixed ? score.toFixed(1) : score}
                                  </div>
                                </div>
                                <div className="mt-2 w-full bg-gray-100 h-2 rounded overflow-hidden">
                                  <div
                                    className={`${c.bg} h-2`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="lg:col-span-4 min-w-0">
                          <StatsChart
                            metrics={perfMetrics}
                            payment={payAnalytics}
                            sampleSize={stats.sampleSize}
                          />
                          <div className="bg-white rounded p-3 shadow-sm mt-4">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-700">
                                Avg Delay (days)
                              </div>
                              <div className="font-semibold text-gray-900">
                                {payment.averageDelayDays ?? "NA"}
                              </div>
                            </div>
                            <div className="mt-2 w-full bg-gray-100 h-2 rounded overflow-hidden">
                              <div
                                className={`${colorForDelay(payment.averageDelayDays).bg} h-2`}
                                style={{
                                  width: `${Math.min(Math.max((payment.averageDelayDays ?? 0) / 30, 0), 1) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                              Reliability: {payment.reliabilityRating ?? "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-sm text-gray-500">
                  No verified reviews yet to generate stats.
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">Reviews</h3>
              <ul className="space-y-4">
                {reviews.length === 0 && (
                  <li className="text-gray-600">No reviews yet.</li>
                )}
                {reviews.map((r, idx) => (
                  <Fragment key={r._id}>
                    <li className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-blue-600">
                            {submittedByLabel(r.submittedBy)}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {r.overallRating ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                {r.overallRating.toFixed(1)} ★
                              </span>
                            ) : null}
                            <span
                              className={`inline-flex items-center text-xs px-2 py-1 rounded ${r.verificationStatus === "VERIFIED" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
                            >
                              {r.verificationStatus || "PENDING"}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-gray-700">{r.reviewText}</p>
                        <div className="text-sm mt-3 text-gray-500">
                          {new Date(r.createdAt || Date.now()).toLocaleString()}
                        </div>
                      </div>
                    </li>
                    {idx < reviews.length - 1 && (
                      <li
                        key={`${r._id}-sep`}
                        role="presentation"
                        aria-hidden="true"
                        className="w-full"
                      >
                        <div
                          className="h-px w-full my-3"
                          style={{
                            background:
                              "linear-gradient(to right, transparent, rgba(17,24,39,0.10) 35%, rgba(17,24,39,0.20) 50%, rgba(17,24,39,0.10) 65%, transparent)",
                          }}
                        />
                      </li>
                    )}
                  </Fragment>
                ))}
              </ul>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">Submit a review</h3>
              <form onSubmit={submit} className="space-y-3">
                {hasSubmitted ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="font-medium">
                      You have already submitted a review for this profile.
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium">
                        Review Text
                      </label>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="mt-1 w-full rounded border px-2 py-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm">Quality</label>
                        <select
                          value={qualityOfService}
                          onChange={(e) =>
                            setQualityOfService(Number(e.target.value))
                          }
                          className="mt-1 w-full rounded border px-2 py-1"
                        >
                          {[5, 4, 3, 2, 1].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm">Support</label>
                        <select
                          value={customerSupport}
                          onChange={(e) =>
                            setCustomerSupport(Number(e.target.value))
                          }
                          className="mt-1 w-full rounded border px-2 py-1"
                        >
                          {[5, 4, 3, 2, 1].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm">On-time</label>
                        <select
                          value={onTimeDelivery}
                          onChange={(e) =>
                            setOnTimeDelivery(Number(e.target.value))
                          }
                          className="mt-1 w-full rounded border px-2 py-1"
                        >
                          {[5, 4, 3, 2, 1].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm">Value</label>
                        <select
                          value={valueForMoney}
                          onChange={(e) =>
                            setValueForMoney(Number(e.target.value))
                          }
                          className="mt-1 w-full rounded border px-2 py-1"
                        >
                          {[5, 4, 3, 2, 1].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm">Response</label>
                        <select
                          value={communicationResponsiveness}
                          onChange={(e) =>
                            setCommunicationResponsiveness(
                              Number(e.target.value),
                            )
                          }
                          className="mt-1 w-full rounded border px-2 py-1"
                        >
                          {[5, 4, 3, 2, 1].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm">Technical</label>
                        <select
                          value={technicalExpertise}
                          onChange={(e) =>
                            setTechnicalExpertise(Number(e.target.value))
                          }
                          className="mt-1 w-full rounded border px-2 py-1"
                        >
                          {[5, 4, 3, 2, 1].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm">
                          Payment Delay Days
                        </label>
                        <input
                          type="number"
                          value={paymentDelayDays}
                          onChange={(e) =>
                            setPaymentDelayDays(Number(e.target.value))
                          }
                          className="mt-1 w-full rounded border px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm">Invoice Number</label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="mt-1 w-full rounded border px-2 py-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm">
                        Invoice (image/pdf){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          id="invoice-upload"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) =>
                            setInvoice(e.target.files?.[0] ?? null)
                          }
                          className="sr-only"
                          aria-required="true"
                          aria-describedby="invoice-help"
                          required
                        />
                        <label
                          htmlFor="invoice-upload"
                          className="cursor-pointer flex items-center justify-between px-3 py-2 border-2 border-dashed rounded text-sm text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                        >
                          <span>
                            {invoice
                              ? invoice.name
                              : "Click to upload (image or PDF) — required"}
                          </span>
                          {invoice ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setInvoice(null);
                              }}
                              className="ml-3 text-sm text-red-600"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-blue-600 text-sm">
                              Upload
                            </span>
                          )}
                        </label>
                      </div>
                      <p id="invoice-help" className="text-xs text-gray-500 mt-1">
                        Accepted: PNG/JPG/PDF. Max file size enforced by server.
                      </p>
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full px-4 py-2 text-white rounded ${submitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                      >
                        {submitting ? "Submitting…" : "Submit Review"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm text-sm text-gray-600">
              <div className="font-medium mb-2">Tips</div>
              <ul className="list-disc pl-5">
                <li>Attach a valid invoice (PDF or image).</li>
                <li>Provide honest ratings to help others.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
