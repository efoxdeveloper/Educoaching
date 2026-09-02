"use client";

import { useState, useMemo } from "react";
import {
  Wallet,
  Search,
  Download,
  IndianRupee,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";
import type { ReportsData } from "@/lib/reports-data";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function FeeReportsTab({ data }: { data: ReportsData }) {
  const { feeReport } = data;
  const [subView, setSubView] = useState<"transactions" | "dues" | "methods">("transactions");
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return feeReport.payments.filter((p) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = p.studentName.toLowerCase().includes(q);
        const matchMobile = p.studentMobile.includes(q);
        const matchCourse = p.courseName.toLowerCase().includes(q);
        const matchMethod = p.method.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchCourse && !matchMethod) return false;
      }

      if (methodFilter !== "ALL" && p.method !== methodFilter) return false;

      return true;
    });
  }, [feeReport.payments, searchTerm, methodFilter]);

  // Filtered dues
  const filteredDues = useMemo(() => {
    return feeReport.duesAging.filter((d) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = d.studentName.toLowerCase().includes(q);
        const matchMobile = d.mobile.includes(q);
        const matchCourse = d.courseName.toLowerCase().includes(q);
        const matchBatch = d.batchName.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchCourse && !matchBatch) return false;
      }
      return true;
    });
  }, [feeReport.duesAging, searchTerm]);

  // Handle Export CSV based on current subview
  const handleExportCsv = () => {
    if (subView === "transactions") {
      const headers = [
        "Payment ID",
        "Student Name",
        "Mobile",
        "Course",
        "Batch",
        "Amount (INR)",
        "Payment Method",
        "Paid Date",
        "Notes / Remarks",
      ];
      const rows = filteredPayments.map((p) => [
        p.id,
        p.studentName,
        p.studentMobile,
        p.courseName,
        p.batchName,
        p.amount,
        p.method,
        formatDate(p.paidAt),
        p.note || "",
      ]);
      exportToCsv("fee_transactions_ledger", headers, rows);
    } else if (subView === "dues") {
      const headers = [
        "Student ID",
        "Student Name",
        "Mobile",
        "Course",
        "Batch",
        "Total Fee Assessed (INR)",
        "Paid Amount (INR)",
        "Outstanding Balance (INR)",
        "Due Date",
        "Is Overdue",
        "Days Overdue",
      ];
      const rows = filteredDues.map((d) => [
        d.studentId,
        d.studentName,
        d.mobile,
        d.courseName,
        d.batchName,
        d.totalFee,
        d.paidFee,
        d.pendingFee,
        d.dueDate ? formatDate(d.dueDate) : "N/A",
        d.isOverdue ? "YES" : "NO",
        d.daysOverdue,
      ]);
      exportToCsv("outstanding_fee_dues_report", headers, rows);
    } else {
      const headers = ["Payment Method", "Transactions Count", "Total Collected (INR)", "Share of Total (%)"];
      const rows = feeReport.paymentMethodsBreakdown.map((m) => [
        m.method,
        m.count,
        m.total,
        `${m.percentage}%`,
      ]);
      exportToCsv("payment_methods_breakdown", headers, rows);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Fee KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-full min-w-0">
        <KpiCard
          label="Total Assessed Fees"
          value={formatCurrency(feeReport.kpis.totalBilled)}
          icon={IndianRupee}
          accent="scholar"
        />
        <KpiCard
          label="Total Collected"
          value={formatCurrency(feeReport.kpis.totalCollected)}
          icon={Wallet}
          accent="scholar"
          trend={`${feeReport.kpis.collectionEfficiency}% collection rate`}
          trendTone="success"
        />
        <KpiCard
          label="Pending Dues"
          value={formatCurrency(feeReport.kpis.totalPending)}
          icon={AlertTriangle}
          accent="marigold"
          trend={`${feeReport.duesAging.length} students with dues`}
          trendTone="neutral"
        />
        <KpiCard
          label="Overdue Amount"
          value={formatCurrency(feeReport.kpis.overdueAmount)}
          icon={AlertTriangle}
          accent="marigold"
          trend={`${feeReport.kpis.overdueCount} students past deadline`}
          trendTone={feeReport.kpis.overdueCount > 0 ? "danger" : "success"}
        />
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Monthly Collection Trend</h3>
              <p className="text-xs text-scholar-400">Total fees received per month (INR)</p>
            </div>
            <span className="text-xs font-semibold text-scholar-600">
              {feeReport.kpis.transactionsCount} Transactions
            </span>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={feeReport.monthlyTrend} margin={{ left: -10, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="feeTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E7D52" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2E7D52" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#4E6E93" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }}
                formatter={(val) => [`₹${Number(val ?? 0).toLocaleString("en-IN")}`, "Collected"]}
              />
              <Area type="monotone" dataKey="amount" stroke="#2E7D52" strokeWidth={2.5} fill="url(#feeTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Payment Methods Breakdown</h3>
              <p className="text-xs text-scholar-400">Collection volume by channel</p>
            </div>
            <span className="text-xs font-semibold text-scholar-600">
              {feeReport.paymentMethodsBreakdown.length} Methods
            </span>
          </div>

          {feeReport.paymentMethodsBreakdown.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-scholar-400">
              No payments recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={feeReport.paymentMethodsBreakdown}
                margin={{ left: -10, right: 10, top: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="method" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#4E6E93" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }}
                  formatter={(val, name, item) => [
                    `₹${Number(val ?? 0).toLocaleString("en-IN")} (${item?.payload?.percentage}%)`,
                    "Total Collected",
                  ]}
                />
                <Bar dataKey="total" fill="#1E3A5F" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Sub-view Selector & Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Subview Pills */}
          <div className="flex rounded-xl bg-scholar-50 p-1 border border-scholar-100 self-start">
            <button
              onClick={() => setSubView("transactions")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                subView === "transactions"
                  ? "bg-white text-scholar-900 shadow-sm"
                  : "text-scholar-600 hover:text-scholar-900"
              }`}
            >
              Payment Transactions ({feeReport.payments.length})
            </button>
            <button
              onClick={() => setSubView("dues")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                subView === "dues"
                  ? "bg-white text-scholar-900 shadow-sm"
                  : "text-scholar-600 hover:text-scholar-900"
              }`}
            >
              Outstanding Dues & Aging ({feeReport.duesAging.length})
            </button>
            <button
              onClick={() => setSubView("methods")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                subView === "methods"
                  ? "bg-white text-scholar-900 shadow-sm"
                  : "text-scholar-600 hover:text-scholar-900"
              }`}
            >
              Methods Summary ({feeReport.paymentMethodsBreakdown.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {subView === "transactions" && (
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none"
              >
                <option value="ALL">All Methods</option>
                {feeReport.paymentMethodsBreakdown.map((m) => (
                  <option key={m.method} value={m.method}>
                    {m.method}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-scholar-700 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {subView !== "methods" && (
          <div className="mt-3 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder={
                subView === "transactions"
                  ? "Search payments by student name, mobile, course, or method..."
                  : "Search dues by student name, mobile, course, batch..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-scholar-100 bg-white py-2 pl-9 pr-4 text-sm text-ink placeholder:text-scholar-300 focus:border-scholar-500 focus:outline-none"
            />
          </div>
        )}
      </Card>

      {/* Subview 1: Payment Transactions Table */}
      {subView === "transactions" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Course & Batch</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount Paid</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Payment Date</th>
                  <th className="px-4 py-3 font-semibold">Notes / Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-scholar-400">
                      No payment transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-scholar-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-scholar-100 text-xs font-semibold text-scholar-700">
                            {initials(p.studentName)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{p.studentName}</p>
                            <p className="text-[11px] text-scholar-400">{p.studentMobile}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{p.courseName}</p>
                        <p className="text-[11px] text-scholar-400">{p.batchName}</p>
                      </td>

                      <td className="px-4 py-3 text-right font-display font-semibold text-success-700 tabular-nums">
                        +{formatCurrency(p.amount)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-scholar-100 px-2.5 py-0.5 text-[11px] font-medium text-scholar-700">
                          <CreditCard size={10} />
                          {p.method}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-scholar-600 whitespace-nowrap">
                        {formatDate(p.paidAt)}
                      </td>

                      <td className="px-4 py-3 text-scholar-500 max-w-xs truncate">
                        {p.note || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Subview 2: Outstanding Dues Aging Table */}
      {subView === "dues" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Course & Batch</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Fee</th>
                  <th className="px-4 py-3 font-semibold text-right">Paid</th>
                  <th className="px-4 py-3 font-semibold text-right">Outstanding Dues</th>
                  <th className="px-4 py-3 font-semibold">Due Date</th>
                  <th className="px-4 py-3 font-semibold">Aging Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {filteredDues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-scholar-400">
                      No outstanding dues! All students are paid up.
                    </td>
                  </tr>
                ) : (
                  filteredDues.map((d) => (
                    <tr key={d.studentId} className="hover:bg-scholar-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-xs font-semibold text-danger-700">
                            {initials(d.studentName)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{d.studentName}</p>
                            <p className="text-[11px] text-scholar-400">{d.mobile}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{d.courseName}</p>
                        <p className="text-[11px] text-scholar-400">{d.batchName}</p>
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                        {formatCurrency(d.totalFee)}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-success-700 tabular-nums">
                        {formatCurrency(d.paidFee)}
                      </td>

                      <td className="px-4 py-3 text-right font-display font-semibold text-danger-600 tabular-nums">
                        {formatCurrency(d.pendingFee)}
                      </td>

                      <td className="px-4 py-3 text-scholar-600 whitespace-nowrap">
                        {d.dueDate ? formatDate(d.dueDate) : "—"}
                      </td>

                      <td className="px-4 py-3">
                        {d.isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 border border-danger-200 px-2 py-0.5 text-[11px] font-bold text-danger-700">
                            <AlertTriangle size={11} />
                            {d.daysOverdue} days overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-scholar-50 px-2 py-0.5 text-[11px] font-medium text-scholar-600">
                            Current Period
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Subview 3: Payment Methods Summary Table */}
      {subView === "methods" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Payment Channel / Mode</th>
                  <th className="px-4 py-3 font-semibold text-center">Transactions Count</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Collected (INR)</th>
                  <th className="px-4 py-3 font-semibold text-right">Share of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {feeReport.paymentMethodsBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-scholar-400">
                      No payment methods data.
                    </td>
                  </tr>
                ) : (
                  feeReport.paymentMethodsBreakdown.map((m) => (
                    <tr key={m.method} className="hover:bg-scholar-50/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ink flex items-center gap-2">
                        <CreditCard size={14} className="text-scholar-500" />
                        {m.method}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-ink tabular-nums">
                        {m.count}
                      </td>
                      <td className="px-4 py-3 text-right font-display font-semibold text-success-700 tabular-nums">
                        {formatCurrency(m.total)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-scholar-600 tabular-nums">
                        {m.percentage}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
