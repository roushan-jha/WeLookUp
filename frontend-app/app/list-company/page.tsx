"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ListCompanyPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      try {
        router.replace("/login");
      } catch {
        router.push("/login");
      }
    }
  }, [isAuthenticated, router]);

  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [success, setSuccess] = useState(false);
  const [clientId, setClientId] = useState("");
  const [category, setCategory] = useState("");

  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Post to /profiles to create profile (match CreateProfileModal schema)
    (async () => {
      try {
        const payload = { clientId, companyName, gstin, category };
        const res = await api.post("/profiles", payload);
        console.log("Profile created:", res.data);
        setSuccess(true);
        toast.success("Client profile created");
        // Reset
        setClientId("");
        setCompanyName("");
        setGstin("");
        setCategory("");
        // small UX delay
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        console.error("Failed to create profile", err);
        toast.error("Failed to create profile");
      }
    })();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* <Header /> */}

      <main className="flex-grow bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              List Your Company
            </h1>
            <p className="text-gray-700">
              Add your company to our database for risk assessment
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <form onSubmit={handleSubmit}>
              {/* Client ID */}
              <div className="mb-4">
                <label
                  htmlFor="clientId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Company Code (clientId) *
                </label>
                <input
                  type="text"
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Unique company code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Company Name */}
              <div className="mb-6">
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* GSTIN */}
              <div className="mb-6">
                <label
                  htmlFor="gstin"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  GSTIN (GST Identification Number) *
                </label>
                <input
                  type="text"
                  id="gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: 2 digits (State Code) + 10 characters (PAN) + 3
                  characters
                </p>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                >
                  <option value="">Select category</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="IT Services">IT Services</option>
                  <option value="Retail">Retail</option>
                  <option value="Construction">Construction</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Success Message */}
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-green-800 text-sm font-medium">
                      Company listed successfully!
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                List Company
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your company information will be added to
                our database and will be available for risk assessment queries.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* <Footer /> */}
    </div>
  );
}
