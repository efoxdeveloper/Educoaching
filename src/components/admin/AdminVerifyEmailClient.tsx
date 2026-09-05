"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";

type VerifyData = {
  valid: boolean;
  targetEmail: string | null;
  currentEmail?: string;
  adminName?: string;
  expiresAt?: string;
};

export function AdminVerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerifyData | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No verification token found in URL. Please check the link from your email.");
      setLoading(false);
      return;
    }
    const check = async () => {
      try {
        const res = await fetch(`/api/admin/me/verify-email-change?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) setError(json.error || "Invalid or expired link.");
        else setData(json);
      } catch {
        setError("Network error while validating link.");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/me/verify-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Failed to update email.");
      else setSuccess(json.message || "Email successfully updated!");
    } catch {
      setError("Failed to update email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-2xl border border-scholar-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-scholar-50 text-scholar-700">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">Platform Admin Email Verification</h1>
          {data?.adminName && <p className="mt-1 text-xs font-medium text-scholar-500">{data.adminName}</p>}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="mb-2 animate-spin text-scholar-600" size={32} />
            <p className="text-sm text-scholar-500">Verifying authorization link…</p>
          </div>
        )}

        {error && !loading && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            <div className="flex items-center gap-2 font-semibold"><AlertCircle size={16} /> Verification Error</div>
            <p className="mt-1">{error}</p>
            <div className="mt-4 text-center">
              <Link href="/login" className="inline-flex items-center text-xs font-semibold text-scholar-700 hover:underline">Back to Sign In</Link>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
            <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-600" />
            <h3 className="mb-1 text-base font-semibold">Email Updated!</h3>
            <p className="mb-6 text-xs leading-relaxed text-emerald-700">{success}</p>
            <p className="mb-4 text-[11px] text-emerald-600">Confirmation has been sent to both your old and new email addresses.</p>
            <Link href="/login?portal=admin" className="inline-flex w-full items-center justify-center rounded-xl bg-scholar-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-scholar-800">Sign In with New Email</Link>
          </div>
        )}

        {!loading && !error && !success && data && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-semibold text-amber-800"><Mail size={16} /> Confirm Platform Admin Email Change</div>
              <p className="mt-2 text-scholar-600">You requested to change your account email from:</p>
              <p className="mt-1 font-mono text-xs font-semibold text-ink line-through opacity-70">{data.currentEmail}</p>
              <p className="mt-2 text-scholar-600">To new email address:</p>
              <p className="mt-1 font-mono text-xs font-bold text-emerald-700">{data.targetEmail}</p>
            </div>
            <p className="text-xs leading-relaxed text-scholar-500">Click below to approve this change. This link expires in 1 hour, can be used only once, and is tied to your admin account.</p>
            <button onClick={handleConfirm} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-scholar-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-scholar-800 disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />} Approve Email Change
            </button>
            <p className="text-center text-[11px] text-scholar-400">If you did not request this, ignore this page — your account will remain unchanged.</p>
          </div>
        )}
      </div>
    </div>
  );
}
