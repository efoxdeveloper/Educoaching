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
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import CircularProgress from "@mui/material/CircularProgress";

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

  // Fetch updated data from API — branch-isolated via getReportsData(instituteId, activeBranchId) on page.tsx:19
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Top Filter & Control Bar — MUI Paper */}
      <Paper
        variant="outlined"
        sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", boxShadow: "0 1px 2px rgba(13,26,42,0.04)", display: "flex", flexDirection: "column", gap: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}
      >
        {/* Row 1: Course + Batch — fixed row */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { xs: "stretch", sm: "center" }, width: "100%" }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
            <InputLabel id="reports-course-label" sx={{ fontSize: "0.75rem" }}>Course</InputLabel>
            <Select
              labelId="reports-course-label"
              label="Course"
              value={courseFilter}
              onChange={(e) => handleCourseChange(e.target.value)}
              sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500, height: 40 }}
            >
              <MenuItem value="ALL">All Courses</MenuItem>
              {data.meta.courses.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.75rem" }}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
            <InputLabel id="reports-batch-label" sx={{ fontSize: "0.75rem" }}>Batch</InputLabel>
            <Select
              labelId="reports-batch-label"
              label="Batch"
              value={batchFilter}
              onChange={(e) => handleBatchChange(e.target.value)}
              sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500, height: 40 }}
            >
              <MenuItem value="ALL">All Batches</MenuItem>
              {availableBatches.map((b) => (
                <MenuItem key={b.id} value={b.id} sx={{ fontSize: "0.75rem" }}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Row 2: timeframe preset pills — fixed row */}
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1, width: "100%", overflowX: "auto" }}>
          <Typography variant="caption" sx={{ fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, whiteSpace: "nowrap" }}>
            <Calendar size={13} /> Timeframe:
          </Typography>
          <Paper variant="outlined" sx={{ display: "flex", flexDirection: "row", borderRadius: "12px", bgcolor: "#F8FAFC", borderColor: "#D6E0EB", p: 0.5, gap: 0.5, flexShrink: 0 }}>
            {[
              { id: "ALL", label: "All Time" },
              { id: "30D", label: "Last 30 Days" },
              { id: "90D", label: "Last 90 Days" },
              { id: "YTD", label: "This Year" },
            ].map((preset) => (
              <Chip
                key={preset.id}
                label={preset.label}
                clickable
                onClick={() => handlePresetChange(preset.id as any)}
                size="small"
                sx={{
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.70rem",
                  height: 26,
                  bgcolor: datePreset === preset.id ? "white" : "transparent",
                  color: datePreset === preset.id ? "#1E3A5F" : "#475569",
                  border: datePreset === preset.id ? "1px solid #D6E0EB" : "1px solid transparent",
                  boxShadow: datePreset === preset.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  "&:hover": { bgcolor: datePreset === preset.id ? "white" : "#EEF2F7" },
                }}
              />
            ))}
          </Paper>
        </Box>

        {/* Row 3: custom Date from + Apply — fixed row */}
        <Box component="form" onSubmit={handleCustomDateSubmit} sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 0.75, width: "100%" }}>
          <TextField
            size="small"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "rgba(238,242,247,0.5)", fontSize: "0.75rem", height: 32 }, "& .MuiOutlinedInput-input": { py: 0.5, px: 1 } }}
          />
          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC", flexShrink: 0 }}>to</Typography>
          <TextField
            size="small"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "rgba(238,242,247,0.5)", fontSize: "0.75rem", height: 32 }, "& .MuiOutlinedInput-input": { py: 0.5, px: 1 } }}
          />
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={!startDate || !endDate}
            sx={{ borderRadius: "8px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.5, minHeight: 32, flexShrink: 0, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
          >
            Apply
          </Button>
        </Box>

        {/* Row 2: Actions — Export/Print grouped */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ flexWrap: "wrap", alignItems: { xs: "stretch", sm: "center" }, gap: 1 }}
          useFlexGap
        >
          <IconButton
            size="small"
            onClick={() => applyFilters(datePreset)}
            disabled={isPending}
            sx={{ width: { xs: "100%", sm: 40 }, height: 36, borderRadius: "12px", border: "1px solid #D6E0EB", bgcolor: "white", color: "#64748b", "&:hover": { color: "#1E3A5F", bgcolor: "#F8FAFC" } }}
            title="Refresh reports data"
          >
            {isPending ? <CircularProgress size={14} sx={{ color: "#4E6E93" }} /> : <RotateCw size={14} />}
          </IconButton>

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const params = new URLSearchParams();
              if (startDate) params.set("startDate", startDate);
              if (endDate) params.set("endDate", endDate);
              if (courseFilter !== "ALL") params.set("courseId", courseFilter);
              if (batchFilter !== "ALL") params.set("batchId", batchFilter);
              params.set("format", "xlsx");
              window.location.href = `/api/reports/export?${params.toString()}`;
            }}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#334155", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", bgcolor: "white", height: 36, width: { xs: "100%", sm: "auto" }, "&:hover": { bgcolor: "#F8FAFC" } }}
          >
            Export Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const params = new URLSearchParams();
              if (startDate) params.set("startDate", startDate);
              if (endDate) params.set("endDate", endDate);
              if (courseFilter !== "ALL") params.set("courseId", courseFilter);
              if (batchFilter !== "ALL") params.set("batchId", batchFilter);
              params.set("format", "pdf");
              window.location.href = `/api/reports/export?${params.toString()}`;
            }}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#334155", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", bgcolor: "white", height: 36, width: { xs: "100%", sm: "auto" }, "&:hover": { bgcolor: "#F8FAFC" } }}
          >
            Export PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Printer size={14} />}
            onClick={() => window.print()}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#334155", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", bgcolor: "white", height: 36, width: { xs: "100%", sm: "auto" }, "&:hover": { bgcolor: "#F8FAFC" } }}
          >
            Print
          </Button>
        </Stack>

        {/* Tab Navigation Bar — MUI Tabs */}
        <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "auto", borderTop: "1px solid #D6E0EB", pt: 1, "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as ReportTabKey)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              "& .MuiTabs-indicator": { bgcolor: "#1E3A5F", height: 2, borderRadius: 999 },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.75rem",
                minHeight: 36,
                py: 0.75,
                px: 1.75,
                borderRadius: "12px",
                color: "#64748b",
                "&.Mui-selected": { color: "#1E3A5F", bgcolor: "rgba(30,58,95,0.06)" },
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                value={tab.key}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <tab.icon size={15} style={{ color: activeTab === tab.key ? "#E8A33D" : "#94A3B8" }} />
                    {tab.label}
                    {tab.count !== undefined && (
                      <Chip
                        label={tab.count}
                        size="small"
                        sx={{
                          ml: 0.5,
                          height: 16,
                          fontSize: "10px",
                          fontWeight: 700,
                          bgcolor: activeTab === tab.key ? "rgba(30,58,95,0.1)" : "#EEF2F7",
                          color: activeTab === tab.key ? "#1E3A5F" : "#475569",
                          border: "1px solid #D6E0EB",
                        }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>
      </Paper>

      {/* Active Tab Content */}
      <Box sx={{ opacity: isPending ? 0.6 : 1, pointerEvents: isPending ? "none" : "auto", transition: "opacity 0.15s", width: "100%", maxWidth: "100%", minWidth: 0 }}>
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
      </Box>
    </Box>
  );
}
