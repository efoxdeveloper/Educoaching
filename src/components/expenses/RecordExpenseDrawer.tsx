"use client";

import { useEffect, useState } from "react";
import { X, Receipt, Check } from "lucide-react";

export const EXPENSE_CATEGORIES = [
  { value: "RENT", label: "Premises Rent", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "SALARIES", label: "Faculty & Staff Salaries", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "UTILITIES", label: "Electricity & Utilities", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "MARKETING", label: "Marketing & Advertising", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "MAINTENANCE", label: "Repairs & Maintenance", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "STATIONERY_SUPPLIES", label: "Stationery & Supplies", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "EQUIPMENT_SOFTWARE", label: "Software & Hardware", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "EVENT", label: "Workshops & Events", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "REFUND", label: "Student Fee Refund", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "OTHER", label: "Miscellaneous / Other", color: "bg-gray-50 text-gray-700 border-gray-200" },
];

export const PAYMENT_METHODS = [
  "Cash",
  "UPI / QR",
  "Bank Transfer (NEFT/IMPS)",
  "Cheque",
  "Debit / Credit Card",
];

export type ExpenseRecord = {
  id: string;
  title: string;
  amount: string;
  category: string;
  paymentMethod: string;
  expenseDate: string;
  paidTo: string | null;
  notes: string | null;
};

export function RecordExpenseDrawer({
  open,
  onClose,
  onSaved,
  initialExpense,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialExpense?: ExpenseRecord | null;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidTo, setPaidTo] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialExpense) {
      setTitle(initialExpense.title);
      setAmount(initialExpense.amount);
      setCategory(initialExpense.category);
      setPaymentMethod(initialExpense.paymentMethod);
      setExpenseDate(initialExpense.expenseDate.split("T")[0]);
      setPaidTo(initialExpense.paidTo || "");
      setNotes(initialExpense.notes || "");
    } else {
      setTitle("");
      setAmount("");
      setCategory("OTHER");
      setPaymentMethod("Cash");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      setPaidTo("");
      setNotes("");
    }
    setError(null);
  }, [initialExpense, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError("Please provide a valid title and positive amount.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      title: title.trim(),
      amount: Number(amount),
      category,
      paymentMethod,
      expenseDate,
      paidTo: paidTo.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      const url = initialExpense ? `/api/expenses/${initialExpense.id}` : "/api/expenses";
      const method = initialExpense ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save expense");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-scholar-950/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-scholar-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
              <Receipt size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                {initialExpense ? "Edit Expense" : "Record Expense"}
              </h2>
              <p className="text-xs text-scholar-500">Track institute operational and facility costs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-50 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between overflow-y-auto p-6">
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-scholar-700">
                Expense Title / Description *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. October Centre Rent, Faculty Honorarium"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-scholar-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-scholar-700">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-scholar-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-scholar-700">Date *</label>
                <input
                  required
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-scholar-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-scholar-700">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-scholar-500"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-scholar-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-scholar-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-scholar-700">Paid To (Payee)</label>
                <input
                  type="text"
                  placeholder="e.g. Landlord, Dr. Sharma, Airtel"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-scholar-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-scholar-700">Notes / Bill Ref No</label>
              <textarea
                rows={3}
                placeholder="Optional invoice number, payment transaction reference, or remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-scholar-500"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3 border-t border-scholar-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-scholar-200 bg-white py-2.5 text-sm font-semibold text-scholar-700 hover:bg-scholar-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-50"
            >
              <Check size={16} />
              {loading ? "Saving..." : initialExpense ? "Update Expense" : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
