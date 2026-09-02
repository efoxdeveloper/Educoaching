"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  TrendingUp,
  Plus,
  Search,
  Download,
  CreditCard,
  Banknote,
  Edit2,
  Trash2,
  PieChart,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  RecordIncomeDrawer,
  INCOME_CATEGORIES,
  type IncomeRecord,
} from "./RecordIncomeDrawer";

type IncomeSummary = {
  filteredTotal: number;
  thisMonthTotal: number;
  allTimeTotal: number;
  categoryBreakdown: Record<string, { total: number; count: number }>;
  cashInflow: number;
  digitalInflow: number;
};

export function IncomeView() {
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [datePreset, setDatePreset] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH">("THIS_MONTH");

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeRecord | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<IncomeRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchIncomes = useCallback(async () => {
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

      const res = await fetch(`/api/income?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load income records");
      const data = await res.json();
      setIncomes(data.incomes || []);
      setSummary(data.summary || null);
    } catch {
      setIncomes([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, methodFilter, datePreset, query]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const handleDelete = async () => {
    if (!incomeToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/income/${incomeToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete income record");
      setIncomeToDelete(null);
      fetchIncomes();
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  };

  const categoryMap = useMemo(() => {
    const map = new Map<string, { label: string; color: string }>();
    for (const cat of INCOME_CATEGORIES) {
      map.set(cat.value, { label: cat.label, color: cat.color });
    }
    return map;
  }, []);

  const exportCsv = () => {
    if (!incomes.length) return;
    const headers = ["Title", "Category", "Amount", "Method", "Date", "Received From", "Notes"];
    const rows = incomes.map((i) => [
      `"${i.title.replace(/"/g, '""')}"`,
      categoryMap.get(i.category)?.label || i.category,
      i.amount,
      i.paymentMethod,
      formatDate(new Date(i.incomeDate)),
      `"${(i.receivedFrom || "").replace(/"/g, '""')}"`,
      `"${(i.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Extra_Income_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Preset Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-scholar-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setDatePreset("THIS_MONTH")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              datePreset === "THIS_MONTH"
                ? "bg-white text-ink shadow-2xs"
                : "text-scholar-600 hover:text-ink"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setDatePreset("LAST_MONTH")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              datePreset === "LAST_MONTH"
                ? "bg-white text-ink shadow-2xs"
                : "text-scholar-600 hover:text-ink"
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => setDatePreset("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              datePreset === "ALL"
                ? "bg-white text-ink shadow-2xs"
                : "text-scholar-600 hover:text-ink"
            }`}
          >
            All Time
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={!incomes.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingIncome(null);
              setDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Record Extra Income</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={
            datePreset === "THIS_MONTH"
              ? "This Month's Extra Revenue"
              : datePreset === "LAST_MONTH"
              ? "Last Month's Extra Revenue"
              : "Filtered Extra Revenue"
          }
          value={formatCurrency(summary?.filteredTotal || 0)}
          icon={TrendingUp}
          trend={`${incomes.length} transaction entries logged`}
        />
        <KpiCard
          label="All-Time Extra Income"
          value={formatCurrency(summary?.allTimeTotal || 0)}
          icon={PieChart}
          trend="Cumulative non-fee revenue"
        />
        <KpiCard
          label="Cash Inflow"
          value={formatCurrency(summary?.cashInflow || 0)}
          icon={Banknote}
          trend="Received via physical cash"
        />
        <KpiCard
          label="Digital / Bank Inflow"
          value={formatCurrency(summary?.digitalInflow || 0)}
          icon={CreditCard}
          trend="UPI, Cheque, Bank Transfer"
        />
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" size={14} />
            <input
              type="text"
              placeholder="Search income by title, payer, or notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 pl-9 pr-3.5 py-2 text-xs text-ink placeholder:text-scholar-400 focus:border-scholar-500 focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-700 shadow-2xs outline-none"
            >
              <option value="">All Categories</option>
              {INCOME_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-700 shadow-2xs outline-none"
            >
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI / QR">UPI / QR</option>
              <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Debit / Credit Card">Card</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Incomes Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-scholar-50 text-[11px] font-bold uppercase tracking-wider text-scholar-500 border-b border-scholar-100">
              <tr>
                <th className="p-3.5">Income Description</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Receipt Date</th>
                <th className="p-3.5">Received From</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-scholar-400">
                    Loading income records...
                  </td>
                </tr>
              ) : incomes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-scholar-400">
                    No extra revenue entries found for this period. Click &ldquo;Record Extra Income&rdquo; to add one.
                  </td>
                </tr>
              ) : (
                incomes.map((inc) => {
                  const cat = categoryMap.get(inc.category) || {
                    label: inc.category,
                    color: "bg-gray-50 text-gray-700 border-gray-200",
                  };
                  return (
                    <tr key={inc.id} className="hover:bg-scholar-50/70 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-ink block">{inc.title}</span>
                        {inc.notes && (
                          <span className="text-[11px] text-scholar-400 line-clamp-1">{inc.notes}</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${cat.color}`}
                        >
                          {cat.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-scholar-600">{inc.paymentMethod}</td>
                      <td className="p-3.5 text-scholar-600">
                        {formatDate(new Date(inc.incomeDate))}
                      </td>
                      <td className="p-3.5 text-scholar-600">
                        {inc.receivedFrom || <span className="text-scholar-300 italic">—</span>}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700 text-sm">
                        +{formatCurrency(Number(inc.amount))}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingIncome(inc);
                              setDrawerOpen(true);
                            }}
                            className="p-1 text-scholar-400 hover:text-scholar-700 transition-colors"
                            title="Edit income"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setIncomeToDelete(inc)}
                            className="p-1 text-scholar-400 hover:text-rose-600 transition-colors"
                            title="Delete income"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer */}
      <RecordIncomeDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingIncome(null);
        }}
        onSaved={fetchIncomes}
        initialIncome={editingIncome}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(incomeToDelete)}
        title="Delete Income Record"
        message={`Are you sure you want to delete "${incomeToDelete?.title}" (${formatCurrency(
          Number(incomeToDelete?.amount || 0)
        )})? This will remove it from all P&L accounting summaries.`}
        confirmLabel="Delete Record"
        tone="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setIncomeToDelete(null)}
      />
    </div>
  );
}
