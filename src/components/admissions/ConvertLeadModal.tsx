"use client";

import { useEffect, useState } from "react";
import { X, GraduationCap, Check, Loader2, Info, ShieldCheck, Wallet } from "lucide-react";
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
  const remaining = totalFee && initialPaidAmount ? Number(totalFee) - Number(initialPaidAmount) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalFee || Number(totalFee) <= 0) {
      setError("Please enter the total course fee — e.g., 45000. It should be greater than 0.");
      return;
    }
    if (initialPaidAmount && Number(initialPaidAmount) > Number(totalFee)) {
      setError("Advance payment cannot be more than total fee. Please check the numbers.");
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
        throw new Error(data.error || "Could not enroll student. Please try again.");
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Could not enroll — please check your connection and try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scholar-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-0 shadow-2xl overflow-hidden border border-scholar-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-scholar-100 px-6 py-4 bg-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-ink">Admit Student — Confirm Enrollment</h3>
              <p className="text-[11px] font-medium text-scholar-500">
                {lead.applicantName} will become a student
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-scholar-400 hover:bg-white hover:text-ink border border-transparent hover:border-scholar-200">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Guided explanation */}
          <div className="flex gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
            <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-blue-900">What happens when you tap “Confirm Admission”?</p>
              <ul className="mt-1 list-disc pl-4 text-blue-800 space-y-0.5 font-medium">
                <li>Creates a <strong>student record</strong> with fee plan</li>
                <li>Moves lead to <strong>Admitted</strong> (you’ll see it under All Leads → Admitted)</li>
                <li>You can still edit fee/batch later from Students page</li>
              </ul>
            </div>
          </div>

          {/* Lead summary */}
          <div className="rounded-xl border border-scholar-100 bg-scholar-50/60 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink">{lead.applicantName}</p>
              <p className="text-[11px] text-scholar-500">
                {lead.mobile} {lead.email ? `· ${lead.email}` : ""} · {lead.course.name}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800 border border-emerald-200">Enrolling</span>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-scholar-700">Choose Course *</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink outline-none focus:border-scholar-400 focus:ring-2 focus:ring-scholar-100"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-scholar-400">Check twice — course decides fee plan</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-scholar-700">Assign Batch <span className="font-normal text-scholar-400">(optional)</span></label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink outline-none focus:border-scholar-400 focus:ring-2 focus:ring-scholar-100"
                >
                  <option value="">No batch yet — assign later</option>
                  {courseBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-scholar-400">You can assign batch later from Students page</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-scholar-700">
                <Wallet size={12} className="text-scholar-500" /> Total Course Fee (₹) *
              </label>
              <input
                required
                type="number"
                min="1"
                value={totalFee}
                onChange={(e) => setTotalFee(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none focus:border-scholar-400 focus:ring-2 focus:ring-scholar-100"
                placeholder="e.g., 45000"
              />
              <p className="mt-1 text-[10px] text-scholar-400">Standard fee for selected course. Edit if you gave a discount.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-scholar-100 pt-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-scholar-700">Advance Paid Today (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 if no advance"
                  value={initialPaidAmount}
                  onChange={(e) => setInitialPaidAmount(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink outline-none focus:border-scholar-400 focus:ring-2 focus:ring-scholar-100"
                />
                <p className="mt-1 text-[10px] text-scholar-400">Leave 0 if student will pay later</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-scholar-700">How did they pay?</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink outline-none focus:border-scholar-400 focus:ring-2 focus:ring-scholar-100"
                >
                  <option value="Cash">Cash — handed at counter</option>
                  <option value="UPI / QR">UPI / QR — phone scan</option>
                  <option value="Bank Transfer">Bank Transfer — online</option>
                  <option value="Card">Card — swipe machine</option>
                  <option value="Cheque">Cheque — will clear later</option>
                </select>
              </div>
            </div>

            {remaining !== null && Number(totalFee) > 0 && (
              <div className="rounded-xl border border-scholar-100 bg-scholar-50 px-3 py-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-scholar-600">Balance due after this payment:</span>
                <span className="font-bold text-ink">₹{remaining.toLocaleString("en-IN")}</span>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-700" />
              <p className="text-[11px] font-medium leading-relaxed text-emerald-800">
                By confirming, you agree fee and course are correct. You can still <strong>edit the student later</strong> if needed. The student will appear in <strong>Students</strong> and fee reports immediately.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-scholar-200 bg-white py-3 text-xs font-bold text-scholar-700 hover:bg-scholar-50"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                title="This will create a student record and move the lead to Admitted — you can undo by editing the student"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {loading ? "Enrolling..." : "Yes, Admit Student"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
