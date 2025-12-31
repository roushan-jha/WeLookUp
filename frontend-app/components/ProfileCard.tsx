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
  return (
    <Link href={`/profiles/${profile._id}`} className="block" aria-label={`View ${profile.companyName} details`}>
      <div className="p-6 bg-gray-50 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-white border border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{profile.companyName}</h3>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Risk Score</div>
                  <div className="text-lg font-medium text-gray-900">{profile.riskScore ?? "—"}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Reviews</div>
                  <div className="text-lg font-medium text-gray-900">{profile.totalReviews ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
          
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              profile.isVerified ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
            }`}
          >
            {profile.isVerified ? "Verified" : "Unverified"}
          </span>
        </div>
      </div>
    </Link>
  );
}
