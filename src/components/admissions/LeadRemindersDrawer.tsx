"use client";

import { useEffect, useState } from "react";
import { X, Bell, Send, CheckCircle2, AlertTriangle, MessageSquare, Mail, Loader2, Phone, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

type LeadCandidate = {
  id: string;
  applicantName: string;
  mobile: string;
  email: string | null;
  assignedTo: string | null;
  courseName: string;
  priority: string;
  stage: string;
  nextFollowUpDate: string | null;
  lastFollowUpNote: string | null;
  isOverdue: boolean;
  isToday: boolean;
};

export function LeadRemindersDrawer({
  open,
  onClose,
  onDispatched,
}: {
  open: boolean;
  onClose: () => void;
  onDispatched?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [candidates, setCandidates] = useState<LeadCandidate[]>([]);
  const [stats, setStats] = useState<{ totalCandidates: number; overdueCount: number; todayCount: number } | null>(null);
  const [channel, setChannel] = useState<"WHATSAPP" | "EMAIL" | "ALL">("ALL");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admissions/reminders");
      const data = await res.json();
      if (data.candidates) {
        setCandidates(data.candidates);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      setStatusMessage({ text: "Failed to load lead reminder candidates", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCandidates();
    }
  }, [open]);

  const handleSend = async () => {
    if (candidates.length === 0) return;
    setSending(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admissions/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch reminders");
      }
      setStatusMessage({
        text: `Follow-up reminders successfully sent! (${data.sentCount} leads notified to counsellors).`,
        type: "success",
      });
      if (onDispatched) onDispatched();
      fetchCandidates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending reminders";
      setStatusMessage({ text: msg, type: "error" });
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-scholar-950/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-2xl flex-col bg-paper shadow-2xl border-l border-scholar-100 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-scholar-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Lead Follow-Up Reminders</h2>
              <p className="text-xs text-scholar-500">
                Notify assigned counsellors about prospective leads due today or overdue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-50 hover:text-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-danger-50 text-danger-800 border border-danger-200"
            }`}
          >
            {statusMessage.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Stats KPIs */}
        <div className="grid grid-cols-3 gap-3 p-6 pb-2">
          <div className="rounded-xl border border-scholar-100 bg-scholar-50/60 p-3">
            <p className="text-[11px] font-semibold text-scholar-500">Total Follow-ups Due</p>
            <p className="font-display text-xl font-bold text-ink">{stats?.totalCandidates ?? 0}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
            <p className="text-[11px] font-semibold text-rose-600">Overdue Leads</p>
            <p className="font-display text-xl font-bold text-rose-700">{stats?.overdueCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
            <p className="text-[11px] font-semibold text-amber-600">Due Today</p>
            <p className="font-display text-xl font-bold text-amber-700">{stats?.todayCount ?? 0}</p>
          </div>
        </div>

        {/* Channel Selection & Send Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-scholar-100 bg-scholar-50/40 px-6 py-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-scholar-700">Dispatch Channel:</span>
            <div className="flex items-center gap-1 rounded-lg border border-scholar-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setChannel("ALL")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  channel === "ALL" ? "bg-scholar-800 text-white" : "text-scholar-600 hover:text-ink"
                }`}
              >
                WhatsApp + Email
              </button>
              <button
                type="button"
                onClick={() => setChannel("WHATSAPP")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  channel === "WHATSAPP" ? "bg-emerald-600 text-white" : "text-scholar-600 hover:text-ink"
                }`}
              >
                <MessageSquare size={12} /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel("EMAIL")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  channel === "EMAIL" ? "bg-scholar-600 text-white" : "text-scholar-600 hover:text-ink"
                }`}
              >
                <Mail size={12} /> Email
              </button>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || loading || candidates.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-scholar-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Send Reminders Now ({candidates.length})</span>
          </button>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-scholar-500">
            <span>Counsellor Digest Preview ({candidates.length} leads)</span>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-scholar-400 gap-2">
              <Loader2 size={20} className="animate-spin text-scholar-500" />
              <span>Checking scheduled follow-ups...</span>
            </div>
          )}

          {!loading && candidates.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-scholar-200 py-12 text-center">
              <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-ink">All Follow-ups Up to Date!</p>
              <p className="text-xs text-scholar-400 mt-0.5">No leads currently scheduled for follow-up today or overdue.</p>
            </div>
          )}

          {!loading &&
            candidates.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between rounded-xl border border-scholar-100 bg-white p-3.5 shadow-2xs hover:border-scholar-200 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-ink">{c.applicantName}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.priority === "HOT"
                          ? "bg-rose-100 text-rose-800"
                          : c.priority === "WARM"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {c.priority}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.isOverdue
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {c.isOverdue ? "Overdue" : "Due Today"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-scholar-500">
                    <span>Course: <strong className="text-scholar-700">{c.courseName}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-scholar-700">
                      <Phone size={11} className="text-scholar-400" /> {c.mobile}
                    </span>
                    <span>•</span>
                    <span>Assigned: <strong className="text-scholar-800">{c.assignedTo || "Unassigned"}</strong></span>
                  </div>

                  {c.lastFollowUpNote && (
                    <p className="text-[11px] text-scholar-600 bg-scholar-50/80 rounded-lg p-2 mt-1 italic border border-scholar-100">
                      &ldquo;{c.lastFollowUpNote}&rdquo;
                    </p>
                  )}
                </div>

                <div className="text-right text-[11px] text-scholar-400 shrink-0">
                  {c.nextFollowUpDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDate(c.nextFollowUpDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
