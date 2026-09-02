"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Split } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/utils";
import { useRazorpayCheckout } from "@/lib/useRazorpayCheckout";
import type { FeeInstallment } from "@/lib/installments";

type Student = {
  id: string;
  name: string;
  totalFee: string;
  paidFee: string;
  installmentPlan?: any;
};

export function RecordPaymentDrawer({
  open,
  onClose,
  students,
  preselectedInstallmentNumber,
}: {
  open: boolean;
  onClose: () => void;
  students: Student[];
  preselectedInstallmentNumber?: number;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [targetInstallment, setTargetInstallment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { pay, processing, payError } = useRazorpayCheckout();

  useEffect(() => {
    if (students.length > 0 && !studentId) {
      setStudentId(students[0].id);
    }
  }, [students, studentId]);

  const selected = students.find((s) => s.id === studentId);
  const outstanding = selected ? Math.max(Number(selected.totalFee) - Number(selected.paidFee), 0) : 0;

  const rawInstallments = selected?.installmentPlan;
  const installmentsList: FeeInstallment[] = Array.isArray(rawInstallments) ? rawInstallments : [];

  // When preselectedInstallmentNumber or selected student changes
  useEffect(() => {
    if (preselectedInstallmentNumber && installmentsList.length > 0) {
      const match = installmentsList.find((i) => i.installmentNumber === preselectedInstallmentNumber);
      if (match) {
        setTargetInstallment(String(match.installmentNumber));
        const rem = Math.max(0, match.amount - match.paidAmount);
        setAmount(String(rem));
        setNote(`Payment for ${match.title}`);
        return;
      }
    }

    // Default to first pending installment if available
    if (installmentsList.length > 0) {
      const firstPending = installmentsList.find((i) => i.status !== "PAID");
      if (firstPending) {
        setTargetInstallment(String(firstPending.installmentNumber));
        const rem = Math.max(0, firstPending.amount - firstPending.paidAmount);
        setAmount(String(rem));
        setNote(`Payment for ${firstPending.title}`);
      }
    } else {
      setTargetInstallment("");
    }
  }, [selected?.id, preselectedInstallmentNumber, open]);

  const handleInstallmentSelect = (instNumStr: string) => {
    setTargetInstallment(instNumStr);
    if (!instNumStr) return;
    const match = installmentsList.find((i) => i.installmentNumber === Number(instNumStr));
    if (match) {
      const rem = Math.max(0, match.amount - match.paidAmount);
      setAmount(String(rem));
      setNote(`Payment for ${match.title}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!studentId || !amount || Number(amount) <= 0) {
      setError("Choose a student and enter a valid amount.");
      return;
    }
    setLoading(true);
    try {
      const targetInst = installmentsList.find((i) => i.installmentNumber === Number(targetInstallment));

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          amount: Number(amount),
          method,
          note: note || null,
          installmentNumber: targetInst ? targetInst.installmentNumber : null,
          installmentTitle: targetInst ? targetInst.title : null,
        }),
      });
      if (!res.ok) throw new Error();
      setAmount("");
      setNote("");
      onClose();
      router.refresh();
    } catch {
      setError("Could not record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async () => {
    setError("");
    if (!studentId || !amount || Number(amount) <= 0) {
      setError("Choose a student and enter a valid amount before paying online.");
      return;
    }
    await pay({
      studentId,
      studentName: selected?.name ?? "Student",
      amount: Number(amount),
      purpose: "fee",
      onSuccess: () => {
        setAmount("");
        setNote("");
        onClose();
        router.refresh();
      },
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title="Record Student Payment">
      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        {(error || payError) && (
          <p className="rounded-xl bg-danger-50 px-3 py-2.5 text-xs text-danger-600 font-medium">{error || payError}</p>
        )}

        <Field label="Student">
          <select
            required
            className={inputClass}
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setAmount("");
            }}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (Outstanding: {formatCurrency(Math.max(0, Number(s.totalFee) - Number(s.paidFee)))})
              </option>
            ))}
          </select>
        </Field>

        {selected && (
          <div className="rounded-xl border border-marigold-200 bg-marigold-50/60 p-3 text-xs text-marigold-800 space-y-1">
            <div className="flex justify-between font-semibold">
              <span>Total Course Fee:</span>
              <span>{formatCurrency(selected.totalFee)}</span>
            </div>
            <div className="flex justify-between text-success-700 font-semibold">
              <span>Paid So Far:</span>
              <span>{formatCurrency(selected.paidFee)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-marigold-200/60 pt-1 text-ink">
              <span>Outstanding Due:</span>
              <span className="text-danger-700">{formatCurrency(outstanding)}</span>
            </div>
          </div>
        )}

        {/* Installment Allocation Selector if student has installment plan */}
        {installmentsList.length > 0 && (
          <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-3 space-y-2">
            <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
              <Split size={14} className="text-scholar-600" />
              Apply Payment to Installment:
            </label>
            <select
              className={inputClass}
              value={targetInstallment}
              onChange={(e) => handleInstallmentSelect(e.target.value)}
            >
              <option value="">Auto-allocate (Earliest Unpaid)</option>
              {installmentsList.map((inst) => {
                const balance = Math.max(0, inst.amount - inst.paidAmount);
                return (
                  <option key={inst.id} value={inst.installmentNumber}>
                    {inst.title} — Due: {formatCurrency(balance)} [{inst.status}]
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <Field label="Amount Received (₹)">
          <input
            required
            type="number"
            min={1}
            className={`${inputClass} font-bold text-ink`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </Field>

        <button
          type="button"
          onClick={handlePayOnline}
          disabled={processing}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-scholar-600 py-2.5 text-xs font-semibold text-scholar-600 hover:bg-scholar-50 disabled:opacity-60 transition-colors shadow-xs"
        >
          <CreditCard size={15} /> {processing ? "Opening Razorpay..." : "Pay Online via Razorpay / UPI"}
        </button>

        <div className="flex items-center gap-3 text-[11px] text-scholar-400">
          <div className="h-px flex-1 bg-scholar-200" /> or record offline / manual payment <div className="h-px flex-1 bg-scholar-200" />
        </div>

        <Field label="Payment Method">
          <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / QR Code</option>
            <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
            <option value="Cheque">Cheque / DD</option>
            <option value="Card">Credit / Debit Card</option>
          </select>
        </Field>

        <Field label="Note / Remarks (Optional)">
          <textarea
            className={inputClass}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Installment 1 receipt #4829"
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-xs font-semibold text-scholar-600 hover:bg-scholar-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-60 shadow-xs"
          >
            {loading ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
