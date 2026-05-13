"use client";

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface FormErrorMessageProps {
  message?: string | null;
  className?: string;
  icon?: ReactNode;
  variant?: "inline" | "banner";
}

export function FormErrorMessage({
  message,
  className = "",
  icon,
  variant = "inline",
}: FormErrorMessageProps) {
  if (!message) return null;

  const isBanner = variant === "banner";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-2 border border-rose-200 bg-rose-50 text-rose-800 shadow-sm ${isBanner ? "rounded-2xl px-4 py-4 text-sm font-bold" : "mt-2 rounded-2xl px-4 py-3 text-xs font-semibold"} ${className}`}
    >
      <span
        className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full ${isBanner ? "h-7 w-7 bg-rose-100" : "h-6 w-6 bg-rose-100"}`}
      >
        {icon ?? (
          <AlertCircle size={isBanner ? 18 : 14} className="text-rose-500" />
        )}
      </span>
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
