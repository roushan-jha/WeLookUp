"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import SearchBar from "@/components/SearchBar";
import ProfileCard from "@/components/ProfileCard";

type Profile = {
  _id: string;
  clientId?: string;
  companyName: string;
  gstin?: string;
  riskScore?: number;
  totalReviews?: number;
  verificationStatus?: string;
};

export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // create profile now navigates to /list-company instead of opening a modal

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    let mounted = true;
    const fetchProfiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/profiles`);
        if (mounted) setProfiles(res.data || []);
      } catch (e: unknown) {
        console.error(e);
        setError((e as Error).message || "Failed to load profiles");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfiles();
    return () => {
      mounted = false;
    };
  }, [token, router]);

  const filtered = useMemo(() => {
    if (!query) return profiles;
    const q = query.toLowerCase().trim();
    return profiles.filter(
      (p) =>
        (p.companyName || "").toLowerCase().includes(q) ||
        (p.clientId || "").toLowerCase().includes(q) ||
        (p.gstin || "").toLowerCase().includes(q),
    );
  }, [profiles, query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-gray-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="w-full max-w-3xl">
              <div className="flex items-center gap-4 bg-transparent rounded-lg p-4 justify-center">
                <div className="flex-1">
                  <SearchBar value={query} onChange={setQuery} placeholder="" />
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => router.push("/list-company")}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700"
                  >
                    Create Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* summary metrics - three columns, larger gap, centered labels; vertically centered in section */}
        <div className="flex items-center justify-center min-h-[12rem]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-20 justify-items-center w-full">
            <div className="flex flex-col items-center">
              <div className="text-6xl sm:text-7xl font-extrabold text-blue-600">
                {profiles.length}
              </div>
              <div className="text-sm text-blue-600 mt-2">Total Companies</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-6xl sm:text-7xl font-extrabold text-blue-600">
                {(() => {
                  const scored = profiles.filter(
                    (p) =>
                      (p.totalReviews ?? 0) > 0 &&
                      typeof p.riskScore === "number",
                  );
                  if (scored.length === 0) return "NA";
                  const avg = Math.round(
                    scored.reduce((s, p) => s + (p.riskScore || 0), 0) /
                      scored.length,
                  );
                  return avg;
                })()}
              </div>
              <div className="text-sm text-blue-600 mt-2">Average Risk</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-6xl sm:text-7xl font-extrabold text-blue-600">
                {
                  profiles.filter((p) => p.verificationStatus === "Verified")
                    .length
                }
              </div>
              <div className="text-sm text-blue-600 mt-2">
                Verified Profiles
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* full-width gradient background for client cards section */}
      <div className="w-full bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-lg text-gray-600">
                  Loading profiles...
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600">
                  No companies found matching your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p) => (
                  <ProfileCard
                    key={p._id}
                    profile={{
                      _id: p._id,
                      companyName: p.companyName,
                      riskScore: p.riskScore,
                      totalReviews: p.totalReviews,
                      isVerified: p.verificationStatus === "Verified",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
