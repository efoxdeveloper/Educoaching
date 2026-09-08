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
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";

export function StudentReportsTab({ data }: { data: ReportsData }) {
  const { studentsReport, overview } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [duesOnly, setDuesOnly] = useState(false);

  // Filter students — branch-isolated via getReportsData(instituteId, activeBranchId) — visual only
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Student KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <KpiCard
          label="Total Students"
          value={studentsReport.kpis.total.toLocaleString("en-IN")}
          iconName="Users"
          accent="scholar"
        />
        <KpiCard
          label="Active Students"
          value={`${studentsReport.kpis.active} (${overview.activeStudentsPct}%)`}
          iconName="CheckCircle2"
          accent="scholar"
        />
        <KpiCard
          label="Total Assessed Fees"
          value={formatCurrency(studentsReport.kpis.totalBilled)}
          iconName="IndianRupee"
          accent="marigold"
        />
        <KpiCard
          label="Total Outstanding Dues"
          value={formatCurrency(studentsReport.kpis.totalPending)}
          iconName="AlertCircle"
          accent="marigold"
          trend={`${studentsReport.kpis.collectionEfficiency}% collection rate`}
          trendTone="success"
        />
      </Box>

      {/* Course Enrollment Breakdown Pills — Card/Paper */}
      {studentsReport.courseBreakdown.length > 0 && (
        <Card sx={{ p: 2, bgcolor: "rgba(238,242,247,0.5)" }}>
          <Typography variant="caption" sx={{ fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", display: "block", mb: 1.25 }}>
            Enrollment by Course
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
            {studentsReport.courseBreakdown.map((c) => (
              <Paper
                key={c.name}
                variant="outlined"
                sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white" }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>{c.name}:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 500, color: "#475569", fontSize: "0.75rem" }}>{c.count} students</Typography>
                <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>({formatCurrency(c.billed)})</Typography>
              </Paper>
            ))}
          </Box>
        </Card>
      )}

      {/* Filters Bar & Controls — MUI TextField/Select/Checkbox/Button */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 1.5, alignItems: { lg: "center" }, justifyContent: "space-between" }}>
          <TextField
            size="small"
            placeholder="Search students by name, mobile, email, course, batch..."
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
            sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem" } }}
          />

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="students-report-status-label" sx={{ fontSize: "0.75rem" }}>Status</InputLabel>
              <Select
                labelId="students-report-status-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">Active ({studentsReport.kpis.active})</MenuItem>
                <MenuItem value="ON_HOLD">On Hold ({studentsReport.kpis.onHold})</MenuItem>
                <MenuItem value="INACTIVE">Inactive ({studentsReport.kpis.inactive})</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="students-report-plan-label" sx={{ fontSize: "0.75rem" }}>Plan</InputLabel>
              <Select
                labelId="students-report-plan-label"
                label="Plan"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
              >
                <MenuItem value="ALL">All Plans</MenuItem>
                <MenuItem value="MONTHLY">Monthly Regular</MenuItem>
                <MenuItem value="DEMO">Demo / Trial</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Checkbox checked={duesOnly} onChange={(e) => setDuesOnly(e.target.checked)} size="small" sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }} />}
              label={<Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#334155" }}>With Dues Only</Typography>}
              sx={{ m: 0, border: "1px solid #D6E0EB", borderRadius: "12px", px: 1.25, py: 0.25, bgcolor: "white" }}
            />

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

        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #F1F5F9", pt: 1.25 }}>
          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>Showing {filteredStudents.length} of {studentsReport.students.length} students</Typography>
          {(searchTerm || statusFilter !== "ALL" || planFilter !== "ALL" || duesOnly) && (
            <Button size="small" onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); setPlanFilter("ALL"); setDuesOnly(false); }} sx={{ fontSize: "0.70rem", fontWeight: 500, color: "#475569", textTransform: "none", p: 0, minWidth: 0 }}>
              Reset filters
            </Button>
          )}
        </Box>
      </Card>

      {/* Students Data Table — MUI Table */}
      <Card sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                <TableCell>Student</TableCell>
                <TableCell>Course & Batch</TableCell>
                <TableCell>Admission Date</TableCell>
                <TableCell>Status & Plan</TableCell>
                <TableCell align="right">Total Fee</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Balance Due</TableCell>
                <TableCell>Due Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                    No students match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s) => (
                  <TableRow key={s.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93", fontSize: "0.70rem", fontWeight: 600 }} variant="rounded">
                          {initials(s.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{s.name}</Typography>
                          <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{s.mobile}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{s.courseName}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{s.batchName}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(s.admissionDate)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
                        <Badge tone={studentStatusTone(s.status)} dot>
                          {s.status}
                        </Badge>
                        <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                          {s.plan === "DEMO" ? "7-Day Trial" : "Regular"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{formatCurrency(s.totalFee)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: "#059669", fontSize: "0.80rem" }}>{formatCurrency(s.paidFee)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.80rem", color: s.pendingFee > 0 ? "#DC2626" : "#059669" }}>{s.pendingFee > 0 ? formatCurrency(s.pendingFee) : "₹0"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {s.dueDate ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: s.isOverdue ? "#DC2626" : "#475569", fontWeight: s.isOverdue ? 600 : 400 }}>{formatDate(s.dueDate)}</Typography>
                          {s.isOverdue && <Chip label="OVERDUE" size="small" sx={{ height: 16, fontSize: "10px", fontWeight: 700, bgcolor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }} />}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: "#94A3B8" }}>—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
