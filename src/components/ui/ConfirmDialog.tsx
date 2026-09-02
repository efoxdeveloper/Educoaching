"use client";

import { useEffect } from "react";
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2, X, Loader2 } from "lucide-react";

export type ConfirmTone = "danger" | "warn" | "info" | "success";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const toneConfig = {
    danger: {
      icon: AlertTriangle,
      iconBg: "bg-rose-50 text-rose-600 border-rose-200",
      btnClass: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
    },
    warn: {
      icon: AlertCircle,
      iconBg: "bg-amber-50 text-amber-600 border-amber-200",
      btnClass: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    },
    info: {
      icon: HelpCircle,
      iconBg: "bg-scholar-50 text-scholar-700 border-scholar-200",
      btnClass: "bg-scholar-700 hover:bg-scholar-800 text-white focus:ring-scholar-500",
    },
    success: {
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
    },
  }[tone];

  const Icon = toneConfig.icon;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-scholar-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      {/* Dialog Box */}
      <div className="relative w-full max-w-md rounded-2xl border border-scholar-200 bg-white p-6 shadow-popover transition-all animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-scholar-400 hover:bg-scholar-50 hover:text-ink disabled:opacity-50 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${toneConfig.iconBg}`}
          >
            <Icon size={22} strokeWidth={2.2} />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-display text-base font-bold text-ink leading-tight">
              {title}
            </h3>
            <div className="mt-2 text-xs text-scholar-600 leading-relaxed">
              {typeof message === "string" ? <p>{message}</p> : message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-scholar-200 bg-white px-4 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition disabled:opacity-50 shadow-2xs"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition disabled:opacity-50 ${toneConfig.btnClass}`}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
