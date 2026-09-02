"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Download,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Badge, studentStatusTone } from "@/components/ui/Badge";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";
import type { ReportsData } from "@/lib/reports-data";

export function StudentReportsTab({ data }: { data: ReportsData }) {
  const { studentsReport, overview } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [duesOnly, setDuesOnly] = useState(false);

  // Filter students
  const filteredStudents = useMemo(() => {
    return studentsReport.students.filter((s) => {
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchMobile = s.mobile.includes(q);
        const matchEmail = s.email ? s.email.toLowerCase().includes(q) : false;
        const matchCourse = s.courseName.toLowerCase().includes(q);
        const matchBatch = s.batchName.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchEmail && !matchCourse && !matchBatch) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;

      // Plan
      if (planFilter !== "ALL" && s.plan !== planFilter) return false;

      // Dues only
      if (duesOnly && s.pendingFee <= 0) return false;

      return true;
    });
  }, [studentsReport.students, searchTerm, statusFilter, planFilter, duesOnly]);

  // Handle CSV Export
  const handleExportCsv = () => {
    const headers = [
      "Student ID",
      "Full Name",
      "Mobile",
      "Email",
      "Parent Mobile",
      "Course",
      "Batch",
      "Admission Date",
      "Status",
      "Plan",
      "Subscription Status",
      "Total Fee (INR)",
      "Paid Fee (INR)",
      "Pending Dues (INR)",
      "Due Date",
      "Is Overdue",
    ];

    const rows = filteredStudents.map((s) => [
      s.id,
      s.name,
      s.mobile,
      s.email || "N/A",
      s.parentMobile || "N/A",
      s.courseName,
      s.batchName,
      formatDate(s.admissionDate),
      s.status,
      s.plan,
      s.subscriptionStatus,
      s.totalFee,
      s.paidFee,
      s.pendingFee,
      s.dueDate ? formatDate(s.dueDate) : "N/A",
      s.isOverdue ? "YES" : "NO",
    ]);

    exportToCsv("student_enrollment_report", headers, rows);
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Student KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-full min-w-0">
        <KpiCard
          label="Total Students"
          value={studentsReport.kpis.total.toLocaleString("en-IN")}
          icon={Users}
          accent="scholar"
        />
        <KpiCard
          label="Active Students"
          value={`${studentsReport.kpis.active} (${overview.activeStudentsPct}%)`}
          icon={CheckCircle2}
          accent="scholar"
        />
        <KpiCard
          label="Total Assessed Fees"
          value={formatCurrency(studentsReport.kpis.totalBilled)}
          icon={IndianRupee}
          accent="marigold"
        />
        <KpiCard
          label="Total Outstanding Dues"
          value={formatCurrency(studentsReport.kpis.totalPending)}
          icon={AlertCircle}
          accent="marigold"
          trend={`${studentsReport.kpis.collectionEfficiency}% collection rate`}
          trendTone="success"
        />
      </div>

      {/* Course Enrollment Breakdown Pills */}
      {studentsReport.courseBreakdown.length > 0 && (
        <Card className="p-4 bg-scholar-50/50">
          <p className="text-xs font-semibold text-scholar-500 uppercase tracking-wider mb-2.5">
            Enrollment by Course
          </p>
          <div className="flex flex-wrap gap-2.5">
            {studentsReport.courseBreakdown.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-1.5 text-xs text-scholar-700 shadow-sm"
              >
                <span className="font-semibold text-ink">{c.name}:</span>
                <span className="font-medium text-scholar-600">{c.count} students</span>
                <span className="text-scholar-400">({formatCurrency(c.billed)})</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters Bar & Controls */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder="Search students by name, mobile, email, course, batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-scholar-100 bg-white py-2 pl-9 pr-4 text-sm text-ink placeholder:text-scholar-300 focus:border-scholar-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active ({studentsReport.kpis.active})</option>
              <option value="ON_HOLD">On Hold ({studentsReport.kpis.onHold})</option>
              <option value="INACTIVE">Inactive ({studentsReport.kpis.inactive})</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none"
            >
              <option value="ALL">All Plans</option>
              <option value="MONTHLY">Monthly Regular</option>
              <option value="DEMO">Demo / Trial</option>
            </select>

            {/* Pending Dues Checkbox */}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 select-none">
              <input
                type="checkbox"
                checked={duesOnly}
                onChange={(e) => setDuesOnly(e.target.checked)}
                className="rounded border-scholar-300 text-scholar-600 focus:ring-0"
              />
              <span>With Dues Only</span>
            </label>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-scholar-700 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Active Result Count */}
        <div className="mt-3 flex items-center justify-between border-t border-scholar-50 pt-2 text-xs text-scholar-400">
          <span>Showing {filteredStudents.length} of {studentsReport.students.length} students</span>
          {(searchTerm || statusFilter !== "ALL" || planFilter !== "ALL" || duesOnly) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setPlanFilter("ALL");
                setDuesOnly(false);
              }}
              className="text-scholar-600 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </Card>

      {/* Students Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Course & Batch</th>
                <th className="px-4 py-3 font-semibold">Admission Date</th>
                <th className="px-4 py-3 font-semibold">Status & Plan</th>
                <th className="px-4 py-3 font-semibold text-right">Total Fee</th>
                <th className="px-4 py-3 font-semibold text-right">Paid</th>
                <th className="px-4 py-3 font-semibold text-right">Balance Due</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-scholar-400">
                    No students match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-scholar-50/40 transition-colors">
                    {/* Student Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-scholar-100 text-xs font-semibold text-scholar-700">
                          {initials(s.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{s.name}</p>
                          <p className="text-[11px] text-scholar-400">{s.mobile}</p>
                        </div>
                      </div>
                    </td>

                    {/* Course & Batch */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{s.courseName}</p>
                      <p className="text-[11px] text-scholar-400">{s.batchName}</p>
                    </td>

                    {/* Admission Date */}
                    <td className="px-4 py-3 text-scholar-600 whitespace-nowrap">
                      {formatDate(s.admissionDate)}
                    </td>

                    {/* Status & Plan */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={studentStatusTone(s.status)} dot>
                          {s.status}
                        </Badge>
                        <span className="text-[10px] text-scholar-400 uppercase tracking-wider font-semibold">
                          {s.plan === "DEMO" ? "7-Day Trial" : "Regular"}
                        </span>
                      </div>
                    </td>

                    {/* Total Fee */}
                    <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                      {formatCurrency(s.totalFee)}
                    </td>

                    {/* Paid Fee */}
                    <td className="px-4 py-3 text-right font-medium text-success-700 tabular-nums">
                      {formatCurrency(s.paidFee)}
                    </td>

                    {/* Pending Dues */}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {s.pendingFee > 0 ? (
                        <span className="text-danger-600">{formatCurrency(s.pendingFee)}</span>
                      ) : (
                        <span className="text-success-600">₹0</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {s.dueDate ? (
                        <div className="flex items-center gap-1.5">
                          <span className={s.isOverdue ? "font-semibold text-danger-600" : "text-scholar-600"}>
                            {formatDate(s.dueDate)}
                          </span>
                          {s.isOverdue && (
                            <span className="rounded bg-danger-50 px-1.5 py-0.5 text-[10px] font-bold text-danger-600">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-scholar-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
