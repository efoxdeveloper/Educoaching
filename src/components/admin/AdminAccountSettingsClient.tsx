"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function AdminAccountSettingsClient({ currentEmail, adminName }: { currentEmail: string; adminName: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newEmail || !newEmail.includes("@")) {
      setError("Please enter a valid new email address.");
      return;
    }
    if (newEmail.toLowerCase().trim() === currentEmail.toLowerCase().trim()) {
      setError("New email must be different from current email.");
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch("/api/admin/me/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to send confirmation.");
      else {
        setSuccess(data.message);
        setShowForm(false);
        setNewEmail("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2.5 border-b border-scholar-100 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-50 text-scholar-700">
          <ShieldCheck size={19} />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Platform Admin Account</h2>
          <p className="text-xs text-scholar-500">Manage your platform admin login email with email verification.</p>
        </div>
      </div>

      <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3.5 text-xs text-scholar-600 mb-5">
        <p className="flex items-center gap-1.5 font-medium text-scholar-800"><ShieldCheck size={14} className="text-scholar-600" /> Two-step Verification Protection</p>
        <p className="mt-1 leading-relaxed">For security, changing your email requires approval via a confirmation link sent to your <strong>current</strong> email address (<strong>{currentEmail}</strong>), not the new one.</p>
      </div>

      <div className="rounded-2xl border border-scholar-100 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-scholar-50 text-scholar-700"><Mail size={15} /></div>
          <div>
            <h3 className="font-display text-sm font-semibold text-ink">Change Login Email</h3>
            <p className="text-[11px] text-scholar-400">Signed in as {adminName} — Current: {currentEmail}</p>
          </div>
        </div>
        <p className="text-xs text-scholar-500 mb-4 leading-relaxed">Enter the new email you want to switch to. We’ll send a confirmation link to your <strong>existing inbox</strong> to approve the change. No change happens until you click that link.</p>

        {success && <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /><span>{success}</span></div>}
        {error && <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" /><span>{error}</span></div>}

        {!showForm ? (
          <button type="button" onClick={() => { setShowForm(true); setError(""); }} className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-scholar-50">
            <Mail size={13} /> Change Login Email
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-ink mb-1">New Email Address</label>
              <input type="email" required placeholder="e.g. newadmin@vidyalaya.in" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs outline-none focus:border-scholar-500 focus:ring-1 focus:ring-scholar-500" />
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={requesting} className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-scholar-800 disabled:opacity-50">
                {requesting && <Loader2 size={13} className="animate-spin" />} Send Confirmation to Current Email
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-600 hover:bg-scholar-50">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
