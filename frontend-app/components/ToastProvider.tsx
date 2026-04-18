"use client";

import React, { createContext, useContext, useCallback, useState } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: string; message: string; type: ToastType };

type ToastContextType = {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const t: Toast = { id, message, type };
    setToasts((s) => [t, ...s]);
    // auto remove
    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const value: ToastContextType = {
    toast: {
      success: (m: string) => push(m, "success"),
      error: (m: string) => push(m, "error"),
      info: (m: string) => push(m, "info"),
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container - top center */}
      <div className="pointer-events-none fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4">
        <div className="flex flex-col items-center gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto w-full rounded-md px-4 py-2 shadow-md text-sm flex items-center justify-between ${
                t.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : t.type === "error"
                    ? "bg-red-50 border border-red-200 text-red-800"
                    : "bg-gray-50 border border-gray-200 text-gray-800"
              }`}
            >
              <div className="truncate">{t.message}</div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
};

export default ToastProvider;
