"use client";

import React, { createContext, useContext, useState } from "react";

type ToastType = {
  id: number;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

const ToastContext = createContext<any>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const toast = ({
    title,
    description,
    variant = "default",
  }: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, description, variant }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* 화면에 실제 렌더링 */}
      <div className="fixed bottom-6 right-6 z-[9999] space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-[320px] rounded-xl shadow-lg border p-4 bg-white ${
              t.variant === "destructive" ? "border-red-500" : "border-gray-200"
            }`}
          >
            {t.title && (
              <div className="font-semibold text-gray-900">
                {t.variant === "destructive" && "❌ "}
                {t.title}
              </div>
            )}
            {t.description && (
              <div className="text-sm text-gray-600 mt-1">
                {t.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
