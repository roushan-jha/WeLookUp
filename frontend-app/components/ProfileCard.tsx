"use client";
import React from "react";
import Link from "next/link";

type Profile = {
  _id: string;
  companyName: string;
  riskScore?: number;
  totalReviews?: number;
  isVerified?: boolean;
};

export default function ProfileCard({ profile }: { profile: Profile }) {
  const initials = profile.companyName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  // risk color
  const rawRisk = profile.riskScore ?? null;
  const hasReviews = (profile.totalReviews ?? 0) > 0;
  // if no reviews, risk is considered NA
  const risk = hasReviews ? rawRisk : null;
  // high = green, medium = yellow, low = red
  const riskColor =
    risk === null
      ? "bg-gray-200 text-gray-700"
      : risk >= 75
      ? "bg-green-100 text-green-800"
      : risk >= 50
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <Link href={`/profiles/${profile._id}`} className="block" aria-label={`View ${profile.companyName} details`}>
      <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center text-xl font-semibold text-blue-700">{initials}</div>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{profile.companyName}</h3>

            <div className="mt-4 flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${riskColor}`}>Risk: {risk === null ? "NA" : risk}</div>

              <div className="text-sm text-gray-600">Reviews: <span className="font-medium text-gray-900">{profile.totalReviews ?? 0}</span></div>

              {profile.isVerified && (
                <div className="ml-auto text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-800">Verified</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full ${risk === null ? 'bg-gray-300' : risk >= 75 ? 'bg-green-500' : risk >=50 ? 'bg-yellow-400' : 'bg-red-500'}`}
              style={{ width: `${risk === null ? 0 : Math.min(Math.max(risk ?? 0, 0), 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
