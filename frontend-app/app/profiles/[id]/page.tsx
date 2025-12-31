"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import ReviewCard from "../../../components/ReviewCard";
import ReviewForm from "../../../components/ReviewForm";

type Profile = {
  _id?: string;
  companyName?: string;
  riskScore?: number;
  isVerified?: boolean;
};

type Review = Record<string, unknown>;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/api/v1";
export default function ProfilePage({ params }: { params: { id?: string } }) {
  // prefer next/navigation useParams which is safe in client components
  const paramsHook = useParams();
  const id = params?.id ?? paramsHook?.id;
  const { token } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  interface ReviewObj {
    _id?: string;
    createdAt?: string;
    submittedBy?: { name?: string; email?: string };
    overallRating?: string | number;
    reviewText?: string;
    qualityOfService?: number | string;
    customerSupport?: number | string;
    onTimeDelivery?: number | string;
    valueForMoney?: number | string;
    communicationResponsiveness?: number | string;
    technicalExpertise?: number | string;
  }

  const [reviews, setReviews] = useState<ReviewObj[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return; // wait until id is available from route
      setLoading(true);
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`${API_BASE}/profiles/${id}`, { headers: { ...(token ? { "x-auth-token": token } : {}) } }),
          fetch(`${API_BASE}/reviews/profile/${id}`, { headers: { ...(token ? { "x-auth-token": token } : {}) } }),
        ]);

        if (!pRes.ok) throw new Error("Failed to load profile");
        if (!rRes.ok) throw new Error("Failed to load reviews");

  const pJson = await pRes.json();
  const rJson = await rRes.json();

        if (!mounted) return;
        setProfile(pJson.profile || pJson);
        setReviews(rJson.reviews || rJson);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

  load();
    return () => {
      mounted = false;
    };
  }, [id, token]);

  function handleCreated(newReview: Review) {
    // prepend newly created review
    setReviews((r) => [newReview, ...r]);
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (!profile) return <div className="p-4">Profile not found</div>;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{profile.companyName}</h1>
        <div className="text-sm text-gray-600">Risk Score: {profile.riskScore ?? "—"}</div>
        <div className="text-sm text-gray-600">Verified: {profile.isVerified ? "Yes" : "No"}</div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Reviews</h2>
          {reviews.length === 0 && <div className="text-gray-600">No reviews yet</div>}
          {reviews.map((rev: ReviewObj, idx: number) => (
            <ReviewCard key={rev._id ?? idx} review={rev} />
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Leave a review</h2>
          {id ? <ReviewForm profileId={String(id)} onCreated={handleCreated} /> : <div className="text-gray-600">Loading form...</div>}
        </div>
      </div>
    </div>
  );
}
