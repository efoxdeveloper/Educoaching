"use client";

import { useState } from "react";
import { X, AlertOctagon, Check, Loader2 } from "lucide-react";
import type { PipelineLead } from "./LeadPipelineBoard";

export const LOST_REASONS = [
  { value: "FEE_TOO_HIGH", label: "Fee Too High / Budget Constraint" },
  { value: "TIMING_CLASH", label: "Batch Timing Clash / School Clash" },
  { value: "DISTANCE_ISSUE", label: "Location Too Far / Travel Issue" },
  { value: "JOINED_COMPETITOR", label: "Joined Competitor Institute" },
  { value: "DECIDED_AGAINST", label: "Postponed / Decided Not to Prepare" },
  { value: "UNRESPONSIVE", label: "Unresponsive After 3+ Calls" },
  { value: "OTHER", label: "Other / Unspecified" },
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
      // 1. Update admission status & lost details
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
        throw new Error(data.error || "Failed to mark lead as lost");
      }

      // 2. Log in follow-up trail
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to close lead";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scholar-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-paper p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
              <AlertOctagon size={18} />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">Mark Lead as Lost</h3>
              <p className="text-[11px] text-scholar-400">
                Record the reason for {lead.applicantName} to improve conversion analytics
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-scholar-400 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-scholar-700">Lost Reason *</label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-scholar-500"
            >
              {LOST_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-scholar-700">
              Additional Feedback / Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Student found fee 20% higher than local institute; willing to reconsider if discount offered in next session..."
              value={lostNotes}
              onChange={(e) => setLostNotes(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white p-2.5 text-xs text-ink outline-none focus:border-scholar-500"
            />
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-scholar-200 py-2.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Mark as Lost
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
