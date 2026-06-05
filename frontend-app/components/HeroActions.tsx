"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HeroActions() {
  const { isAuthenticated } = useAuth();
  const target = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Link
        href={target}
        className="px-8 py-3 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg"
      >
        Get Started
      </Link>
  {/* Back button intentionally removed per request */}
    </div>
  );
}
