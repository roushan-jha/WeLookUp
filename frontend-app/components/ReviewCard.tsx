"use client";

import React from "react";

type Review = {
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
};

type Props = { review: Review };

export default function ReviewCard({ review }: Props) {
  const date = review?.createdAt ? new Date(review.createdAt).toLocaleString() : "";
  const reviewer = review?.submittedBy?.name || review?.submittedBy?.email || "Anonymous";

  return (
    <div className="p-4 border rounded-md mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">By {reviewer}</div>
        <div className="text-sm text-gray-500">{date}</div>
      </div>

      <div className="mb-2">
        <strong className="text-lg">Overall: </strong>
        <span className="text-indigo-600">{review?.overallRating ?? "—"}</span>
      </div>

      {review?.reviewText && <p className="mb-2 text-gray-800">{review.reviewText}</p>}

      <div className="text-sm text-gray-700">
        <div>Quality of Service: {review?.qualityOfService ?? "—"}</div>
        <div>Customer Support: {review?.customerSupport ?? "—"}</div>
        <div>On-time Delivery: {review?.onTimeDelivery ?? "—"}</div>
        <div>Value for Money: {review?.valueForMoney ?? "—"}</div>
        <div>Communication Responsiveness: {review?.communicationResponsiveness ?? "—"}</div>
        <div>Technical Expertise: {review?.technicalExpertise ?? "—"}</div>
      </div>
    </div>
  );
}
