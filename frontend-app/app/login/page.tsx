"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ToastProvider";
import { isAxiosError } from "axios";

const LoginPage = () => {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      try {
        router.replace("/dashboard");
      } catch {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, router]);

  // Avoid rendering the login form when already authenticated to prevent a flash
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Logged in successfully");
      router.push("/dashboard");

      // Reset form
      setEmail("");
      setPassword("");
    } catch (err) {
      if (isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message ||
          "Login failed. Please check your credentials.";
        setError(errorMessage);
        toast.error(errorMessage);
        console.error("Login API Error:", errorMessage);
      } else {
        const msg =
          (err as Error).message ||
          "A network error occurred. Check your connection.";
        setError(msg);
        toast.error(msg);
        console.error("Unknown Error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  // JSX UI
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center">Login</h2>

        {/* Error Message */}
        {error && (
          <p className="text-center text-red-500 text-sm font-medium">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="service.provider@company.com"
              required
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 text-white font-semibold rounded-md ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Need an account?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
