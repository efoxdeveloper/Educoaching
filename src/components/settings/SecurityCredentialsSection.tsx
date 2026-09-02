"use client";

import { useState } from "react";
import {
  KeyRound,
  Mail,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";

type SecurityCredentialsSectionProps = {
  currentEmail: string;
  ownerName: string;
  canManage: boolean;
};

export function SecurityCredentialsSection({
  currentEmail,
  ownerName,
  canManage,
}: SecurityCredentialsSectionProps) {
  // Password change state
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Email change state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [requestingEmail, setRequestingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleRequestPasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    setRequestingPassword(true);

    try {
      const res = await fetch("/api/institutes/me/security/request-password-change", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Failed to send password verification email.");
      } else {
        setPasswordSuccess(data.message);
      }
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setRequestingPassword(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail || !newEmail.includes("@")) {
      setEmailError("Please enter a valid new email address.");
      return;
    }

    setRequestingEmail(true);

    try {
      const res = await fetch("/api/institutes/me/security/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEmailError(data.error || "Failed to send email change verification link.");
      } else {
        setEmailSuccess(data.message);
        setShowEmailDialog(false);
      }
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setRequestingEmail(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between border-b border-scholar-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-50 text-scholar-700">
            <ShieldCheck size={19} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Security & Credentials
            </h2>
            <p className="text-xs text-scholar-500">
              Manage institute owner login email and password with secure email verification.
            </p>
          </div>
        </div>
      </div>

      {/* Global verification notice */}
      <div className="mb-5 rounded-xl border border-scholar-100 bg-scholar-50/50 p-3.5 text-xs text-scholar-600">
        <p className="flex items-center gap-1.5 font-medium text-scholar-800">
          <ShieldCheck size={14} className="text-scholar-600" />
          Two-step Owner Verification Protection
        </p>
        <p className="mt-1 leading-relaxed">
          For your institute&apos;s security, password and email updates require confirmation via a verification link sent to your registered email address (<strong>{currentEmail}</strong>).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Password Change Box */}
        <div className="rounded-2xl border border-scholar-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-scholar-50 text-scholar-700">
              <KeyRound size={15} />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">Change Password</h3>
              <p className="text-[11px] text-scholar-400">Account login password for {ownerName}</p>
            </div>
          </div>

          <p className="text-xs text-scholar-500 mb-4 leading-relaxed">
            Clicking below will send a verification email with a 1-hour secure link to confirm that it is you changing your password.
          </p>

          {passwordSuccess && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
              <span>{passwordError}</span>
            </div>
          )}

          <button
            type="button"
            disabled={requestingPassword || !canManage}
            onClick={handleRequestPasswordChange}
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-scholar-50 disabled:opacity-50"
          >
            {requestingPassword && <Loader2 size={13} className="animate-spin" />}
            <KeyRound size={13} />
            Request Password Change
          </button>
        </div>

        {/* Email Change Box */}
        <div className="rounded-2xl border border-scholar-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-scholar-50 text-scholar-700">
              <Mail size={15} />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">Change Owner Email</h3>
              <p className="text-[11px] text-scholar-400">Current: {currentEmail}</p>
            </div>
          </div>

          <p className="text-xs text-scholar-500 mb-4 leading-relaxed">
            Request an email update. A verification link will be sent to your current email to confirm the change.
          </p>

          {emailSuccess && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {emailError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
              <span>{emailError}</span>
            </div>
          )}

          {!showEmailDialog ? (
            <button
              type="button"
              disabled={!canManage}
              onClick={() => {
                setShowEmailDialog(true);
                setEmailError("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-scholar-50 disabled:opacity-50"
            >
              <Mail size={13} />
              Change Login Email
            </button>
          ) : (
            <form onSubmit={handleRequestEmailChange} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">
                  New Owner Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. newowner@institute.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs outline-none focus:border-scholar-500 focus:ring-1 focus:ring-scholar-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={requestingEmail}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-scholar-800 disabled:opacity-50"
                >
                  {requestingEmail && <Loader2 size={13} className="animate-spin" />}
                  Send Confirmation Mail
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailDialog(false)}
                  className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-600 hover:bg-scholar-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}
