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
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";

export function OverviewTab({
  data,
  onNavigateTab,
}: {
  data: ReportsData;
  onNavigateTab: (tab: string) => void;
}) {
  const { overview, batchReport, admissionReport, feeReport, attendanceReport, resultReport } = data;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Top Level 6-Domain Summary KPIs — MUI Card/Paper */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr", xl: "repeat(6, 1fr)" }, gap: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <Paper
          variant="outlined"
          onClick={() => onNavigateTab("students")}
          sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", cursor: "pointer", transition: "all 0.15s", "&:hover": { borderColor: "#94A3B8", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>Students</Typography>
            <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93" }}><Users size={16} /></Avatar>
          </Box>
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: "#171A21", fontSize: "1.5rem" }}>{overview.totalStudents}</Typography>
          <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{overview.activeStudents} active ({overview.activeStudentsPct}%)</Typography>
            <ArrowRight size={12} style={{ color: "#94A3B8", opacity: 0.6 }} />
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          onClick={() => onNavigateTab("batches")}
          sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", cursor: "pointer", transition: "all 0.15s", "&:hover": { borderColor: "#94A3B8", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>Batches</Typography>
            <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93" }}><Layers size={16} /></Avatar>
          </Box>
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: "#171A21", fontSize: "1.5rem" }}>{overview.totalBatches}</Typography>
          <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{overview.overallBatchOccupancy}% occupancy</Typography>
            <ArrowRight size={12} style={{ color: "#94A3B8", opacity: 0.6 }} />
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          onClick={() => onNavigateTab("admissions")}
          sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", cursor: "pointer", transition: "all 0.15s", "&:hover": { borderColor: "#E8A33D", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>Admissions</Typography>
            <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#FFFBEB", color: "#D97706" }}><ClipboardList size={16} /></Avatar>
          </Box>
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: "#171A21", fontSize: "1.5rem" }}>{overview.totalAdmissions}</Typography>
          <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{overview.enrolledAdmissions} enrolled ({overview.admissionConversionRate}%)</Typography>
            <ArrowRight size={12} style={{ color: "#94A3B8", opacity: 0.6 }} />
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          onClick={() => onNavigateTab("fees")}
          sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", cursor: "pointer", transition: "all 0.15s", "&:hover": { borderColor: "#10B981", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>Collection</Typography>
            <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#ECFDF5", color: "#059669" }}><Wallet size={16} /></Avatar>
          </Box>
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: "#171A21", fontSize: "1.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatCurrency(overview.totalPaidFee)}</Typography>
          <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{overview.feeCollectionEfficiency}% recovered</Typography>
            <ArrowRight size={12} style={{ color: "#94A3B8", opacity: 0.6 }} />
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          onClick={() => onNavigateTab("attendance")}
          sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", cursor: "pointer", transition: "all 0.15s", "&:hover": { borderColor: "#94A3B8", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>Attendance</Typography>
            <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93" }}><CalendarCheck size={16} /></Avatar>
          </Box>
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: "#171A21", fontSize: "1.5rem" }}>{overview.overallAttendanceRate}%</Typography>
          <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", color: overview.lowAttendanceStudentsCount > 0 ? "#DC2626" : "#7E9BBC", fontWeight: overview.lowAttendanceStudentsCount > 0 ? 600 : 400 }}>
              {overview.lowAttendanceStudentsCount > 0 ? `${overview.lowAttendanceStudentsCount} low (<75%)` : "Healthy rates"}
            </Typography>
            <ArrowRight size={12} style={{ color: "#94A3B8", opacity: 0.6 }} />
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          onClick={() => onNavigateTab("results")}
          sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", cursor: "pointer", transition: "all 0.15s", "&:hover": { borderColor: "#E8A33D", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>Test Pass %</Typography>
            <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#FFFBEB", color: "#D97706" }}><Award size={16} /></Avatar>
          </Box>
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700, color: "#171A21", fontSize: "1.5rem" }}>{overview.overallPassRate}%</Typography>
          <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>Avg {overview.instituteAverageScore}% ({overview.totalTests} tests)</Typography>
            <ArrowRight size={12} style={{ color: "#94A3B8", opacity: 0.6 }} />
          </Box>
        </Paper>
      </Box>

      {/* Visual Charts Grid — keep recharts exactly */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Fee Collection Trend</Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>Monthly total collections (INR)</Typography>
            </Box>
            <Chip icon={<TrendingUp size={12} />} label={`${overview.feeCollectionEfficiency}% Recovered`} size="small" sx={{ bgcolor: "#ECFDF5", color: "#065f46", border: "1px solid #A7F3D0", fontWeight: 600, fontSize: "0.70rem", height: 22 }} />
          </Box>

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
                contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any}
                formatter={(val) => [`₹${Number(val ?? 0).toLocaleString("en-IN")}`, "Collected"]}
              />
              <Area type="monotone" dataKey="amount" stroke="#1E3A5F" strokeWidth={2.5} fill="url(#reportsFeeFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Students by Course</Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>Enrollment distribution across active offerings</Typography>
            </Box>
            <Button size="small" onClick={() => onNavigateTab("students")} sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#4E6E93", textTransform: "none" }}>
              View list →
            </Button>
          </Box>

          {overview.studentCourseBreakdown.length === 0 ? (
            <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>No students enrolled yet.</Typography>
            </Box>
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
                  contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any}
                  formatter={(val, name, props) => [`${val} students`, props?.payload?.fullName ?? "Course"]}
                />
                <Bar dataKey="count" fill="#E8A33D" radius={[6, 6, 0, 0] as any} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Batch Capacity vs Enrolled</Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>Classroom utilization across batches</Typography>
            </Box>
            <Button size="small" onClick={() => onNavigateTab("batches")} sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#4E6E93", textTransform: "none" }}>
              Manage batches →
            </Button>
          </Box>

          {batchReport.batches.length === 0 ? (
            <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>No batches created yet.</Typography>
            </Box>
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
                  contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any}
                  formatter={(val, name) => [val, name === "enrolled" ? "Enrolled" : "Total Capacity"]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 } as any} />
                <Bar dataKey="enrolled" name="Enrolled" fill="#1E3A5F" radius={[4, 4, 0, 0] as any} maxBarSize={24} />
                <Bar dataKey="capacity" name="Capacity" fill="#D6E0EB" radius={[4, 4, 0, 0] as any} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Recent Daily Attendance</Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>Present vs Absent (last 14 days)</Typography>
            </Box>
            <Button size="small" onClick={() => onNavigateTab("attendance")} sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#4E6E93", textTransform: "none" }}>
              Detailed view →
            </Button>
          </Box>

          {attendanceReport.dailyTrend.filter((d) => d.total > 0).length === 0 ? (
            <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>No recent attendance marked.</Typography>
            </Box>
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
                  contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any}
                  formatter={(val, name) => [val, name === "present" ? "Present" : "Absent"]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 } as any} />
                <Bar dataKey="present" name="Present" fill="#2E7D52" radius={[4, 4, 0, 0] as any} stackId="a" maxBarSize={24} />
                <Bar dataKey="absent" name="Absent" fill="#C93B2B" radius={[4, 4, 0, 0] as any} stackId="a" maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Box>

      {/* Financial Health Summary Callout */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2 }}>
        <Card sx={{ p: 2.5, background: "linear-gradient(135deg, #1E3A5F 0%, #182F4C 100%)", color: "white", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "none" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "rgba(255,255,255,0.7)" }}>
              <Typography variant="caption" sx={{ fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,0.7)" }}>Total Dues Outstanding</Typography>
              <AlertTriangle size={16} style={{ color: "#E8A33D" }} />
            </Box>
            <Typography variant="h5" sx={{ mt: 1.5, fontWeight: 700, color: "white", fontSize: "1.75rem" }}>{formatCurrency(overview.totalPendingFee)}</Typography>
            <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
              Total assessed across all active students: {formatCurrency(overview.totalBilledFee)}
            </Typography>
          </Box>
          <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
              {feeReport.kpis.overdueCount} student(s) past due date
            </Typography>
            <Button size="small" onClick={() => onNavigateTab("fees")} sx={{ fontSize: "0.70rem", fontWeight: 600, color: "#E8A33D", textTransform: "none", p: 0, minWidth: 0, "&:hover": { color: "white", bgcolor: "transparent" } }}>
              Review Dues →
            </Button>
          </Box>
        </Card>

        <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b" }}>
              <Typography variant="caption" sx={{ fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b" }}>Admissions Pipeline</Typography>
              <ClipboardList size={16} style={{ color: "#64748b" }} />
            </Box>
            <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)" }}>
                <Typography variant="caption" sx={{ fontSize: "0.70rem", color: "#7E9BBC" }}>Total Enquiries</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#171A21", fontSize: "1.25rem" }}>{admissionReport.kpis.totalApplications}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#A7F3D0", bgcolor: "#ECFDF5" }}>
                <Typography variant="caption" sx={{ fontSize: "0.70rem", color: "#065f46" }}>Enrolled</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#065f46", fontSize: "1.25rem" }}>{admissionReport.kpis.enrolledCount}</Typography>
              </Paper>
            </Box>
            <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>Pending Decisions: {admissionReport.kpis.pendingCount}</Typography>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#171A21" }}>{admissionReport.kpis.conversionRate}% conversion</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #D6E0EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>Pipeline: {formatCurrency(admissionReport.kpis.pipelineValue)}</Typography>
            <Button size="small" onClick={() => onNavigateTab("admissions")} sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#4E6E93", textTransform: "none" }}>
              Admissions →
            </Button>
          </Box>
        </Card>

        <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b" }}>
              <Typography variant="caption" sx={{ fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b" }}>Academic Examinations</Typography>
              <Award size={16} style={{ color: "#64748b" }} />
            </Box>
            <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)" }}>
                <Typography variant="caption" sx={{ fontSize: "0.70rem", color: "#7E9BBC" }}>Exams Conducted</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#171A21", fontSize: "1.25rem" }}>{resultReport.kpis.totalTests}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#FDE68A", bgcolor: "#FFFBEB" }}>
                <Typography variant="caption" sx={{ fontSize: "0.70rem", color: "#92400e" }}>Submissions</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#92400e", fontSize: "1.25rem" }}>{resultReport.kpis.totalEvaluations}</Typography>
              </Paper>
            </Box>
            <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>Overall Pass Rate: {resultReport.kpis.overallPassRate}%</Typography>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#171A21" }}>Highest: {resultReport.kpis.highestMarkOverall} pts</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #D6E0EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>Institute Avg: {resultReport.kpis.instituteAverageScore}%</Typography>
            <Button size="small" onClick={() => onNavigateTab("results")} sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#4E6E93", textTransform: "none" }}>
              Exam Results →
            </Button>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
