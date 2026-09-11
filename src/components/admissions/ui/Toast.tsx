"use client";

/**
 * 21st.dev-inspired Toast — polished, auto-dismiss, plain language
 * Registry: https://21st.dev/r/toast — shadcn toast variant
 * Local to admissions to avoid touching shared components
 */
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

let toastListeners: Array<(t: ToastItem) => void> = [];
let toastId = 0;

export function showLeadToast(message: string, tone: ToastTone = "success") {
  const item: ToastItem = { id: `lead-toast-${++toastId}`, message, tone };
  toastListeners.forEach((fn) => fn(item));
}

export function LeadToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const fn = (t: ToastItem) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3500);
    };
    toastListeners.push(fn);
    return () => {
      toastListeners = toastListeners.filter((x) => x !== fn);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertTriangle : Info;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2",
              t.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
              t.tone === "error" && "border-rose-200 bg-rose-50 text-rose-800",
              t.tone === "info" && "border-scholar-200 bg-white text-scholar-800"
            )}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <span className="leading-relaxed pr-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-auto -mr-1 shrink-0 rounded p-0.5 hover:bg-black/5"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
