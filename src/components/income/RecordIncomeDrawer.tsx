"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp, Check } from "lucide-react";

export const INCOME_CATEGORIES = [
  { value: "BOOK_SALES", label: "Books & Study Kits", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "HALL_RENTAL", label: "Classroom / Hall Rental", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "DONATION", label: "Trust & Donations", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "FRANCHISE_FEE", label: "Franchise & Royalty Fees", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "LATE_FEE_PENALTY", label: "Late Fees & Fine Penalties", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "UNIFORM_BAGS", label: "Uniforms & Bags / Merch", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "EXAM_FEES", label: "External Exam Fees", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "CONSULTING", label: "Career Counselling Fees", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { value: "SPONSORSHIP", label: "Corporate Sponsorships", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "OTHER", label: "Other Non-Fee Revenue", color: "bg-gray-50 text-gray-700 border-gray-200" },
];

export const INCOME_PAYMENT_METHODS = [
  "Cash",
  "UPI / QR",
  "Bank Transfer (NEFT/IMPS)",
  "Cheque",
  "Debit / Credit Card",
];

export type IncomeRecord = {
  id: string;
  title: string;
  amount: string;
  category: string;
  paymentMethod: string;
  incomeDate: string;
  receivedFrom: string | null;
  notes: string | null;
};

export function RecordIncomeDrawer({
  open,
  onClose,
  onSaved,
  initialIncome,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialIncome?: IncomeRecord | null;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split("T")[0]);
  const [receivedFrom, setReceivedFrom] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialIncome) {
      setTitle(initialIncome.title);
      setAmount(initialIncome.amount);
      setCategory(initialIncome.category);
      setPaymentMethod(initialIncome.paymentMethod);
      setIncomeDate(initialIncome.incomeDate.split("T")[0]);
      setReceivedFrom(initialIncome.receivedFrom || "");
      setNotes(initialIncome.notes || "");
    } else {
      setTitle("");
      setAmount("");
      setCategory("OTHER");
      setPaymentMethod("Cash");
      setIncomeDate(new Date().toISOString().split("T")[0]);
      setReceivedFrom("");
      setNotes("");
    }
    setError(null);
  }, [initialIncome, open]);

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
      incomeDate,
      receivedFrom: receivedFrom.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      const url = initialIncome ? `/api/income/${initialIncome.id}` : "/api/income";
      const method = initialIncome ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save income record.");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record income.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-scholar-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="font-display font-bold text-ink">
                {initialIncome ? "Edit Extra Income" : "Record Extra Income"}
              </h2>
              <p className="text-xs text-scholar-500">
                {initialIncome
                  ? "Update this revenue entry's details"
                  : "Log non-fee income, book sales, rentals & fines"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-scholar-400 hover:bg-scholar-50 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-scholar-700 mb-1">
              Income Title / Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Physics Question Bank sales to Batch A"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 px-3.5 py-2 text-xs text-ink placeholder:text-scholar-400 focus:border-scholar-500 focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-scholar-700 mb-1">
                Amount Received (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="₹ 0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 px-3.5 py-2 text-xs font-semibold text-ink placeholder:text-scholar-400 focus:border-scholar-500 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-scholar-700 mb-1">
                Receipt Date *
              </label>
              <input
                type="date"
                required
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 px-3.5 py-2 text-xs text-ink focus:border-scholar-500 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-scholar-700 mb-1.5">
              Income Category *
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1 rounded-xl border border-scholar-100 bg-scholar-50/20">
              {INCOME_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center justify-between rounded-lg border p-2 text-left text-xs transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/80 font-bold text-emerald-950 shadow-2xs"
                        : "border-transparent bg-white text-scholar-600 hover:border-scholar-200"
                    }`}
                  >
                    <span className="truncate">{cat.label}</span>
                    {isSelected && <Check size={13} className="text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-scholar-700 mb-1">
              Payment Method *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INCOME_PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-scholar-100 text-scholar-700 hover:bg-scholar-200"
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Received From */}
          <div>
            <label className="block text-xs font-semibold text-scholar-700 mb-1">
              Received From / Payer Name
            </label>
            <input
              type="text"
              placeholder="e.g. Oxford Book Store / Dr. V. Patel"
              value={receivedFrom}
              onChange={(e) => setReceivedFrom(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 px-3.5 py-2 text-xs text-ink placeholder:text-scholar-400 focus:border-scholar-500 focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-scholar-700 mb-1">
              Additional Notes / Invoice Reference
            </label>
            <textarea
              rows={2}
              placeholder="Optional remarks, cheque number, or transaction ID..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 px-3.5 py-2 text-xs text-ink placeholder:text-scholar-400 focus:border-scholar-500 focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-scholar-100 px-6 py-4 bg-scholar-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-scholar-200 bg-white px-4 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? "Saving..." : initialIncome ? "Update Income" : "Save Revenue Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
