"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { PipelineLead } from "./LeadPipelineBoard";

export function ScheduleDemoDrawer({
  lead,
  open,
  onClose,
  onSuccess,
  batches,
}: {
  lead: PipelineLead | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  batches: { id: string; name: string; courseId: string }[];
}) {
  const [demoDate, setDemoDate] = useState("");
  const [batchId, setBatchId] = useState("");
  const [demoStatus, setDemoStatus] = useState("SCHEDULED");
  const [demoFeedback, setDemoFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (lead) {
      setDemoDate(lead.demoDate ? lead.demoDate.split("T")[0] : "");
      setBatchId(lead.batch?.id || "");
      setDemoStatus(lead.demoStatus || "SCHEDULED");
      setDemoFeedback(lead.demoFeedback || "");
      setError("");
    }
  }, [lead, open]);

  const courseBatches = batches.filter((b) => !lead || b.courseId === lead.course.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!demoDate) {
      setError("Please pick a demo date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Update Admission record
      const res = await fetch(`/api/admissions/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demoDate,
          demoStatus,
          demoFeedback: demoFeedback.trim() || null,
          batchId: batchId || undefined,
          stage: demoStatus === "ATTENDED" ? "COUNSELLING" : "DEMO_SCHEDULED",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update demo details");
      }

      // 2. Also log a follow-up note so the timeline shows the demo activity
      await fetch(`/api/admissions/${lead.id}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counsellor: lead.assignedTo || "Academic Coordinator",
          callStatus: demoStatus === "ATTENDED" ? "DEMO_ATTENDED" : "DEMO_BOOKED",
          notes: `Demo class status: ${demoStatus}. ${demoFeedback ? `Feedback: ${demoFeedback}` : ""}`.trim(),
          scheduledAt: demoDate,
          nextStage: demoStatus === "ATTENDED" ? "COUNSELLING" : "DEMO_SCHEDULED",
        }),
      }).catch(() => {});

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update demo details";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Schedule & Track Demo Class"
    >
      {lead && (
        <p className="mb-4 text-xs text-scholar-500">
          Trial session for <strong className="text-ink">{lead.applicantName}</strong> ({lead.course.name})
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <Field label="Demo Class Date *">
          <input
            id="demoDate"
            type="date"
            required
            value={demoDate}
            onChange={(e) => setDemoDate(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Target Batch for Demo">
          <select
            id="batchId"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className={inputClass}
          >
            <option value="">Choose batch...</option>
            {courseBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Demo Attendance Status">
          <select
            id="demoStatus"
            value={demoStatus}
            onChange={(e) => setDemoStatus(e.target.value)}
            className={inputClass}
          >
            <option value="SCHEDULED">🗓️ Scheduled (Upcoming)</option>
            <option value="ATTENDED">✅ Attended (Positive feedback)</option>
            <option value="MISSED">⚠️ Missed (Did not attend)</option>
            <option value="RESCHEDULED">🔄 Rescheduled</option>
            <option value="CANCELLED">❌ Cancelled</option>
          </select>
        </Field>

        <Field label="Demo Feedback & Faculty Remarks">
          <textarea
            id="demoFeedback"
            rows={3}
            value={demoFeedback}
            onChange={(e) => setDemoFeedback(e.target.value)}
            placeholder="e.g. Student found physics lecture very clear; requested fee discount before confirming enrollment..."
            className={inputClass}
          />
        </Field>

        <div className="mt-4 flex gap-2">
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Save Demo Details
          </button>
        </div>
      </form>
    </Drawer>
  );
}
