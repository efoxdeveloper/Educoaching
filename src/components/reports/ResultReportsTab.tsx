"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Download, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { formatDate, initials } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";
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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Pagination from "@mui/material/Pagination";

export function ResultReportsTab({ data }: { data: ReportsData }) {
  const { resultReport } = data;
  const [subView, setSubView] = useState<"overview" | "ledger">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [testFilter, setTestFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Filtered test overview — KEEP as-is (overview sub-view is NOT paginated, per instruction)
  const filteredTests = useMemo(() => {
    return resultReport.tests.filter((t) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchSubject = t.subject.toLowerCase().includes(q);
        const matchBatch = t.batchName.toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchBatch) return false;
      }
      return true;
    });
  }, [resultReport.tests, searchTerm]);

  // ——— Ledger sub-view: server-paginated via /api/reports/results (page size 20) ———
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(resultReport.resultsLedger.length);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(Math.max(1, Math.ceil(resultReport.resultsLedger.length / 20)));
  const [ledgerResults, setLedgerResults] = useState<typeof resultReport.resultsLedger>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Debounce searchTerm for ledger API (350ms) — same as Students
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // Reset to page 1 when ledger filters change
  useEffect(() => {
    setLedgerPage(1);
  }, [debouncedSearch, testFilter, statusFilter]);

  const fetchLedger = useCallback(async () => {
    if (subView !== "ledger") return;
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(ledgerPage));
      params.set("limit", "20");
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (testFilter !== "ALL") params.set("testId", testFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/reports/results?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch ledger");
      const json = await res.json();
      setLedgerResults(json.results || []);
      setLedgerTotal(json.total || 0);
      setLedgerTotalPages(json.totalPages || 1);
    } catch (e) {
      console.error("Ledger fetch failed", e);
      // Fallback to empty on error — keeps table from crashing, shows 0 rows
      setLedgerResults([]);
      setLedgerTotal(0);
      setLedgerTotalPages(1);
    } finally {
      setLedgerLoading(false);
    }
  }, [subView, ledgerPage, debouncedSearch, testFilter, statusFilter]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Keep initial ledger count in sync if data prop changes (e.g., after global date/course filter in ReportsView)
  useEffect(() => {
    if (subView === "overview") {
      setLedgerTotal(resultReport.resultsLedger.length);
      setLedgerTotalPages(Math.max(1, Math.ceil(resultReport.resultsLedger.length / 20)));
    }
  }, [resultReport.resultsLedger.length, subView]);

  // For export, we need all matching ledger rows (not just current page) — keep a separate fetch for export if needed
  // For now, export will use current page's ledgerResults; full export can be done via separate API call with limit=10000 if needed
  const filteredLedger = ledgerResults;

  // Handle Export CSV
  const handleExportCsv = () => {
    if (subView === "overview") {
      const headers = [
        "Test ID",
        "Test Title",
        "Subject",
        "Batch",
        "Course",
        "Test Date",
        "Total Marks",
        "Passing Marks",
        "Evaluated Count",
        "Present Count",
        "Absent Count",
        "Passed Count",
        "Failed Count",
        "Average Score",
        "Highest Score",
        "Pass Rate (%)",
      ];
      const rows = filteredTests.map((t) => [
        t.testId,
        t.title,
        t.subject,
        t.batchName,
        t.courseName,
        formatDate(t.testDate),
        t.totalMarks,
        t.passingMarks,
        t.evaluatedCount,
        t.presentCount,
        t.absentCount,
        t.passedCount,
        t.failedCount,
        t.averageScore,
        t.highestScore,
        `${t.passRate}%`,
      ]);
      exportToCsv("tests_performance_overview_report", headers, rows);
    } else {
      const headers = [
        "Result ID",
        "Student Name",
        "Test Title",
        "Subject",
        "Batch",
        "Course",
        "Test Date",
        "Marks Obtained",
        "Total Marks",
        "Percentage (%)",
        "Result Status",
        "Remarks",
      ];
      const rows = filteredLedger.map((r) => [
        r.resultId,
        r.studentName,
        r.testTitle,
        r.subject,
        r.batchName,
        r.courseName,
        formatDate(r.testDate),
        r.marksObtained !== null ? r.marksObtained : "ABSENT",
        r.totalMarks,
        r.percentage !== null ? `${r.percentage}%` : "N/A",
        r.status,
        r.remarks || "",
      ]);
      exportToCsv("student_test_results_ledger", headers, rows);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Result KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <KpiCard
          label="Tests Conducted"
          value={resultReport.kpis.totalTests.toString()}
          iconName="Award"
          accent="scholar"
        />
        <KpiCard
          label="Overall Pass Rate"
          value={`${resultReport.kpis.overallPassRate}%`}
          iconName="CheckCircle2"
          accent="scholar"
          trend={`${resultReport.kpis.totalEvaluations} evaluated submissions`}
          trendTone="success"
        />
        <KpiCard
          label="Institute Average Score"
          value={`${resultReport.kpis.instituteAverageScore}%`}
          iconName="TrendingUp"
          accent="marigold"
        />
        <KpiCard
          label="Highest Score Overall"
          value={`${resultReport.kpis.highestMarkOverall} pts`}
          iconName="GraduationCap"
          accent="marigold"
          trend={`${resultReport.kpis.totalAbsent} absent across tests`}
          trendTone="neutral"
        />
      </Box>

      {/* Chart: Pass Rate per Test — keep recharts exactly wrapped in MUI Card */}
      {resultReport.tests.length > 0 && (
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem", fontFamily: "var(--font-sora)" }}>
                Test Pass Rate &amp; Average Scores
              </Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
                Comparing pass rates and average scores across exams
              </Typography>
            </Box>
            <Chip
              label={`Avg Pass: ${resultReport.kpis.overallPassRate}%`}
              size="small"
              sx={{ bgcolor: "#EEF2F7", color: "#1E3A5F", fontWeight: 600, fontSize: "0.70rem", height: 22, border: "1px solid #D6E0EB" }}
            />
          </Box>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={resultReport.tests.slice(0, 8).map((t) => ({
                name: t.title.length > 14 ? t.title.slice(0, 14) + "..." : t.title,
                fullName: t.title,
                passRate: t.passRate,
                avgScorePct: Math.round((t.averageScore / t.totalMarks) * 100),
              }))}
              margin={{ left: -10, right: 10, top: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#4E6E93" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any}
                formatter={(val, name) => [
                  `${val}%`,
                  name === "passRate" ? "Pass Rate" : "Average Score %",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Bar dataKey="passRate" name="Pass Rate %" fill="#2E7D52" radius={[4, 4, 0, 0] as any} maxBarSize={28} />
              <Bar dataKey="avgScorePct" name="Avg Score %" fill="#E8A33D" radius={[4, 4, 0, 0] as any} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Sub-view Selector & Toolbar — MUI Chip/TextField/Select/Button */}
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
              label={`Tests Overview (${resultReport.tests.length})`}
              onClick={() => setSubView("overview")}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "overview" ? "white" : "transparent",
                color: subView === "overview" ? "#1E3A5F" : "#475569",
                border: subView === "overview" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "overview" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "overview" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
            <Chip
              label={`Student Score Ledger (${ledgerTotal})`}
              onClick={() => setSubView("ledger")}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "ledger" ? "white" : "transparent",
                color: subView === "ledger" ? "#1E3A5F" : "#475569",
                border: subView === "ledger" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "ledger" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "ledger" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
            {subView === "ledger" && (
              <>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="result-test-filter-label" sx={{ fontSize: "0.75rem" }}>Test</InputLabel>
                  <Select
                    labelId="result-test-filter-label"
                    label="Test"
                    value={testFilter}
                    onChange={(e) => setTestFilter(e.target.value)}
                    sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
                  >
                    <MenuItem value="ALL">All Tests</MenuItem>
                    {resultReport.tests.map((t) => (
                      <MenuItem key={t.testId} value={t.title}>
                        {t.title} ({t.batchName})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="result-status-filter-label" sx={{ fontSize: "0.75rem" }}>Result Status</InputLabel>
                  <Select
                    labelId="result-status-filter-label"
                    label="Result Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
                  >
                    <MenuItem value="ALL">All Results</MenuItem>
                    <MenuItem value="PASSED">Passed</MenuItem>
                    <MenuItem value="FAILED">Failed</MenuItem>
                    <MenuItem value="ABSENT">Absent</MenuItem>
                  </Select>
                </FormControl>
              </>
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

        <Box sx={{ mt: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={
              subView === "overview"
                ? "Search tests by title, subject, or batch..."
                : "Search score ledger by student name, test title, or subject..."
            }
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
      </Card>

      {/* Subview 1: Tests Overview Table — MUI Table */}
      {subView === "overview" && (
        <Card sx={{ overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                  <TableCell>Test Title &amp; Subject</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Marks (Total/Pass)</TableCell>
                  <TableCell align="center">Evaluated</TableCell>
                  <TableCell align="center">Avg Score</TableCell>
                  <TableCell align="center">High Score</TableCell>
                  <TableCell align="right">Pass Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                      No tests found matching search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTests.map((t) => (
                    <TableRow key={t.testId} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{t.title}</Typography>
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{t.subject}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{t.batchName}</Typography>
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{t.courseName}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(t.testDate)}</TableCell>
                      <TableCell align="center" sx={{ fontSize: "0.80rem", color: "#171A21" }}>
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: "0.80rem" }}>{t.totalMarks}</Typography>
                        <Typography component="span" sx={{ fontSize: "10px", color: "#7E9BBC" }}> / {t.passingMarks} pass</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{t.evaluatedCount}</Typography>
                        <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC", display: "block" }}>{t.presentCount} pres / {t.absentCount} abs</Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: "#334155", fontSize: "0.80rem" }}>{t.averageScore}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: "#92400E", fontSize: "0.80rem" }}>{t.highestScore}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${t.passRate}% (${t.passedCount}/${t.presentCount})`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.70rem",
                            height: 22,
                            borderRadius: "9999px",
                            bgcolor: t.passRate >= 70 ? "#ECFDF5" : "#FFFBEB",
                            color: t.passRate >= 70 ? "#065F46" : "#92400E",
                            border: `1px solid ${t.passRate >= 70 ? "#A7F3D0" : "#FDE68A"}`,
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

      {/* Subview 2: Student Score Ledger Table — MUI Table with Chip badges for PASSED/FAILED/ABSENT */}
      {subView === "ledger" && (
        <Card sx={{ overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                  <TableCell>Student</TableCell>
                  <TableCell>Test Title &amp; Subject</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell align="center">Marks Obtained</TableCell>
                  <TableCell align="center">Percentage</TableCell>
                  <TableCell>Result Status</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledgerLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#7E9BBC", fontSize: "0.875rem" }}>
                      Loading results...
                    </TableCell>
                  </TableRow>
                ) : filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                      No score records match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedger.map((r) => (
                    <TableRow key={r.resultId} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93", fontSize: "0.70rem", fontWeight: 600 }} variant="rounded">
                            {initials(r.studentName)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{r.studentName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{r.testTitle}</Typography>
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{r.subject}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.80rem", color: "#475569" }}>{r.batchName}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem", fontFamily: "var(--font-sora)" }}>
                        {r.marksObtained !== null ? (
                          <Box component="span">
                            {r.marksObtained} <Typography component="span" sx={{ color: "#7E9BBC", fontWeight: 400, fontSize: "0.75rem" }}>/ {r.totalMarks}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 400 }}>ABSENT</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {r.percentage !== null ? (
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.80rem" }}>{r.percentage}%</Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: "#94A3B8" }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.status === "PASSED" ? (
                          <Chip icon={<CheckCircle2 size={12} />} label="PASSED" size="small" sx={{ bgcolor: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", fontWeight: 700, fontSize: "0.70rem", height: 22 }} />
                        ) : r.status === "FAILED" ? (
                          <Chip icon={<XCircle size={12} />} label="FAILED" size="small" sx={{ bgcolor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", fontWeight: 700, fontSize: "0.70rem", height: 22 }} />
                        ) : (
                          <Chip icon={<AlertCircle size={12} />} label="ABSENT" size="small" sx={{ bgcolor: "#F8FAFC", color: "#475569", border: "1px solid #E2E8F0", fontWeight: 600, fontSize: "0.70rem", height: 22 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem", color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.remarks || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: "center", justifyContent: "space-between", p: 2, borderTop: "1px solid #D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>
              Showing {filteredLedger.length} of {ledgerTotal} results {ledgerTotalPages > 1 && `(Page ${ledgerPage} of ${ledgerTotalPages})`}
            </Typography>
            {ledgerTotalPages > 1 && (
              <Pagination
                count={ledgerTotalPages}
                page={ledgerPage}
                onChange={(_, v) => setLedgerPage(v)}
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
    </Box>
  );
}
