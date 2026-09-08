"use client";

import { useState, useMemo } from "react";
import { Search, Download } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Badge, admissionStatusTone } from "@/components/ui/Badge";
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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Admission KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <KpiCard
          label="Total Applications"
          value={admissionReport.kpis.totalApplications.toString()}
          iconName="ClipboardList"
          accent="scholar"
        />
        <KpiCard
          label="Conversion Rate"
          value={`${admissionReport.kpis.conversionRate}%`}
          iconName="TrendingUp"
          accent="marigold"
          trend={`${admissionReport.kpis.enrolledCount} enrolled students`}
          trendTone="success"
        />
        <KpiCard
          label="Pending Review"
          value={admissionReport.kpis.pendingCount.toString()}
          iconName="Clock"
          accent="scholar"
        />
        <KpiCard
          label="Total Pipeline Value"
          value={formatCurrency(admissionReport.kpis.pipelineValue)}
          iconName="IndianRupee"
          accent="marigold"
          trend={`${formatCurrency(admissionReport.kpis.enrolledValue)} realized`}
          trendTone="success"
        />
      </Box>

      {/* Admission Funnel Pills */}
      <Card sx={{ p: 2, bgcolor: "rgba(238,242,247,0.5)" }}>
        <Typography
          variant="caption"
          sx={{ fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", display: "block", mb: 1.25 }}
        >
          Admission Funnel Distribution
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 1.5 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", boxShadow: "0 1px 2px rgba(13,26,42,0.04)" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8" }}>1. Total Inquiries</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: "var(--font-sora)", fontSize: "1.25rem", fontWeight: 700, color: "#171A21" }}>
              {admissionReport.kpis.totalApplications}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", boxShadow: "0 1px 2px rgba(13,26,42,0.04)" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#64748b" }}>2. Pending Action</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: "var(--font-sora)", fontSize: "1.25rem", fontWeight: 700, color: "#1E3A5F" }}>
              {admissionReport.kpis.pendingCount}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#FDE68A", bgcolor: "white", boxShadow: "0 1px 2px rgba(13,26,42,0.04)" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#D68F26" }}>3. Approved</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: "var(--font-sora)", fontSize: "1.25rem", fontWeight: 700, color: "#92400E" }}>
              {admissionReport.kpis.approvedCount}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#A7F3D0", bgcolor: "white", boxShadow: "0 1px 2px rgba(13,26,42,0.04)" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#059669" }}>4. Enrolled</Typography>
            <Typography sx={{ mt: 0.5, fontFamily: "var(--font-sora)", fontSize: "1.25rem", fontWeight: 700, color: "#065F46" }}>
              {admissionReport.kpis.enrolledCount} ({admissionReport.kpis.conversionRate}%)
            </Typography>
          </Paper>
        </Box>
      </Card>

      {/* Filters Toolbar */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 1.5, alignItems: { lg: "center" }, justifyContent: "space-between" }}>
          <TextField
            size="small"
            placeholder="Search admissions by applicant name, mobile, email, course..."
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
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="admission-status-label" sx={{ fontSize: "0.75rem" }}>Application Status</InputLabel>
              <Select
                labelId="admission-status-label"
                label="Application Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
              >
                <MenuItem value="ALL">All Application Statuses ({admissionReport.admissions.length})</MenuItem>
                <MenuItem value="ENROLLED">Enrolled ({admissionReport.kpis.enrolledCount})</MenuItem>
                <MenuItem value="APPROVED">Approved ({admissionReport.kpis.approvedCount})</MenuItem>
                <MenuItem value="PENDING">Pending ({admissionReport.kpis.pendingCount})</MenuItem>
                <MenuItem value="REJECTED">Rejected ({admissionReport.kpis.rejectedCount})</MenuItem>
              </Select>
            </FormControl>

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
          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>
            Showing {filteredAdmissions.length} of {admissionReport.admissions.length} admissions
          </Typography>
          {(searchTerm || statusFilter !== "ALL") && (
            <Button size="small" onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); }} sx={{ fontSize: "0.70rem", fontWeight: 500, color: "#475569", textTransform: "none", p: 0, minWidth: 0 }}>
              Reset filters
            </Button>
          )}
        </Box>
      </Card>

      {/* Admissions Table */}
      <Card sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                <TableCell>Applicant</TableCell>
                <TableCell>Course &amp; Batch</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell align="right">Fee Plan</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Application Date</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                    No admission applications found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdmissions.map((a) => (
                  <TableRow key={a.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93", fontSize: "0.70rem", fontWeight: 600 }} variant="rounded">
                          {initials(a.applicantName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{a.applicantName}</Typography>
                          <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{a.mobile}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{a.courseName}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{a.batchName}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.80rem", color: "#475569" }}>{a.branchName}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem", fontFamily: "var(--font-sora)" }}>{formatCurrency(a.feePlan)}</TableCell>
                    <TableCell>
                      <Badge tone={admissionStatusTone(a.status)} dot>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(a.createdAt)}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.note || "—"}</TableCell>
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
