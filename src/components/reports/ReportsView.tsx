"use client";

import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  Users,
  Layers,
  ClipboardList,
  Wallet,
  CalendarCheck,
  Award,
  TrendingUp,
  Printer,
  RotateCw,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { format, subDays, startOfYear } from "date-fns";
import type { ReportsData } from "@/lib/reports-data";
import { OverviewTab } from "./OverviewTab";
import { StudentReportsTab } from "./StudentReportsTab";
import { BatchReportsTab } from "./BatchReportsTab";
import { AdmissionReportsTab } from "./AdmissionReportsTab";
import { FeeReportsTab } from "./FeeReportsTab";
import { ProfitLossReportsTab } from "./ProfitLossReportsTab";
import { AttendanceReportsTab } from "./AttendanceReportsTab";
import { ResultReportsTab } from "./ResultReportsTab";

export type ReportTabKey =
  | "overview"
  | "profitLoss"
  | "students"
  | "batches"
  | "admissions"
  | "fees"
  | "attendance"
  | "results";

interface TabItem {
  key: ReportTabKey;
  label: string;
  icon: LucideIcon;
  count?: number | string;
}

export function ReportsView({ initialData }: { initialData: ReportsData }) {
  const [data, setData] = useState<ReportsData>(initialData);
  const [activeTab, setActiveTab] = useState<ReportTabKey>("overview");
  const [datePreset, setDatePreset] = useState<"ALL" | "30D" | "90D" | "YTD" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  // Fetch updated data from API
  const applyFilters = (
    preset: "ALL" | "30D" | "90D" | "YTD" | "CUSTOM",
    customStart = startDate,
    customEnd = endDate,
    course = courseFilter,
    batch = batchFilter
  ) => {
    let start = "";
    let end = "";

    const today = new Date();
    if (preset === "30D") {
      start = format(subDays(today, 30), "yyyy-MM-dd");
      end = format(today, "yyyy-MM-dd");
    } else if (preset === "90D") {
      start = format(subDays(today, 90), "yyyy-MM-dd");
      end = format(today, "yyyy-MM-dd");
    } else if (preset === "YTD") {
      start = format(startOfYear(today), "yyyy-MM-dd");
      end = format(today, "yyyy-MM-dd");
    } else if (preset === "CUSTOM") {
      start = customStart;
      end = customEnd;
    }

    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (start) params.set("startDate", start);
        if (end) params.set("endDate", end);
        if (course !== "ALL") params.set("courseId", course);
        if (batch !== "ALL") params.set("batchId", batch);

        const res = await fetch(`/api/reports?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch reports");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error refreshing reports data:", err);
      }
    });
  };

  const handlePresetChange = (preset: "ALL" | "30D" | "90D" | "YTD") => {
    setDatePreset(preset);
    applyFilters(preset);
  };

  const handleCourseChange = (cId: string) => {
    setCourseFilter(cId);
    setBatchFilter("ALL"); // Reset batch when course changes
    applyFilters(datePreset, startDate, endDate, cId, "ALL");
  };

  const handleBatchChange = (bId: string) => {
    setBatchFilter(bId);
    applyFilters(datePreset, startDate, endDate, courseFilter, bId);
  };

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDatePreset("CUSTOM");
    applyFilters("CUSTOM", startDate, endDate);
  };

  const tabs: TabItem[] = [
    { key: "overview", label: "Executive Overview", icon: LayoutDashboard },
    { key: "profitLoss", label: "Profit & Loss (P&L)", icon: TrendingUp },
    { key: "students", label: "Student Reports", icon: Users, count: data.studentsReport.kpis.total },
    { key: "batches", label: "Batch Reports", icon: Layers, count: data.batchReport.kpis.totalBatches },
    { key: "admissions", label: "Admission Reports", icon: ClipboardList, count: data.admissionReport.kpis.totalApplications },
    { key: "fees", label: "Fee Reports", icon: Wallet },
    { key: "attendance", label: "Attendance Reports", icon: CalendarCheck, count: `${data.attendanceReport.kpis.overallAttendanceRate}%` },
    { key: "results", label: "Result Reports", icon: Award, count: `${data.resultReport.kpis.overallPassRate}%` },
  ];

  // Available batches filtered by selected course
  const availableBatches =
    courseFilter === "ALL"
      ? data.meta.batches
      : data.meta.batches.filter((b) => b.courseId === courseFilter);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Filter & Control Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-scholar-100 bg-white p-4 shadow-card w-full max-w-full min-w-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between w-full max-w-full min-w-0">
          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-scholar-400 flex items-center gap-1 shrink-0">
              <Calendar size={13} /> Timeframe:
            </span>
            <div className="flex flex-wrap rounded-xl bg-scholar-50 p-1 border border-scholar-100">
              <button
                type="button"
                onClick={() => handlePresetChange("ALL")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === "ALL"
                    ? "bg-white text-scholar-900 shadow-sm font-semibold"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("30D")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === "30D"
                    ? "bg-white text-scholar-900 shadow-sm font-semibold"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("90D")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === "90D"
                    ? "bg-white text-scholar-900 shadow-sm font-semibold"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                Last 90 Days
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("YTD")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === "YTD"
                    ? "bg-white text-scholar-900 shadow-sm font-semibold"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                This Year
              </button>
            </div>

            {/* Custom Range Form */}
            <form onSubmit={handleCustomDateSubmit} className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="rounded-lg border border-scholar-100 bg-scholar-50/50 px-2 py-1 text-xs text-scholar-700 focus:bg-white focus:outline-none"
              />
              <span className="text-xs text-scholar-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="rounded-lg border border-scholar-100 bg-scholar-50/50 px-2 py-1 text-xs text-scholar-700 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!startDate || !endDate}
                className="rounded-lg bg-scholar-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-scholar-700 disabled:opacity-40 cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>

          {/* Right Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-white px-3 py-1.5 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Courses</option>
              {data.meta.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Batch Filter */}
            <select
              value={batchFilter}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-white px-3 py-1.5 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Batches</option>
              {availableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => applyFilters(datePreset)}
              disabled={isPending}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-scholar-100 bg-white text-scholar-500 hover:text-scholar-900 disabled:opacity-50 shadow-2xs cursor-pointer"
              title="Refresh reports data"
            >
              <RotateCw size={14} className={isPending ? "animate-spin text-scholar-600" : ""} />
            </button>

            {/* Print View */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-scholar-100 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="w-full max-w-full overflow-x-auto border-t border-scholar-100 pt-3 no-scrollbar">
          <div className="flex gap-1.5 min-w-max pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-scholar-700 text-white shadow-xs"
                      : "text-scholar-600 hover:bg-scholar-50 hover:text-scholar-900"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-marigold-400" : "text-scholar-400"} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-scholar-100 text-scholar-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Tab Content */}
      <div className={`transition-opacity duration-150 w-full max-w-full min-w-0 ${isPending ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
        {activeTab === "overview" && (
          <OverviewTab data={data} onNavigateTab={(tab) => setActiveTab(tab as ReportTabKey)} />
        )}
        {activeTab === "profitLoss" && <ProfitLossReportsTab data={data} />}
        {activeTab === "students" && <StudentReportsTab data={data} />}
        {activeTab === "batches" && <BatchReportsTab data={data} />}
        {activeTab === "admissions" && <AdmissionReportsTab data={data} />}
        {activeTab === "fees" && <FeeReportsTab data={data} />}
        {activeTab === "attendance" && <AttendanceReportsTab data={data} />}
        {activeTab === "results" && <ResultReportsTab data={data} />}
      </div>
    </div>
  );
}
