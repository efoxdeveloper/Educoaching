"use client";

import { useState, useMemo } from "react";
import {
  ClipboardList,
  Search,
  Download,
  Clock,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Badge, admissionStatusTone } from "@/components/ui/Badge";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";
import type { ReportsData } from "@/lib/reports-data";

export function AdmissionReportsTab({ data }: { data: ReportsData }) {
  const { admissionReport } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Filtered admissions
  const filteredAdmissions = useMemo(() => {
    return admissionReport.admissions.filter((a) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = a.applicantName.toLowerCase().includes(q);
        const matchMobile = a.mobile.includes(q);
        const matchEmail = a.email ? a.email.toLowerCase().includes(q) : false;
        const matchCourse = a.courseName.toLowerCase().includes(q);
        const matchBranch = a.branchName ? a.branchName.toLowerCase().includes(q) : false;
        if (!matchName && !matchMobile && !matchEmail && !matchCourse && !matchBranch) {
          return false;
        }
      }

      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;

      return true;
    });
  }, [admissionReport.admissions, searchTerm, statusFilter]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Application ID",
      "Applicant Name",
      "Mobile",
      "Email",
      "Course Applied",
      "Batch Preferred",
      "Branch",
      "Fee Plan (INR)",
      "Status",
      "Application Date",
      "Notes",
    ];

    const rows = filteredAdmissions.map((a) => [
      a.id,
      a.applicantName,
      a.mobile,
      a.email || "N/A",
      a.courseName,
      a.batchName || "N/A",
      a.branchName || "Main Branch",
      a.feePlan,
      a.status,
      formatDate(a.createdAt),
      a.note || "",
    ]);

    exportToCsv("admissions_pipeline_report", headers, rows);
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Admission KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-full min-w-0">
        <KpiCard
          label="Total Applications"
          value={admissionReport.kpis.totalApplications.toString()}
          icon={ClipboardList}
          accent="scholar"
        />
        <KpiCard
          label="Conversion Rate"
          value={`${admissionReport.kpis.conversionRate}%`}
          icon={TrendingUp}
          accent="marigold"
          trend={`${admissionReport.kpis.enrolledCount} enrolled students`}
          trendTone="success"
        />
        <KpiCard
          label="Pending Review"
          value={admissionReport.kpis.pendingCount.toString()}
          icon={Clock}
          accent="scholar"
        />
        <KpiCard
          label="Total Pipeline Value"
          value={formatCurrency(admissionReport.kpis.pipelineValue)}
          icon={IndianRupee}
          accent="marigold"
          trend={`${formatCurrency(admissionReport.kpis.enrolledValue)} realized`}
          trendTone="success"
        />
      </div>

      {/* Admission Funnel Pills */}
      <Card className="p-4 bg-scholar-50/50">
        <p className="text-xs font-semibold text-scholar-500 uppercase tracking-wider mb-2.5">
          Admission Funnel Distribution
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-scholar-100 bg-white p-3 shadow-sm">
            <span className="text-[11px] font-medium text-scholar-400">1. Total Inquiries</span>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {admissionReport.kpis.totalApplications}
            </p>
          </div>
          <div className="rounded-xl border border-scholar-100 bg-white p-3 shadow-sm">
            <span className="text-[11px] font-medium text-scholar-500">2. Pending Action</span>
            <p className="mt-1 font-display text-xl font-bold text-scholar-700">
              {admissionReport.kpis.pendingCount}
            </p>
          </div>
          <div className="rounded-xl border border-marigold-200 bg-white p-3 shadow-sm">
            <span className="text-[11px] font-medium text-marigold-600">3. Approved</span>
            <p className="mt-1 font-display text-xl font-bold text-marigold-700">
              {admissionReport.kpis.approvedCount}
            </p>
          </div>
          <div className="rounded-xl border border-success-200 bg-white p-3 shadow-sm">
            <span className="text-[11px] font-medium text-success-600">4. Enrolled</span>
            <p className="mt-1 font-display text-xl font-bold text-success-700">
              {admissionReport.kpis.enrolledCount} ({admissionReport.kpis.conversionRate}%)
            </p>
          </div>
        </div>
      </Card>

      {/* Filters Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder="Search admissions by applicant name, mobile, email, course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-scholar-100 bg-white py-2 pl-9 pr-4 text-sm text-ink placeholder:text-scholar-300 focus:border-scholar-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none"
            >
              <option value="ALL">All Application Statuses ({admissionReport.admissions.length})</option>
              <option value="ENROLLED">Enrolled ({admissionReport.kpis.enrolledCount})</option>
              <option value="APPROVED">Approved ({admissionReport.kpis.approvedCount})</option>
              <option value="PENDING">Pending ({admissionReport.kpis.pendingCount})</option>
              <option value="REJECTED">Rejected ({admissionReport.kpis.rejectedCount})</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-scholar-700 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-scholar-50 pt-2 text-xs text-scholar-400">
          <span>Showing {filteredAdmissions.length} of {admissionReport.admissions.length} admissions</span>
          {(searchTerm || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
              }}
              className="text-scholar-600 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </Card>

      {/* Admissions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Applicant</th>
                <th className="px-4 py-3 font-semibold">Course & Batch</th>
                <th className="px-4 py-3 font-semibold">Branch</th>
                <th className="px-4 py-3 font-semibold text-right">Fee Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Application Date</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-50">
              {filteredAdmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-scholar-400">
                    No admission applications found.
                  </td>
                </tr>
              ) : (
                filteredAdmissions.map((a) => (
                  <tr key={a.id} className="hover:bg-scholar-50/40 transition-colors">
                    {/* Applicant Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-scholar-100 text-xs font-semibold text-scholar-700">
                          {initials(a.applicantName)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{a.applicantName}</p>
                          <p className="text-[11px] text-scholar-400">{a.mobile}</p>
                        </div>
                      </div>
                    </td>

                    {/* Course & Batch */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{a.courseName}</p>
                      <p className="text-[11px] text-scholar-400">{a.batchName}</p>
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-3 text-scholar-600">
                      {a.branchName}
                    </td>

                    {/* Fee Plan */}
                    <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                      {formatCurrency(a.feePlan)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      <Badge tone={admissionStatusTone(a.status)} dot>
                        {a.status}
                      </Badge>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-scholar-600 whitespace-nowrap">
                      {formatDate(a.createdAt)}
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3 text-scholar-500 max-w-xs truncate">
                      {a.note || "—"}
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
