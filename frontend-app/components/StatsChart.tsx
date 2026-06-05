"use client";

import React from "react";

type Props = {
  metrics: {
    qualityOfService?: number;
    customerSupport?: number;
    onTimeDelivery?: number;
    valueForMoney?: number;
    communicationResponsiveness?: number;
    technicalExpertise?: number;
  };
  payment?: { averageDelayDays?: number; reliabilityRating?: string };
  sampleSize?: number;
};

const labelMap: { key: keyof Props["metrics"]; label: string }[] = [
  { key: "qualityOfService", label: "Quality" },
  { key: "customerSupport", label: "Support" },
  { key: "onTimeDelivery", label: "Delivery" },
  { key: "valueForMoney", label: "Value" },
  { key: "communicationResponsiveness", label: "Response" },
  { key: "technicalExpertise", label: "Technical" },
];

export default function StatsChart({ metrics = {}, payment, sampleSize = 0 }: Props) {
  const max = 5;
  const colorForScore = (v: number) => {
    // v is 0..5
    if (v >= 4) return { bg: 'bg-green-500', text: 'text-green-700' };
    if (v >= 3) return { bg: 'bg-yellow-400', text: 'text-yellow-700' };
    return { bg: 'bg-red-500', text: 'text-red-700' };
  };

  const colorForDelay = (days?: number) => {
    if (days == null) return { bg: 'bg-gray-300', text: 'text-gray-700' };
    if (days <= 7) return { bg: 'bg-green-500', text: 'text-green-700' };
    if (days <= 21) return { bg: 'bg-yellow-400', text: 'text-yellow-700' };
    return { bg: 'bg-red-500', text: 'text-red-700' };
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div>
        <div className="mb-3">
          <div className="text-sm text-gray-600">Average payment delay</div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2 min-w-0">
            <div className="w-full sm:w-48 flex-shrink-0">
              <div className="text-lg font-semibold truncate">
                {payment?.averageDelayDays ?? "-"} days
              </div>
              <div className="text-sm text-gray-500">Reliability: {payment?.reliabilityRating ?? "-"}</div>
              <div className="h-3 bg-gray-100 rounded mt-2 overflow-hidden">
                <div className={`${colorForDelay(payment?.averageDelayDays).bg} h-3`} style={{ width: `${Math.min(Math.max((payment?.averageDelayDays ?? 0) / 30, 0), 1) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">Verified reviews: <span className="font-medium">{sampleSize}</span></div>
      </div>
    </div>
  );
}
