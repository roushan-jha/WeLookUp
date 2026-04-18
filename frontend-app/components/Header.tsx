"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      console.log("[Header] handleLogout: invoking logout");
      await logout();
      console.log("[Header] handleLogout: logout completed");
    } catch (err) {
      console.error("[Header] handleLogout error", err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="text-2xl font-bold text-white hover:text-gray-200"
            >
              WeLookUp
            </Link>
          </div>

          {/* Right-side Buttons */}
          <div className="flex items-center space-x-4">
            {mounted ? (
              isAuthenticated ? (
                <>
                  <Link
                    href="/account"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                  >
                    Account
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={`px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm ${loggingOut ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                  >
                    Register
                  </Link>
                </>
              )
            ) : (
              // Render a neutral placeholder to avoid markup differences between server and client
              <div className="h-8 w-48" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
