"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import ProfileCard from "@/components/ProfileCard";

type Profile = { _id: string; companyName: string; riskScore?: number; totalReviews?: number; isVerified?: boolean };

export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    const fetchProfiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const { fetchWithTimeout } = await import('../../utils/fetchWithTimeout');
        const res = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1'}/profiles`, { headers: { 'Content-Type': 'application/json', 'x-auth-token': token } }, 30000);
        if (!res.ok) throw new Error(`Failed to fetch profiles: ${res.status}`);
        const data = await res.json();
        setProfiles(data || []);
      } catch (e) {
        console.error(e);
        setError((e as Error).message || 'Error fetching profiles');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [token]);

  const filtered = useMemo(() => {
    if (!query) return profiles;
    const q = query.toLowerCase().trim();
    return profiles.filter(p => p.companyName.toLowerCase().includes(q));
  }, [profiles, query]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Company Dashboard</h1>
          <SearchBar value={query} onChange={setQuery} placeholder="Search companies" />
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Loading profiles...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-grow bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">No companies found matching your search.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(p => <ProfileCard key={p._id} profile={p} />)}
          </div>
        </div>
      </div>
    </div>
  );
}