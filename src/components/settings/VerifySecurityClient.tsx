"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

type VerificationData = {
  valid: boolean;
  type: "PASSWORD_CHANGE" | "EMAIL_CHANGE";
  targetEmail: string | null;
  currentEmail?: string;
  instituteName?: string;
  userRole?: string;
  userName?: string;
  error?: string;
};

export function VerifySecurityClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState("");

  // Form states for password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No verification token found in URL. Please check the link from your email.");
      setLoading(false);
      return;
    }

    const checkToken = async () => {
      try {
        const res = await fetch(`/api/institutes/me/security/verify-update?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Invalid or expired verification link.");
        } else {
          setData(json);
        }
      } catch {
        setError("Network error while validating link. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const handleConfirmEmailChange = async () => {
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/institutes/me/security/verify-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update email.");
      } else {
        setSuccessMessage(json.message || "Email successfully updated!");
      }
    } catch {
      setError("Failed to update email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/institutes/me/security/verify-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update password.");
      } else {
        setSuccessMessage(json.message || "Password updated successfully!");
      }
    } catch {
      setError("Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-2xl border border-scholar-100 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-scholar-50 text-scholar-700">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">
            Account Security Verification
          </h1>
          {data?.instituteName && (
            <p className="mt-1 text-xs text-scholar-500 font-medium">
              {data.instituteName}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="animate-spin text-scholar-600 mb-2" size={32} />
            <p className="text-sm text-scholar-500">Verifying authorization link…</p>
          </div>
        )}

        {/* Error message */}
        {error && !loading && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle size={16} />
              Verification Error
            </div>
            <p className="mt-1">{error}</p>
            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-xs font-semibold text-scholar-700 hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
            <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-2" />
            <h3 className="font-semibold text-base mb-1">Success!</h3>
            <p className="text-xs text-emerald-700 leading-relaxed mb-6">
              {successMessage}
            </p>
            <Link
              href={data?.userRole === "STUDENT" ? "/login?portal=student" : data?.userRole === "OWNER" ? "/settings" : "/login"}
              className="inline-flex items-center justify-center w-full rounded-xl bg-scholar-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-scholar-800"
            >
              {data?.userRole === "STUDENT" ? "Sign In to Student Portal" : "Proceed to Login / Dashboard"}
            </Link>
          </div>
        )}

        {/* Valid Token UI */}
        {!loading && !error && !successMessage && data && (
          <div>
            {data.type === "EMAIL_CHANGE" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-semibold text-amber-800">
                    <Mail size={16} />
                    Confirm Institute Email Change
                  </div>
                  <p className="mt-2 text-scholar-600">
                    You requested to change your login & contact email address from:
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold text-ink line-through opacity-70">
                    {data.currentEmail}
                  </p>
                  <p className="mt-2 text-scholar-600">To new email address:</p>
                  <p className="mt-1 font-mono text-xs font-bold text-emerald-700">
                    {data.targetEmail}
                  </p>
                </div>

                <p className="text-xs text-scholar-500 leading-relaxed">
                  Click the button below to confirm. Your login credentials and all institute notification records will update immediately to the new email address.
                </p>

                <button
                  onClick={handleConfirmEmailChange}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-scholar-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-scholar-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Confirm Email Change
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="rounded-xl border border-scholar-100 bg-scholar-50 p-3.5 text-xs text-scholar-700">
                  <div className="flex items-center gap-2 font-semibold text-scholar-900">
                    <KeyRound size={16} />
                    {data?.userRole === "STUDENT" ? "Set New Student Password" : "Set New Account Password"}
                  </div>
                  <p className="mt-1">
                    Identity verified via email. Please choose a strong new password for your account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-scholar-200 bg-white pl-3 pr-9 py-2 text-xs outline-none focus:border-scholar-500 focus:ring-1 focus:ring-scholar-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-scholar-400 hover:text-scholar-700 transition p-0.5 focus:outline-none"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Re-type new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-scholar-200 bg-white pl-3 pr-9 py-2 text-xs outline-none focus:border-scholar-500 focus:ring-1 focus:ring-scholar-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-scholar-400 hover:text-scholar-700 transition p-0.5 focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-scholar-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-scholar-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Update Password Now
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
