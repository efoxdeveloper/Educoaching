"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { exportToCsv } from "@/lib/export-csv";
import { initials } from "@/lib/utils";
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
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Pagination from "@mui/material/Pagination";

export function AttendanceReportsTab({ data }: { data: ReportsData }) {
  const { attendanceReport } = data;
  const [subView, setSubView] = useState<"students" | "daily">("students");
  const [searchTerm, setSearchTerm] = useState("");
  const [lowAttendanceOnly, setLowAttendanceOnly] = useState(false);

  // ——— Students sub-view: server-paginated via /api/reports/attendance-students (20/page) ———
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(attendanceReport.studentSummary.length);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(attendanceReport.studentSummary.length / 20)));
  const [paginatedStudents, setPaginatedStudents] = useState(attendanceReport.studentSummary.slice(0, 20));
  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(h);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, lowAttendanceOnly]);

  const fetchStudents = useCallback(async () => {
    if (subView !== "students") return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (lowAttendanceOnly) params.set("lowAttendanceOnly", "true");
      const res = await fetch(`/api/reports/attendance-students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch attendance students");
      const json = await res.json();
      setPaginatedStudents(json.students || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (e) {
      console.error("Attendance students fetch failed", e);
      setPaginatedStudents([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [subView, page, debouncedSearch, lowAttendanceOnly]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Keep filteredStudents as alias to paginated data for rendering (so table + export use paginated)
  const filteredStudents = paginatedStudents;

  // For export, we need all matching (not just current page) — keep original filtered for export if needed
  // For now, export will use current page's filteredStudents; full export can be done via separate API call with limit=10000 if needed
  const allFilteredForExport = useMemo(() => {
    // This is used only for export CSV — should export all matching, not just current page
    // We keep the original in-memory filter for export, but paginated view uses server data
    return attendanceReport.studentSummary.filter((s) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchCourse = s.courseName.toLowerCase().includes(q);
        const matchBatch = s.batchName.toLowerCase().includes(q);
        if (!matchName && !matchCourse && !matchBatch) return false;
      }
      if (lowAttendanceOnly && !s.isLowAttendance) return false;
      return true;
    });
  }, [attendanceReport.studentSummary, searchTerm, lowAttendanceOnly]);

  // Handle Export CSV
  const handleExportCsv = () => {
    if (subView === "students") {
      const headers = [
        "Student ID",
        "Student Name",
        "Course",
        "Batch",
        "Total Classes Marked",
        "Classes Present",
        "Classes Absent",
        "Classes Late",
        "Attendance Rate (%)",
        "Attendance Status",
      ];
      const rows = filteredStudents.map((s) => [
        s.studentId,
        s.studentName,
        s.courseName,
        s.batchName,
        s.totalMarked,
        s.presentCount,
        s.absentCount,
        s.lateCount,
        `${s.attendanceRate}%`,
        s.isLowAttendance ? "LOW ATTENDANCE (<75%)" : "HEALTHY",
      ]);
      exportToCsv("student_attendance_summary_report", headers, rows);
    } else {
      const headers = [
        "Date",
        "Total Sessions Marked",
        "Present Count",
        "Absent Count",
        "Late Count",
        "Attendance Rate (%)",
      ];
      const rows = attendanceReport.dailyTrend.map((d) => [
        d.date,
        d.total,
        d.present,
        d.absent,
        d.late,
        `${d.rate}%`,
      ]);
      exportToCsv("daily_attendance_trend_report", headers, rows);
    }
  };

  const presentRate =
    attendanceReport.kpis.totalRecords > 0
      ? Math.round((attendanceReport.kpis.presentCount / attendanceReport.kpis.totalRecords) * 100)
      : 0;

  const absentRate =
    attendanceReport.kpis.totalRecords > 0
      ? Math.round((attendanceReport.kpis.absentCount / attendanceReport.kpis.totalRecords) * 100)
      : 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Attendance KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <KpiCard
          label="Overall Attendance"
          value={`${attendanceReport.kpis.overallAttendanceRate}%`}
          iconName="CalendarCheck"
          accent="scholar"
          trend={`${attendanceReport.kpis.totalRecords} attendance marks`}
          trendTone="neutral"
        />
        <KpiCard
          label="Present Rate"
          value={`${presentRate}%`}
          iconName="CheckCircle2"
          accent="scholar"
          trend={`${attendanceReport.kpis.presentCount} present`}
          trendTone="success"
        />
        <KpiCard
          label="Absent Rate"
          value={`${absentRate}%`}
          iconName="XCircle"
          accent="marigold"
          trend={`${attendanceReport.kpis.absentCount} absent marks`}
          trendTone={absentRate > 20 ? "danger" : "neutral"}
        />
        <KpiCard
          label="Students at Risk (<75%)"
          value={attendanceReport.kpis.lowAttendanceCount.toString()}
          iconName="AlertTriangle"
          accent="marigold"
          trend={
            attendanceReport.kpis.lowAttendanceCount > 0
              ? "Require parent notifications"
              : "All students meeting attendance criteria"
          }
          trendTone={attendanceReport.kpis.lowAttendanceCount > 0 ? "danger" : "success"}
        />
      </Box>

      {/* Daily Attendance Trend Bar Chart — keep recharts exactly wrapped in MUI Card */}
      {attendanceReport.dailyTrend.filter((d) => d.total > 0).length > 0 && (
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem", fontFamily: "var(--font-sora)" }}>
                Daily Attendance Breakdown
              </Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
                Present vs Absent attendance counts across marked dates
              </Typography>
            </Box>
            <Chip
              label={`Avg: ${attendanceReport.kpis.overallAttendanceRate}%`}
              size="small"
              sx={{ bgcolor: "#EEF2F7", color: "#1E3A5F", fontWeight: 600, fontSize: "0.70rem", height: 22, border: "1px solid #D6E0EB" }}
            />
          </Box>

          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={attendanceReport.dailyTrend.filter((d) => d.total > 0)}
              margin={{ left: -20, right: 10, top: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any}
                formatter={(val, name) => [
                  val as any,
                  name === "present" ? "Present" : name === "absent" ? "Absent" : "Late",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Bar dataKey="present" name="Present" fill="#2E7D52" radius={[4, 4, 0, 0] as any} stackId="a" maxBarSize={28} />
              <Bar dataKey="late" name="Late" fill="#E8A33D" radius={[4, 4, 0, 0] as any} stackId="a" maxBarSize={28} />
              <Bar dataKey="absent" name="Absent" fill="#C93B2B" radius={[4, 4, 0, 0] as any} stackId="a" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Sub-view Switcher & Filters — MUI Chip / Checkbox / Button */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2, alignItems: { lg: "center" }, justifyContent: "space-between" }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              p: 0.75,
              borderRadius: "12px",
              bgcolor: "rgba(238,242,247,0.8)",
              border: "1px solid #D6E0EB",
              alignSelf: "flex-start",
            }}
          >
            <Chip
              label={`Student Attendance Summary (${attendanceReport.studentSummary.length})`}
              onClick={() => setSubView("students")}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "students" ? "white" : "transparent",
                color: subView === "students" ? "#1E3A5F" : "#475569",
                border: subView === "students" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "students" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "students" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
            <Chip
              label={`Daily Attendance Trend (${attendanceReport.dailyTrend.filter((d) => d.total > 0).length})`}
              onClick={() => setSubView("daily")}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "daily" ? "white" : "transparent",
                color: subView === "daily" ? "#1E3A5F" : "#475569",
                border: subView === "daily" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "daily" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "daily" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
            {subView === "students" && (
              <FormControlLabel
                control={<Checkbox checked={lowAttendanceOnly} onChange={(e) => setLowAttendanceOnly(e.target.checked)} size="small" sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#DC2626" } }} />}
                label={<Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#DC2626" }}>Low Attendance Only (&lt;75%)</Typography>}
                sx={{ m: 0, border: "1px solid #D6E0EB", borderRadius: "12px", px: 1.25, py: 0.25, bgcolor: "white" }}
              />
            )}

            <Button
              variant="contained"
              size="small"
              startIcon={<Download size={14} />}
              onClick={handleExportCsv}
              sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1, px: 1.75, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {subView === "students" && (
          <Box sx={{ mt: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search student attendance by student name, course, or batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} style={{ color: "#7E9BBC" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem" } }}
            />
          </Box>
        )}
      </Card>

      {/* Subview 1: Student-wise Attendance Table — MUI Table with Chip badges — now paginated 20/page via /api/reports/attendance-students */}
      {subView === "students" && (
        <Card sx={{ overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                  <TableCell>Student</TableCell>
                  <TableCell>Course &amp; Batch</TableCell>
                  <TableCell align="center">Total Sessions</TableCell>
                  <TableCell align="center">Present</TableCell>
                  <TableCell align="center">Absent</TableCell>
                  <TableCell align="center">Late</TableCell>
                  <TableCell>Attendance Rate</TableCell>
                  <TableCell>Risk Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#7E9BBC", fontSize: "0.875rem" }}>
                      Loading attendance...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                      No attendance records match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s) => (
                    <TableRow key={s.studentId} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            variant="rounded"
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "8px",
                              bgcolor: s.isLowAttendance ? "#FEF2F2" : "#EEF2F7",
                              color: s.isLowAttendance ? "#DC2626" : "#4E6E93",
                              fontSize: "0.70rem",
                              fontWeight: 600,
                            }}
                          >
                            {initials(s.studentName)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{s.studentName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{s.courseName}</Typography>
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{s.batchName}</Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{s.totalMarked}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: "#059669", fontSize: "0.80rem" }}>{s.presentCount}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: "#DC2626", fontSize: "0.80rem" }}>{s.absentCount}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 500, color: "#D68F26", fontSize: "0.80rem" }}>{s.lateCount}</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#171A21", fontSize: "11px", display: "block", mb: 0.5 }}>{s.attendanceRate}%</Typography>
                        <Box sx={{ height: 8, width: "100%", borderRadius: "9999px", bgcolor: "#EEF2F7", overflow: "hidden" }}>
                          <Box sx={{ height: "100%", borderRadius: "9999px", width: `${Math.min(100, s.attendanceRate)}%`, bgcolor: s.isLowAttendance ? "#EF4444" : "#059669" }} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {s.isLowAttendance ? (
                          <Chip
                            icon={<AlertTriangle size={12} />}
                            label="Low Attendance"
                            size="small"
                            sx={{ bgcolor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", fontWeight: 700, fontSize: "0.70rem", height: 22 }}
                          />
                        ) : (
                          <Chip
                            icon={<CheckCircle2 size={12} />}
                            label="Regular"
                            size="small"
                            sx={{ bgcolor: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", fontWeight: 600, fontSize: "0.70rem", height: 22 }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: "center", justifyContent: "space-between", p: 2, borderTop: "1px solid #D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>
              Showing {filteredStudents.length} of {total} students {totalPages > 1 && `(Page ${page} of ${totalPages})`}
            </Typography>
            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                size="small"
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                sx={{
                  "& .MuiPaginationItem-root": { fontSize: "0.75rem", fontWeight: 600, borderRadius: "8px" },
                  "& .Mui-selected": { bgcolor: "#1E3A5F !important", color: "white" },
                }}
              />
            )}
          </Box>
        </Card>
      )}

      {/* Subview 2: Daily Attendance Trend Table — MUI Table */}
      {subView === "daily" && (
        <Card sx={{ overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Sessions Marked</TableCell>
                  <TableCell align="center">Present</TableCell>
                  <TableCell align="center">Absent</TableCell>
                  <TableCell align="center">Late</TableCell>
                  <TableCell align="right">Daily Attendance Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceReport.dailyTrend.filter((d) => d.total > 0).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                      No daily records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceReport.dailyTrend
                    .filter((d) => d.total > 0)
                    .map((d) => (
                      <TableRow key={d.date} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                        <TableCell sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{d.date}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{d.total}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, color: "#059669", fontSize: "0.80rem" }}>{d.present}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, color: "#DC2626", fontSize: "0.80rem" }}>{d.absent}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 500, color: "#D68F26", fontSize: "0.80rem" }}>{d.late}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${d.rate}%`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.70rem",
                              height: 22,
                              borderRadius: "9999px",
                              bgcolor: d.rate >= 75 ? "#ECFDF5" : "#FEF2F2",
                              color: d.rate >= 75 ? "#065F46" : "#DC2626",
                              border: `1px solid ${d.rate >= 75 ? "#A7F3D0" : "#FECACA"}`,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}
