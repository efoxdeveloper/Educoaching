"use client";

import { useEffect, useState } from "react";
import { X, GraduationCap, Check, Loader2 } from "lucide-react";
import type { PipelineLead } from "./LeadPipelineBoard";

export function ConvertLeadModal({
  lead,
  open,
  onClose,
  onSuccess,
  courses,
  batches,
}: {
  lead: PipelineLead | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  courses: { id: string; name: string; fee: string }[];
  batches: { id: string; name: string; courseId: string }[];
}) {
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [totalFee, setTotalFee] = useState("");
  const [initialPaidAmount, setInitialPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (lead) {
      setCourseId(lead.course.id);
      setBatchId(lead.batch?.id || "");
      setTotalFee(lead.feePlan.toString());
      setInitialPaidAmount("");
      setPaymentMethod("Cash");
      setError("");
    }
  }, [lead, open]);

  if (!open || !lead) return null;

  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    const c = courses.find((c) => c.id === newCourseId);
    if (c) setTotalFee(c.fee);
    setBatchId("");
  };

  const courseBatches = batches.filter((b) => b.courseId === courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalFee || Number(totalFee) <= 0) {
      setError("Please set a valid positive total fee plan.");
      return;
    }

    if (initialPaidAmount && Number(initialPaidAmount) > Number(totalFee)) {
      setError("Initial paid amount cannot exceed total fee plan.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admissions/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          batchId: batchId || undefined,
          feePlan: Number(totalFee),
          stage: "ENROLLED",
          status: "ENROLLED",
          initialPaidAmount: initialPaidAmount ? Number(initialPaidAmount) : 0,
          paymentMethod,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to convert lead to admission");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Conversion failed";
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">Convert to Enrolled Student</h3>
              <p className="text-[11px] text-scholar-400">
                Enroll {lead.applicantName} and create student account
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
          <div className="rounded-xl border border-scholar-100 bg-scholar-50/60 p-3 text-xs">
            <p className="font-semibold text-ink">{lead.applicantName}</p>
            <p className="text-scholar-500">
              Mobile: {lead.mobile} {lead.email ? `• ${lead.email}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-scholar-700">Course *</label>
              <select
                required
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-scholar-500"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-scholar-700">Batch</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-scholar-500"
              >
                <option value="">Assign later</option>
                {courseBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-scholar-700">Total Course Fee Plan (₹) *</label>
            <input
              required
              type="number"
              min="1"
              value={totalFee}
              onChange={(e) => setTotalFee(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-scholar-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-scholar-100 pt-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-scholar-700">Initial Payment (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="Optional deposit"
                value={initialPaidAmount}
                onChange={(e) => setInitialPaidAmount(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-scholar-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-scholar-700">Payment Mode</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-scholar-500"
              >
                <option value="Cash">Cash</option>
                <option value="UPI / QR">UPI / QR</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
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
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Confirm Admission
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
