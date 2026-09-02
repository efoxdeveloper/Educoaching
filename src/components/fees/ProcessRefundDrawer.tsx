"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
  totalFee: string;
  paidFee: string;
};

export function ProcessRefundDrawer({
  open,
  onClose,
  students,
  targetStudentId,
}: {
  open: boolean;
  onClose: () => void;
  students: Student[];
  targetStudentId?: string;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(targetStudentId || students[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("Cash Refund");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (targetStudentId) {
      setStudentId(targetStudentId);
    } else if (students.length > 0 && !studentId) {
      setStudentId(students[0].id);
    }
  }, [targetStudentId, students, studentId]);

  const selected = students.find((s) => s.id === studentId);
  const maxRefundable = selected ? Number(selected.paidFee || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const refundNum = Number(amount);
    if (!studentId || !refundNum || refundNum <= 0) {
      setError("Please select a student and enter a valid refund amount.");
      return;
    }

    if (refundNum > maxRefundable) {
      setError(`Cannot refund more than total collected fees (${formatCurrency(maxRefundable)}).`);
      return;
    }

    if (!reason || !reason.trim()) {
      setError("A clear reason for the refund is mandatory.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          amount: refundNum,
          reason: reason.trim(),
          method,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund.");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process refund.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Process Fee Refund / Credit Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-danger-50 border border-danger-200 p-3 text-xs text-danger-700 flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            Refund processed successfully! Credit receipt generated and balance updated.
          </div>
        )}

        <Field label="Student">
          <select
            className={inputClass}
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setAmount("");
            }}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (Paid: {formatCurrency(Number(s.paidFee))})
              </option>
            ))}
          </select>
        </Field>

        {selected && (
          <div className="rounded-xl border border-scholar-200 bg-scholar-50 p-3 text-xs flex items-center justify-between">
            <span className="text-scholar-600 font-medium">Max Refundable Amount:</span>
            <span className="font-bold text-ink font-mono">{formatCurrency(maxRefundable)}</span>
          </div>
        )}

        <Field label="Refund Amount (INR)">
          <input
            type="number"
            min={1}
            max={maxRefundable}
            step="any"
            className={inputClass}
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>

        <Field label="Refund Mode">
          <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="Cash Refund">Cash Refund</option>
            <option value="Bank Transfer">Bank Transfer / NEFT</option>
            <option value="UPI Refund">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="Razorpay Refund">Online Payment Gateway</option>
          </select>
        </Field>

        <Field label="Reason for Refund (Mandatory)">
          <textarea
            rows={3}
            className={inputClass}
            placeholder="e.g. Course withdrawal within cooling-off period / batch timing conflict..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </Field>

        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-200 py-2.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || maxRefundable <= 0}
            className="flex-1 rounded-xl bg-danger-600 py-2.5 text-xs font-bold text-white hover:bg-danger-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            <span>{loading ? "Processing..." : "Issue Refund"}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
