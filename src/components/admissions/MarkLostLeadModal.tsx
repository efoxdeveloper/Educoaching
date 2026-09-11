"use client";

import { useState } from "react";
import { X, AlertOctagon, Check, Loader2, Info, Archive } from "lucide-react";
import type { PipelineLead } from "./LeadPipelineBoard";

export const LOST_REASONS = [
  { value: "FEE_TOO_HIGH", label: "Fee too high — budget issue", hint: "Student liked teaching but fee was high" },
  { value: "TIMING_CLASH", label: "Timing clash — batch/school overlap", hint: "Student's school or other class timing clashes" },
  { value: "DISTANCE_ISSUE", label: "Too far — travel issue", hint: "Centre is far from home" },
  { value: "JOINED_COMPETITOR", label: "Joined another institute", hint: "Went to a different coaching" },
  { value: "DECIDED_AGAINST", label: "Postponed / Not preparing now", hint: "Plans to prepare later, not now" },
  { value: "UNRESPONSIVE", label: "Not answering after 3+ calls", hint: "Tried calling 3 times, no response" },
  { value: "OTHER", label: "Other — please specify below", hint: "Any other reason" },
];

export function MarkLostLeadModal({
  lead,
  open,
  onClose,
  onSuccess,
}: {
  lead: PipelineLead | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [lostReason, setLostReason] = useState("FEE_TOO_HIGH");
  const [lostNotes, setLostNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admissions/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "LOST",
          status: "REJECTED",
          lostReason,
          lostNotes: lostNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not mark as lost — please try again.");
      }

      const reasonLabel = LOST_REASONS.find((r) => r.value === lostReason)?.label || lostReason;
      await fetch(`/api/admissions/${lead.id}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counsellor: lead.assignedTo || "Academic Counsellor",
          callStatus: "DROPPED",
          notes: `Lead marked as LOST. Reason: ${reasonLabel}. ${lostNotes ? `Remarks: ${lostNotes}` : ""}`.trim(),
          nextStage: "LOST",
        }),
      }).catch(() => {});

      if (onSuccess) onSuccess();
      onClose();
      setLostNotes("");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Could not save — check connection and try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const selectedHint = LOST_REASONS.find((r) => r.value === lostReason)?.hint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scholar-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-0 shadow-2xl overflow-hidden border border-scholar-100">
        <div className="flex items-center justify-between border-b border-scholar-100 bg-amber-50/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <AlertOctagon size={18} />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-ink">Mark as Lost — Archive Lead?</h3>
              <p className="text-[11px] font-medium text-scholar-500">
                For {lead.applicantName} · helps you track why leads don&apos;t convert
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-scholar-400 hover:bg-white hover:text-ink border border-transparent hover:border-scholar-200">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
            <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-blue-900">What happens?</p>
              <ul className="mt-1 list-disc pl-4 text-blue-800 space-y-0.5 font-medium">
                <li>Moves lead to <strong>Lost</strong> (visible under <em>All Leads → Lost</em>)</li>
                <li>Stops daily follow-up reminders for this lead</li>
                <li>You can still <strong>re-open</strong> it later by changing stage — nothing is deleted</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-scholar-700">Why did this lead not convert? *</label>
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              >
                {LOST_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-scholar-500">
                <Info size={11} /> {selectedHint}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-scholar-700">
                Add a short note <span className="font-normal text-scholar-400">(optional but helpful)</span>
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Father said fee is 20% higher than nearby institute; open to discount next session. Follow up in 2 months."
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white p-3 text-xs font-medium text-ink outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 placeholder:text-scholar-300"
              />
              <p className="mt-1 text-[11px] text-scholar-400">This note appears in reports and helps improve conversion next time</p>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <Archive size={14} className="mt-0.5 shrink-0 text-amber-700" />
              <p className="text-[11px] font-medium leading-relaxed text-amber-800">
                This does <strong>not delete</strong> the lead. It just archives it so your <strong>Follow-ups Due</strong> stays clean. You can change the stage back to <em>New</em> or <em>Contacted</em> anytime.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-scholar-200 bg-white py-3 text-xs font-bold text-scholar-700 hover:bg-scholar-50"
              >
                Keep as is — don&apos;t archive
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-scholar-800 py-3 text-xs font-bold text-white hover:bg-scholar-900 disabled:opacity-50 shadow-sm"
                title="This archives the lead as Lost — you can still find it under All Leads and re-open it"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {loading ? "Saving..." : "Yes, mark as Lost"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
