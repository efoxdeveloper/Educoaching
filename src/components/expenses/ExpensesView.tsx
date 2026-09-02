"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Receipt,
  Plus,
  Search,
  Download,
  CreditCard,
  Banknote,
  TrendingDown,
  Edit2,
  Trash2,
  PieChart,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  RecordExpenseDrawer,
  EXPENSE_CATEGORIES,
  type ExpenseRecord,
} from "./RecordExpenseDrawer";

type ExpenseSummary = {
  filteredTotal: number;
  thisMonthTotal: number;
  allTimeTotal: number;
  categoryBreakdown: Record<string, { total: number; count: number }>;
  cashOutflow: number;
  digitalOutflow: number;
};

export function ExpensesView() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [datePreset, setDatePreset] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH">("THIS_MONTH");

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      if (methodFilter) params.set("paymentMethod", methodFilter);
      if (query.trim()) params.set("search", query.trim());

      const now = new Date();
      if (datePreset === "THIS_MONTH") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
        params.set("startDate", start);
        params.set("endDate", end);
      } else if (datePreset === "LAST_MONTH") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
        const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
        params.set("startDate", start);
        params.set("endDate", end);
      }

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();
      if (data.expenses) setExpenses(data.expenses);
      if (data.summary) setSummary(data.summary);
    } catch {
      console.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, methodFilter, datePreset, query]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expenseToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenseToDelete(null);
        fetchExpenses();
      }
    } catch {
      console.error("Failed to delete expense");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (expenses.length === 0) return;
    const headers = ["Title", "Category", "Amount (INR)", "Date", "Paid To", "Payment Method", "Notes"];
    const rows = expenses.map((e) => [
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.amount,
      `"${e.expenseDate.split("T")[0]}"`,
      `"${(e.paidTo || "").replace(/"/g, '""')}"`,
      `"${e.paymentMethod}"`,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categoryMeta = useMemo(() => {
    const map = new Map<string, { label: string; color: string }>();
    EXPENSE_CATEGORIES.forEach((c) => map.set(c.value, { label: c.label, color: c.color }));
    return map;
  }, []);

  return (
    <>
      {/* KPI Cards Row */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="This Month Expenses"
          value={formatCurrency(summary?.thisMonthTotal || 0)}
          icon={TrendingDown}
          accent="marigold"
          trendTone="danger"
          trend="Operational outflow"
        />
        <KpiCard
          label="Filtered Outflow"
          value={formatCurrency(summary?.filteredTotal || 0)}
          icon={Receipt}
          accent="scholar"
          trend={`${expenses.length} recorded items`}
        />
        <KpiCard
          label="Digital Outflow (UPI/Bank)"
          value={formatCurrency(summary?.digitalOutflow || 0)}
          icon={CreditCard}
          accent="scholar"
        />
        <KpiCard
          label="Cash Outflow"
          value={formatCurrency(summary?.cashOutflow || 0)}
          icon={Banknote}
          accent="marigold"
        />
      </div>

      {/* Category breakdown overview */}
      {summary && Object.keys(summary.categoryBreakdown).length > 0 && (
        <Card className="mb-4 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-scholar-500">
            <PieChart size={14} /> Category Distribution
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.categoryBreakdown).map(([cat, data]) => {
              const meta = categoryMeta.get(cat) || { label: cat, color: "bg-gray-100 text-gray-800" };
              return (
                <div
                  key={cat}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${meta.color}`}
                >
                  <span>{meta.label}</span>
                  <span className="font-bold">{formatCurrency(data.total)}</span>
                  <span className="text-[10px] opacity-75">({data.count})</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Table Card */}
      <Card className="p-5">
        {/* Controls Toolbar */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2 sm:w-64">
              <Search size={15} className="text-scholar-400" />
              <input
                placeholder="Search description, payee..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs outline-none placeholder:text-scholar-300"
              />
            </div>

            {/* Date Preset */}
            <div className="flex rounded-xl border border-scholar-200 bg-paper p-1 text-xs">
              <button
                onClick={() => setDatePreset("THIS_MONTH")}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  datePreset === "THIS_MONTH" ? "bg-scholar-700 text-white" : "text-scholar-600 hover:text-ink"
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDatePreset("LAST_MONTH")}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  datePreset === "LAST_MONTH" ? "bg-scholar-700 text-white" : "text-scholar-600 hover:text-ink"
                }`}
              >
                Last Month
              </button>
              <button
                onClick={() => setDatePreset("ALL")}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  datePreset === "ALL" ? "bg-scholar-700 text-white" : "text-scholar-600 hover:text-ink"
                }`}
              >
                All Time
              </button>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-scholar-200 bg-paper px-3 py-2 text-xs text-scholar-700 outline-none"
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-xl border border-scholar-200 bg-paper px-3 py-2 text-xs text-scholar-700 outline-none"
            >
              <option value="">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI / QR">UPI / QR</option>
              <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Debit / Credit Card">Card</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              disabled={expenses.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-paper px-3.5 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 disabled:opacity-40"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => {
                setEditingExpense(null);
                setDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700"
            >
              <Plus size={15} /> Record Expense
            </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-scholar-100 text-left text-xs font-medium uppercase tracking-wide text-scholar-400">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Expense Title</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Paid To</th>
                <th className="py-3 pr-4">Payment Mode</th>
                <th className="py-3 pr-4">Notes</th>
                <th className="py-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-50">
              {expenses.map((e) => {
                const meta = categoryMeta.get(e.category) || { label: e.category, color: "bg-gray-100 text-gray-800" };
                return (
                  <tr key={e.id} className="hover:bg-paper/60">
                    <td className="py-3 pr-4 text-xs font-medium text-scholar-600">
                      {formatDate(e.expenseDate)}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-ink">{e.title}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums font-bold text-rose-700">
                      {formatCurrency(Number(e.amount))}
                    </td>
                    <td className="py-3 pr-4 text-xs text-scholar-600">{e.paidTo || "—"}</td>
                    <td className="py-3 pr-4 text-xs text-scholar-600">
                      <span className="rounded bg-scholar-50 px-2 py-1 font-mono text-[11px]">
                        {e.paymentMethod}
                      </span>
                    </td>
                    <td className="max-w-xs truncate py-3 pr-4 text-xs text-scholar-400">
                      {e.notes || "—"}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingExpense(e);
                            setDrawerOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-scholar-500 hover:bg-scholar-100 hover:text-scholar-800"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(e)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          title="Delete Expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-scholar-400">
                    No expense records found. Click &quot;Record Expense&quot; to log your first outgoing payment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record / Edit Expense Drawer */}
      <RecordExpenseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchExpenses}
        initialExpense={editingExpense}
      />

      <ConfirmDialog
        open={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={confirmDeleteExpense}
        title="Delete Expense Record"
        message={
          expenseToDelete ? (
            <span>
              Are you sure you want to delete expense <strong>&ldquo;{expenseToDelete.title}&rdquo;</strong> of amount{" "}
              <strong>{formatCurrency(Number(expenseToDelete.amount))}</strong>? This action cannot be undone.
            </span>
          ) : null
        }
        confirmLabel="Delete Expense"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </>
  );
}
