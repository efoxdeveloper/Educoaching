"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Search,
  Download,
  IndianRupee,
  Percent,
  Wallet,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";
import type { ReportsData } from "@/lib/reports-data";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export function ProfitLossReportsTab({ data }: { data: ReportsData }) {
  const { profitLossReport } = data;
  const [subView, setSubView] = useState<"summary" | "income" | "expenses">("summary");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const { kpis, monthlyTrend, incomeCategoryBreakdown, expenseCategoryBreakdown, incomes, expenses } =
    profitLossReport;

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTitle = i.title.toLowerCase().includes(q);
        const matchPayer = (i.receivedFrom || "").toLowerCase().includes(q);
        const matchNotes = (i.notes || "").toLowerCase().includes(q);
        const matchCat = i.categoryLabel.toLowerCase().includes(q);
        if (!matchTitle && !matchPayer && !matchNotes && !matchCat) return false;
      }
      if (categoryFilter !== "ALL" && i.category !== categoryFilter) return false;
      return true;
    });
  }, [incomes, searchTerm, categoryFilter]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchPaidTo = (e.paidTo || "").toLowerCase().includes(q);
        const matchNotes = (e.notes || "").toLowerCase().includes(q);
        const matchCat = e.categoryLabel.toLowerCase().includes(q);
        if (!matchTitle && !matchPaidTo && !matchNotes && !matchCat) return false;
      }
      if (categoryFilter !== "ALL" && e.category !== categoryFilter) return false;
      return true;
    });
  }, [expenses, searchTerm, categoryFilter]);

  // CSV Exporters
  const handleExportStatement = () => {
    const headers = [
      "Month",
      "Fee Collection (INR)",
      "Extra Income (INR)",
      "Total Gross Revenue (INR)",
      "Total Expenses (INR)",
      "Net Profit / Loss (INR)",
    ];
    const rows = monthlyTrend.map((m) => [
      m.month,
      m.feeRevenue,
      m.extraIncome,
      m.totalRevenue,
      m.expenses,
      m.netProfit,
    ]);
    exportToCsv("Profit_Loss_Statement", headers, rows);
  };

  const handleExportIncome = () => {
    const headers = ["Title", "Category", "Amount (INR)", "Method", "Date", "Received From", "Notes"];
    const rows = filteredIncomes.map((i) => [
      i.title,
      i.categoryLabel,
      i.amount,
      i.paymentMethod,
      formatDate(new Date(i.incomeDate)),
      i.receivedFrom || "",
      i.notes || "",
    ]);
    exportToCsv("Extra_Income_Ledger", headers, rows);
  };

  const handleExportExpenses = () => {
    const headers = ["Title", "Category", "Amount (INR)", "Method", "Date", "Paid To", "Notes"];
    const rows = filteredExpenses.map((e) => [
      e.title,
      e.categoryLabel,
      e.amount,
      e.paymentMethod,
      formatDate(new Date(e.expenseDate)),
      e.paidTo || "",
      e.notes || "",
    ]);
    exportToCsv("Expenses_Ledger", headers, rows);
  };

  const isNetProfitPositive = kpis.netProfit >= 0;

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Sub-navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-scholar-200 pb-3 w-full max-w-full">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSubView("summary");
              setCategoryFilter("ALL");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              subView === "summary"
                ? "bg-scholar-700 text-white shadow-xs"
                : "text-scholar-600 hover:bg-scholar-100"
            }`}
          >
            <TrendingUp size={14} />
            <span>P&L Overview & Trends</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView("income");
              setCategoryFilter("ALL");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              subView === "income"
                ? "bg-scholar-700 text-white shadow-xs"
                : "text-scholar-600 hover:bg-scholar-100"
            }`}
          >
            <Wallet size={14} />
            <span>Extra Income ({incomes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView("expenses");
              setCategoryFilter("ALL");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              subView === "expenses"
                ? "bg-scholar-700 text-white shadow-xs"
                : "text-scholar-600 hover:bg-scholar-100"
            }`}
          >
            <Receipt size={14} />
            <span>Expenses ({expenses.length})</span>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={
              subView === "income"
                ? handleExportIncome
                : subView === "expenses"
                ? handleExportExpenses
                : handleExportStatement
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs"
          >
            <Download size={13} />
            <span>
              {subView === "income"
                ? "Export Income CSV"
                : subView === "expenses"
                ? "Export Expenses CSV"
                : "Export P&L Statement (CSV)"}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Gross Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          icon={IndianRupee}
          description={`Fees (${formatCurrency(kpis.feeRevenue)}) + Extra (${formatCurrency(
            kpis.extraIncome
          )})`}
        />
        <KpiCard
          title="Total Operating Expenses"
          value={formatCurrency(kpis.totalExpenses)}
          icon={TrendingDown}
          description={`${kpis.expenseTransactionsCount} total expense transactions`}
        />
        <KpiCard
          title="Net Profit / (Loss)"
          value={formatCurrency(kpis.netProfit)}
          icon={isNetProfitPositive ? TrendingUp : TrendingDown}
          description={
            isNetProfitPositive
              ? "Profitable operations (Revenue > Expenses)"
              : "Net loss incurred during this timeframe"
          }
        />
        <KpiCard
          title="Operating Profit Margin"
          value={`${kpis.profitMargin}%`}
          icon={Percent}
          description="Net margin on total gross revenue"
        />
      </div>

      {/* Sub-view 1: P&L Overview & Charts */}
      {subView === "summary" && (
        <div className="space-y-6">
          {/* Monthly Revenue vs Expense Chart */}
          <Card className="p-5 space-y-4">
            <div>
              <h3 className="font-display font-bold text-sm text-ink">
                Monthly P&L Comparison: Total Revenue vs. Total Expenses
              </h3>
              <p className="text-xs text-scholar-500">
                Tracking monthly trends across fee revenue, extra non-fee income, and campus expenses.
              </p>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(val: number | string | undefined) => [formatCurrency(Number(val || 0)), ""]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #CBD5E1",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                    iconType="circle"
                  />
                  <Bar dataKey="feeRevenue" name="Fee Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="extraIncome" name="Extra Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Operating Expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Non-Fee Extra Revenue Drivers */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                    <TrendingUp size={15} className="text-emerald-600" />
                    Non-Fee Extra Revenue Drivers
                  </h4>
                  <p className="text-xs text-scholar-500">Breakdown of non-fee income sources</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {formatCurrency(kpis.extraIncome)} Total
                </span>
              </div>

              {incomeCategoryBreakdown.length === 0 ? (
                <div className="p-8 text-center text-xs text-scholar-400">
                  No extra revenue entries recorded for this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {incomeCategoryBreakdown.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">{cat.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-scholar-400 text-[11px]">{cat.count} txns</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(cat.total)}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-scholar-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Operating Expense Drivers */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                    <TrendingDown size={15} className="text-rose-600" />
                    Operating Expense Drivers
                  </h4>
                  <p className="text-xs text-scholar-500">Breakdown of major cost centers</p>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  {formatCurrency(kpis.totalExpenses)} Total
                </span>
              </div>

              {expenseCategoryBreakdown.length === 0 ? (
                <div className="p-8 text-center text-xs text-scholar-400">
                  No operating expenses logged for this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {expenseCategoryBreakdown.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">{cat.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-scholar-400 text-[11px]">{cat.count} txns</span>
                          <span className="font-bold text-rose-700">{formatCurrency(cat.total)}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-scholar-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Sub-view 2: Extra Income Ledger */}
      {subView === "income" && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" size={14} />
              <input
                type="text"
                placeholder="Search income by title, payer, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white pl-9 pr-3 py-2 text-xs text-ink placeholder:text-scholar-400 focus:outline-none focus:border-scholar-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-700 shadow-2xs outline-none"
            >
              <option value="ALL">All Income Categories</option>
              {incomeCategoryBreakdown.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-scholar-50 text-[11px] font-bold uppercase tracking-wider text-scholar-500 border-b border-scholar-100">
                  <tr>
                    <th className="p-3.5">Income Description</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Received From</th>
                    <th className="p-3.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-scholar-100 font-medium">
                  {filteredIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-scholar-400">
                        No extra income records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredIncomes.map((i) => (
                      <tr key={i.id} className="hover:bg-scholar-50/70 transition-colors">
                        <td className="p-3.5">
                          <span className="font-bold text-ink block">{i.title}</span>
                          {i.notes && <span className="text-[11px] text-scholar-400">{i.notes}</span>}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-block rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {i.categoryLabel}
                          </span>
                        </td>
                        <td className="p-3.5 text-scholar-600">{i.paymentMethod}</td>
                        <td className="p-3.5 text-scholar-600">
                          {formatDate(new Date(i.incomeDate))}
                        </td>
                        <td className="p-3.5 text-scholar-600">
                          {i.receivedFrom || <span className="text-scholar-300 italic">—</span>}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-700 text-sm">
                          +{formatCurrency(i.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Sub-view 3: Expenses Ledger */}
      {subView === "expenses" && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" size={14} />
              <input
                type="text"
                placeholder="Search expenses by title, recipient, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 bg-white pl-9 pr-3 py-2 text-xs text-ink placeholder:text-scholar-400 focus:outline-none focus:border-scholar-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-700 shadow-2xs outline-none"
            >
              <option value="ALL">All Expense Categories</option>
              {expenseCategoryBreakdown.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-scholar-50 text-[11px] font-bold uppercase tracking-wider text-scholar-500 border-b border-scholar-100">
                  <tr>
                    <th className="p-3.5">Expense Description</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Paid To</th>
                    <th className="p-3.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-scholar-100 font-medium">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-scholar-400">
                        No expense records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-scholar-50/70 transition-colors">
                        <td className="p-3.5">
                          <span className="font-bold text-ink block">{e.title}</span>
                          {e.notes && <span className="text-[11px] text-scholar-400">{e.notes}</span>}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-block rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            {e.categoryLabel}
                          </span>
                        </td>
                        <td className="p-3.5 text-scholar-600">{e.paymentMethod}</td>
                        <td className="p-3.5 text-scholar-600">
                          {formatDate(new Date(e.expenseDate))}
                        </td>
                        <td className="p-3.5 text-scholar-600">
                          {e.paidTo || <span className="text-scholar-300 italic">—</span>}
                        </td>
                        <td className="p-3.5 text-right font-bold text-rose-700 text-sm">
                          -{formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
