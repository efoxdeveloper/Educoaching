"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError(
        "This password reset link is invalid. Please request a new reset link."
      );
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to reset your password. Please request a new reset link."
        );
        return;
      }

      setMessage(
        data.message ||
          "Your password has been reset successfully."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/login?portal=institute");
      }, 2500);
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
            Create a new
            <br /> secure password.
          </p>

          <p className="mt-4 max-w-sm text-sm text-scholar-200">
            Choose a strong password that you have not used before.
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
            href="/login?portal=institute"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-scholar-400 transition-colors hover:text-scholar-600"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>

          <h2 className="font-display text-2xl font-semibold text-ink">
            Reset your password
          </h2>

          <p className="mt-1 text-sm text-scholar-400">
            Enter and confirm your new password below.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-danger-500/20 bg-danger-50 px-3 py-2.5 text-sm text-danger-600">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
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
                New password
              </label>

              <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-2.5 focus-within:border-scholar-400">
                <Lock size={16} className="text-scholar-300" />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="At least 8 characters"
                  disabled={loading || !!message}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-scholar-400 hover:text-scholar-700 transition shrink-0 p-0.5 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Confirm new password
              </label>

              <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-2.5 focus-within:border-scholar-400">
                <Lock size={16} className="text-scholar-300" />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Repeat your new password"
                  disabled={loading || !!message}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-scholar-400 hover:text-scholar-700 transition shrink-0 p-0.5 focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!message}
              className="w-full rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scholar-700 disabled:opacity-60"
            >
              {loading ? "Resetting password..." : "Reset password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}