"use client";

import {
  Users,
  Layers,
  ClipboardList,
  Wallet,
  CalendarCheck,
  Award,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
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
  Legend,
} from "recharts";

export function OverviewTab({
  data,
  onNavigateTab,
}: {
  data: ReportsData;
  onNavigateTab: (tab: string) => void;
}) {
  const { overview, batchReport, admissionReport, feeReport, attendanceReport, resultReport } = data;

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Level 6-Domain Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 w-full max-w-full min-w-0">
        {/* Students */}
        <div
          onClick={() => onNavigateTab("students")}
          className="group cursor-pointer rounded-2xl border border-scholar-100 bg-white p-4 shadow-card transition-all hover:border-scholar-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Students</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-50 text-scholar-600 group-hover:bg-scholar-600 group-hover:text-white transition-colors">
              <Users size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{overview.totalStudents}</p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-scholar-400">
            <span>{overview.activeStudents} active ({overview.activeStudentsPct}%)</span>
            <ArrowRight size={12} className="text-scholar-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Batches */}
        <div
          onClick={() => onNavigateTab("batches")}
          className="group cursor-pointer rounded-2xl border border-scholar-100 bg-white p-4 shadow-card transition-all hover:border-scholar-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Batches</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-50 text-scholar-600 group-hover:bg-scholar-600 group-hover:text-white transition-colors">
              <Layers size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{overview.totalBatches}</p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-scholar-400">
            <span>{overview.overallBatchOccupancy}% occupancy</span>
            <ArrowRight size={12} className="text-scholar-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Admissions */}
        <div
          onClick={() => onNavigateTab("admissions")}
          className="group cursor-pointer rounded-2xl border border-scholar-100 bg-white p-4 shadow-card transition-all hover:border-marigold-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Admissions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-marigold-50 text-marigold-600 group-hover:bg-marigold-500 group-hover:text-white transition-colors">
              <ClipboardList size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{overview.totalAdmissions}</p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-scholar-400">
            <span>{overview.enrolledAdmissions} enrolled ({overview.admissionConversionRate}%)</span>
            <ArrowRight size={12} className="text-scholar-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Fee Collection */}
        <div
          onClick={() => onNavigateTab("fees")}
          className="group cursor-pointer rounded-2xl border border-scholar-100 bg-white p-4 shadow-card transition-all hover:border-success-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Collection</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50 text-success-600 group-hover:bg-success-600 group-hover:text-white transition-colors">
              <Wallet size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-xl font-bold text-ink truncate">
            {formatCurrency(overview.totalPaidFee)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-scholar-400">
            <span>{overview.feeCollectionEfficiency}% recovered</span>
            <ArrowRight size={12} className="text-scholar-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Attendance */}
        <div
          onClick={() => onNavigateTab("attendance")}
          className="group cursor-pointer rounded-2xl border border-scholar-100 bg-white p-4 shadow-card transition-all hover:border-scholar-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Attendance</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-50 text-scholar-600 group-hover:bg-scholar-600 group-hover:text-white transition-colors">
              <CalendarCheck size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {overview.overallAttendanceRate}%
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-scholar-400">
            <span>
              {overview.lowAttendanceStudentsCount > 0 ? (
                <span className="text-danger-600 font-medium">
                  {overview.lowAttendanceStudentsCount} low (&lt;75%)
                </span>
              ) : (
                "Healthy rates"
              )}
            </span>
            <ArrowRight size={12} className="text-scholar-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Results */}
        <div
          onClick={() => onNavigateTab("results")}
          className="group cursor-pointer rounded-2xl border border-scholar-100 bg-white p-4 shadow-card transition-all hover:border-marigold-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Test Pass %</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-marigold-50 text-marigold-600 group-hover:bg-marigold-500 group-hover:text-white transition-colors">
              <Award size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {overview.overallPassRate}%
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-scholar-400">
            <span>Avg {overview.instituteAverageScore}% ({overview.totalTests} tests)</span>
            <ArrowRight size={12} className="text-scholar-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Fee Collection Growth */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Fee Collection Trend</h3>
              <p className="text-xs text-scholar-400">Monthly total collections (INR)</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-600">
              <TrendingUp size={12} /> {overview.feeCollectionEfficiency}% Recovered
            </span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={overview.monthlyCollectionTrend} margin={{ left: -10, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="reportsFeeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E3A5F" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1E3A5F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
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
              <Area type="monotone" dataKey="amount" stroke="#1E3A5F" strokeWidth={2.5} fill="url(#reportsFeeFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Student Enrollments by Course */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Students by Course</h3>
              <p className="text-xs text-scholar-400">Enrollment distribution across active offerings</p>
            </div>
            <button
              onClick={() => onNavigateTab("students")}
              className="text-xs font-medium text-scholar-600 hover:text-scholar-800"
            >
              View list →
            </button>
          </div>

          {overview.studentCourseBreakdown.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-xs text-scholar-400">
              No students enrolled yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={overview.studentCourseBreakdown.map((c) => ({
                  name: c.name.length > 14 ? c.name.slice(0, 14) + "..." : c.name,
                  fullName: c.name,
                  count: c.count,
                }))}
                margin={{ left: -20, right: 10, top: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#4E6E93" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }}
                  formatter={(val, name, props) => [`${val} students`, props?.payload?.fullName ?? "Course"]}
                />
                <Bar dataKey="count" fill="#E8A33D" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Batch Capacity Utilization */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Batch Capacity vs Enrolled</h3>
              <p className="text-xs text-scholar-400">Classroom utilization across batches</p>
            </div>
            <button
              onClick={() => onNavigateTab("batches")}
              className="text-xs font-medium text-scholar-600 hover:text-scholar-800"
            >
              Manage batches →
            </button>
          </div>

          {batchReport.batches.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-xs text-scholar-400">
              No batches created yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={batchReport.batches.slice(0, 8).map((b) => ({
                  name: b.name.length > 12 ? b.name.slice(0, 12) + "..." : b.name,
                  fullName: b.name,
                  capacity: b.capacity,
                  enrolled: b.enrolledCount,
                }))}
                margin={{ left: -20, right: 10, top: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#4E6E93" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }}
                  formatter={(val, name) => [val, name === "enrolled" ? "Enrolled" : "Total Capacity"]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                <Bar dataKey="enrolled" name="Enrolled" fill="#1E3A5F" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="capacity" name="Capacity" fill="#D6E0EB" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Daily Attendance Trend */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Recent Daily Attendance</h3>
              <p className="text-xs text-scholar-400">Present vs Absent (last 14 days)</p>
            </div>
            <button
              onClick={() => onNavigateTab("attendance")}
              className="text-xs font-medium text-scholar-600 hover:text-scholar-800"
            >
              Detailed view →
            </button>
          </div>

          {attendanceReport.dailyTrend.filter((d) => d.total > 0).length === 0 ? (
            <div className="flex h-60 items-center justify-center text-xs text-scholar-400">
              No recent attendance marked.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={attendanceReport.dailyTrend.filter((d) => d.total > 0)}
                margin={{ left: -20, right: 10, top: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#4E6E93" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }}
                  formatter={(val, name) => [val, name === "present" ? "Present" : "Absent"]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                <Bar dataKey="present" name="Present" fill="#2E7D52" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={24} />
                <Bar dataKey="absent" name="Absent" fill="#C93B2B" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Financial Health Summary Callout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col justify-between p-5 bg-gradient-to-br from-scholar-800 to-scholar-900 text-white">
          <div>
            <div className="flex items-center justify-between text-scholar-200">
              <span className="text-xs uppercase tracking-wider font-semibold">Total Dues Outstanding</span>
              <AlertTriangle size={16} className="text-marigold-400" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-white">
              {formatCurrency(overview.totalPendingFee)}
            </p>
            <p className="mt-1 text-xs text-scholar-200">
              Total assessed across all active students: {formatCurrency(overview.totalBilledFee)}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-scholar-300">
              {feeReport.kpis.overdueCount} student(s) past due date
            </span>
            <button
              onClick={() => onNavigateTab("fees")}
              className="text-xs font-semibold text-marigold-300 hover:text-white transition-colors"
            >
              Review Dues →
            </button>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between text-scholar-500">
              <span className="text-xs uppercase tracking-wider font-semibold">Admissions Pipeline</span>
              <ClipboardList size={16} className="text-scholar-400" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-scholar-50 p-3">
                <p className="text-xs text-scholar-400">Total Enquiries</p>
                <p className="font-display text-xl font-bold text-ink">{admissionReport.kpis.totalApplications}</p>
              </div>
              <div className="rounded-xl bg-success-50 p-3">
                <p className="text-xs text-success-600">Enrolled</p>
                <p className="font-display text-xl font-bold text-success-700">{admissionReport.kpis.enrolledCount}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-scholar-500">
              <span>Pending Decisions: {admissionReport.kpis.pendingCount}</span>
              <span className="font-semibold text-ink">{admissionReport.kpis.conversionRate}% conversion</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-scholar-100 flex items-center justify-between">
            <span className="text-xs text-scholar-400">Pipeline: {formatCurrency(admissionReport.kpis.pipelineValue)}</span>
            <button
              onClick={() => onNavigateTab("admissions")}
              className="text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              Admissions →
            </button>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between text-scholar-500">
              <span className="text-xs uppercase tracking-wider font-semibold">Academic Examinations</span>
              <Award size={16} className="text-scholar-400" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-scholar-50 p-3">
                <p className="text-xs text-scholar-400">Exams Conducted</p>
                <p className="font-display text-xl font-bold text-ink">{resultReport.kpis.totalTests}</p>
              </div>
              <div className="rounded-xl bg-marigold-50 p-3">
                <p className="text-xs text-marigold-700">Submissions</p>
                <p className="font-display text-xl font-bold text-marigold-800">{resultReport.kpis.totalEvaluations}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-scholar-500">
              <span>Overall Pass Rate: {resultReport.kpis.overallPassRate}%</span>
              <span className="font-semibold text-ink">Highest: {resultReport.kpis.highestMarkOverall} pts</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-scholar-100 flex items-center justify-between">
            <span className="text-xs text-scholar-400">Institute Avg: {resultReport.kpis.instituteAverageScore}%</span>
            <button
              onClick={() => onNavigateTab("results")}
              className="text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              Exam Results →
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
