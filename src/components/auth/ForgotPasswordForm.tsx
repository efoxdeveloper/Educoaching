"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal");

  const loginUrl = `/login${portal ? `?portal=${portal}` : ""}`;

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setMessage(
        data.message ||
          "If an account exists with this email, a password reset link has been sent."
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-scholar-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>

          <span className="font-display text-xl font-semibold">
            Vidyalaya
          </span>
        </div>

        <div>
          <p className="font-display text-3xl font-semibold leading-tight">
            Get back to your
            <br /> institute dashboard.
          </p>

          <p className="mt-4 max-w-sm text-sm text-scholar-200">
            Enter your account email and we&apos;ll send you a secure link to reset
            your password.
          </p>
        </div>

        <p className="text-xs text-scholar-300">
          © {new Date().getFullYear()} Vidyalaya Admin
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-paper p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
              <GraduationCap size={22} strokeWidth={2.5} />
            </div>

            <span className="font-display text-xl font-semibold text-ink">
              Vidyalaya
            </span>
          </div>

          <Link
            href={loginUrl}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-scholar-400 transition-colors hover:text-scholar-600"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>

          <h2 className="font-display text-2xl font-semibold text-ink">
            Forgot your password?
          </h2>

          <p className="mt-1 text-sm text-scholar-400">
            Enter your email address and we&apos;ll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-danger-500/20 bg-danger-50 px-3 py-2.5 text-sm text-danger-600">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {message && (
              <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-50 px-3 py-2.5 text-sm text-green-700">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Email
              </label>

              <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-2.5 focus-within:border-scholar-400">
                <Mail size={16} className="text-scholar-300" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scholar-700 disabled:opacity-60"
            >
              {loading ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}