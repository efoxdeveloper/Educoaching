"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Calendar } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RENEWAL_PERIOD_DAYS, QUARTERLY_RENEWAL_PERIOD_DAYS, ANNUAL_RENEWAL_PERIOD_DAYS } from "@/lib/subscription";
import { useRazorpayCheckout } from "@/lib/useRazorpayCheckout";

type Student = {
  id: string;
  name: string;
  monthlyAmount: string | null;
  quarterlyAmount?: string | null;
  currentPeriodEnd: string | null;
  plan: string;
};

export function RenewDrawer({
  open,
  onClose,
  students,
  preselectedStudentId,
}: {
  open: boolean;
  onClose: () => void;
  students: Student[];
  preselectedStudentId?: string;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(preselectedStudentId || students[0]?.id || "");
  const [planType, setPlanType] = useState<"MONTHLY" | "QUARTERLY" | "ANNUAL">("MONTHLY");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { pay, processing, payError } = useRazorpayCheckout();

  const selected = students.find((s) => s.id === studentId);

  useEffect(() => {
    if (selected) {
      if (selected.plan === "QUARTERLY") {
        setPlanType("QUARTERLY");
        setAmount(selected.quarterlyAmount || (selected.monthlyAmount ? String(Number(selected.monthlyAmount) * 3) : ""));
      } else {
        setPlanType("MONTHLY");
        setAmount(selected.monthlyAmount || "");
      }
    }
  }, [selected, open]);

  const handlePlanTypeChange = (type: "MONTHLY" | "QUARTERLY" | "ANNUAL") => {
    setPlanType(type);
    if (!selected) return;
    if (type === "QUARTERLY") {
      setAmount(selected.quarterlyAmount || (selected.monthlyAmount ? String(Number(selected.monthlyAmount) * 3) : ""));
    } else if (type === "MONTHLY") {
      setAmount(selected.monthlyAmount || "");
    } else if (type === "ANNUAL") {
      setAmount(selected.monthlyAmount ? String(Number(selected.monthlyAmount) * 12) : "");
    }
  };

  const periodDays =
    planType === "QUARTERLY"
      ? QUARTERLY_RENEWAL_PERIOD_DAYS
      : planType === "ANNUAL"
      ? ANNUAL_RENEWAL_PERIOD_DAYS
      : RENEWAL_PERIOD_DAYS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!studentId || !amount || Number(amount) <= 0) {
      setError("Choose a student and enter a valid renewal amount.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          amount: Number(amount),
          method,
          planType,
        }),
      });
      if (!res.ok) throw new Error();
      setAmount("");
      onClose();
      router.refresh();
    } catch {
      setError("Could not process renewal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async () => {
    setError("");
    if (!studentId || !amount || Number(amount) <= 0) {
      setError("Choose a student and enter a valid renewal amount before paying online.");
      return;
    }
    await pay({
      studentId,
      studentName: selected?.name ?? "Student",
      amount: Number(amount),
      purpose: "renewal",
      onSuccess: () => {
        setAmount("");
        onClose();
        router.refresh();
      },
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title="Renew Subscription">
      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        {(error || payError) && (
          <p className="rounded-xl bg-danger-50 px-3 py-2.5 text-xs text-danger-600 font-medium">{error || payError}</p>
        )}

        <Field label="Student">
          <select
            required
            className={inputClass}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.plan === "QUARTERLY" ? "Quarterly" : s.plan === "DEMO" ? "Demo" : "Monthly"})
              </option>
            ))}
          </select>
        </Field>

        {/* Renewal Plan Cycle */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-3 space-y-2">
          <label className="text-xs font-bold text-scholar-800 flex items-center justify-between">
            <span>Renewal Billing Cycle</span>
            <span className="text-[10px] text-scholar-500 font-normal">Extends access by {periodDays} days</span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handlePlanTypeChange("MONTHLY")}
              className={`rounded-lg py-2 px-2 text-xs font-semibold border transition-all text-center ${
                planType === "MONTHLY"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Monthly
              <span className="block text-[10px] opacity-80">(+30 Days)</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlanTypeChange("QUARTERLY")}
              className={`rounded-lg py-2 px-2 text-xs font-semibold border transition-all text-center ${
                planType === "QUARTERLY"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Quarterly
              <span className="block text-[10px] opacity-80">(+90 Days / 3 Mo)</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlanTypeChange("ANNUAL")}
              className={`rounded-lg py-2 px-2 text-xs font-semibold border transition-all text-center ${
                planType === "ANNUAL"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Annual
              <span className="block text-[10px] opacity-80">(+365 Days)</span>
            </button>
          </div>
        </div>

        {selected && (
          <p className="rounded-xl bg-scholar-50 p-3 text-xs text-scholar-600 flex items-center gap-1.5">
            <Calendar size={14} className="text-scholar-500 shrink-0" />
            <span>
              {selected.plan === "DEMO"
                ? "Currently on 7-Day Demo. "
                : selected.currentPeriodEnd
                ? `Current period ends ${formatDate(selected.currentPeriodEnd)}. `
                : "No active period set. "}
              Renewing will grant <strong>{periodDays} days</strong> of continuous access.
            </span>
          </p>
        )}

        <Field label={`Renewal Amount (₹) — ${planType === "QUARTERLY" ? "Quarterly Fee (3 Months)" : planType === "ANNUAL" ? "Annual Fee (1 Year)" : "Monthly Fee"}`}>
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
          <CreditCard size={15} /> {processing ? "Opening payment gateway..." : "Pay Online via Razorpay / UPI"}
        </button>

        <div className="flex items-center gap-3 text-[11px] text-scholar-400">
          <div className="h-px flex-1 bg-scholar-200" /> or record offline / manual renewal <div className="h-px flex-1 bg-scholar-200" />
        </div>

        <Field label="Payment Method">
          <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / QR Code</option>
            <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
            <option value="Card">Card</option>
            <option value="Cheque">Cheque</option>
          </select>
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
            {loading ? "Recording..." : "Confirm Renewal"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
