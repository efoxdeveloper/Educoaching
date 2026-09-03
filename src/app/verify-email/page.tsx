"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Mail, GraduationCap, Loader2 } from "lucide-react";

type Status = "verifying" | "success" | "error" | "needs-email";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const initialEmail = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<Status>(token ? "verifying" : "needs-email");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.error);
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verify();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendLoading(true);
    setResendMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResendMessage(
        data.message ?? data.error ?? "If that email needs verification, we've sent a new link."
      );
    } catch {
      setResendMessage("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm rounded-2xl border border-scholar-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
          <GraduationCap size={22} strokeWidth={2.5} />
        </div>

        {status === "verifying" && (
          <>
            <Loader2 className="mx-auto mb-4 animate-spin text-scholar-400" size={32} />
            <h2 className="font-display text-xl font-semibold text-ink">Verifying your email…</h2>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-green-600" size={32} />
            <h2 className="font-display text-xl font-semibold text-ink">Email verified</h2>
            <p className="mt-2 text-sm text-scholar-400">{message}</p>
            <Link
              href="/login?portal=institute"
              className="mt-6 inline-block w-full rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700"
            >
              Go to sign in
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto mb-4 text-danger-600" size={32} />
            <h2 className="font-display text-xl font-semibold text-ink">Verification failed</h2>
            <p className="mt-2 text-sm text-scholar-400">{message}</p>
            <button
              onClick={() => setStatus("needs-email")}
              className="mt-6 text-sm font-medium text-scholar-600 hover:underline"
            >
              Request a new link
            </button>
          </>
        )}

        {status === "needs-email" && (
          <>
            <Mail className="mx-auto mb-4 text-scholar-400" size={32} />
            <h2 className="font-display text-xl font-semibold text-ink">Verify your email</h2>
            <p className="mt-2 text-sm text-scholar-400">
              Enter your account email and we&apos;ll send you a new verification link.
            </p>
            <form onSubmit={handleResend} className="mt-4 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-scholar-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-scholar-400"
              />
              <button
                type="submit"
                disabled={resendLoading}
                className="w-full rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-60"
              >
                {resendLoading ? "Sending…" : "Send verification link"}
              </button>
            </form>
            {resendMessage && <p className="mt-3 text-xs text-scholar-500">{resendMessage}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper">
          <Loader2 className="animate-spin text-scholar-400" size={32} />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}