"use client";

import { useState, useMemo } from "react";
import { Search, Download, CreditCard, AlertTriangle } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";
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

export function FeeReportsTab({ data }: { data: ReportsData }) {
  const { feeReport } = data;
  const [subView, setSubView] = useState<"transactions" | "dues" | "methods">("transactions");
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return feeReport.payments.filter((p) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = p.studentName.toLowerCase().includes(q);
        const matchMobile = p.studentMobile.includes(q);
        const matchCourse = p.courseName.toLowerCase().includes(q);
        const matchMethod = p.method.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchCourse && !matchMethod) return false;
      }

      if (methodFilter !== "ALL" && p.method !== methodFilter) return false;

      return true;
    });
  }, [feeReport.payments, searchTerm, methodFilter]);

  // Filtered dues
  const filteredDues = useMemo(() => {
    return feeReport.duesAging.filter((d) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = d.studentName.toLowerCase().includes(q);
        const matchMobile = d.mobile.includes(q);
        const matchCourse = d.courseName.toLowerCase().includes(q);
        const matchBatch = d.batchName.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchCourse && !matchBatch) return false;
      }
      return true;
    });
  }, [feeReport.duesAging, searchTerm]);

  // Handle Export CSV based on current subview
  const handleExportCsv = () => {
    if (subView === "transactions") {
      const headers = [
        "Payment ID",
        "Student Name",
        "Mobile",
        "Course",
        "Batch",
        "Amount (INR)",
        "Payment Method",
        "Paid Date",
        "Notes / Remarks",
      ];
      const rows = filteredPayments.map((p) => [
        p.id,
        p.studentName,
        p.studentMobile,
        p.courseName,
        p.batchName,
        p.amount,
        p.method,
        formatDate(p.paidAt),
        p.note || "",
      ]);
      exportToCsv("fee_transactions_ledger", headers, rows);
    } else if (subView === "dues") {
      const headers = [
        "Student ID",
        "Student Name",
        "Mobile",
        "Course",
        "Batch",
        "Total Fee Assessed (INR)",
        "Paid Amount (INR)",
        "Outstanding Balance (INR)",
        "Due Date",
        "Is Overdue",
        "Days Overdue",
      ];
      const rows = filteredDues.map((d) => [
        d.studentId,
        d.studentName,
        d.mobile,
        d.courseName,
        d.batchName,
        d.totalFee,
        d.paidFee,
        d.pendingFee,
        d.dueDate ? formatDate(d.dueDate) : "N/A",
        d.isOverdue ? "YES" : "NO",
        d.daysOverdue,
      ]);
      exportToCsv("outstanding_fee_dues_report", headers, rows);
    } else {
      const headers = ["Payment Method", "Transactions Count", "Total Collected (INR)", "Share of Total (%)"];
      const rows = feeReport.paymentMethodsBreakdown.map((m) => [
        m.method,
        m.count,
        m.total,
        `${m.percentage}%`,
      ]);
      exportToCsv("payment_methods_breakdown", headers, rows);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Fee KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <KpiCard
          label="Total Assessed Fees"
          value={formatCurrency(feeReport.kpis.totalBilled)}
          iconName="IndianRupee"
          accent="scholar"
        />
        <KpiCard
          label="Total Collected"
          value={formatCurrency(feeReport.kpis.totalCollected)}
          iconName="Wallet"
          accent="scholar"
          trend={`${feeReport.kpis.collectionEfficiency}% collection rate`}
          trendTone="success"
        />
        <KpiCard
          label="Pending Dues"
          value={formatCurrency(feeReport.kpis.totalPending)}
          iconName="AlertTriangle"
          accent="marigold"
          trend={`${feeReport.duesAging.length} students with dues`}
          trendTone="neutral"
        />
        <KpiCard
          label="Overdue Amount"
          value={formatCurrency(feeReport.kpis.overdueAmount)}
          iconName="AlertTriangle"
          accent="marigold"
          trend={`${feeReport.kpis.overdueCount} students past deadline`}
          trendTone={feeReport.kpis.overdueCount > 0 ? "danger" : "success"}
        />
      </Box>

      {/* Visual Charts — keep recharts exactly, wrapped in MUI Card */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem", fontFamily: "var(--font-sora)" }}>
                Monthly Collection Trend
              </Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
                Total fees received per month (INR)
              </Typography>
            </Box>
            <Chip
              label={`${feeReport.kpis.transactionsCount} Transactions`}
              size="small"
              sx={{ bgcolor: "#EEF2F7", color: "#1E3A5F", fontWeight: 600, fontSize: "0.70rem", height: 22, border: "1px solid #D6E0EB" }}
            />
          </Box>

          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={feeReport.monthlyTrend} margin={{ left: -10, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="feeTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E7D52" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2E7D52" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
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
              <Area type="monotone" dataKey="amount" stroke="#2E7D52" strokeWidth={2.5} fill="url(#feeTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem", fontFamily: "var(--font-sora)" }}>
                Payment Methods Breakdown
              </Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
                Collection volume by channel
              </Typography>
            </Box>
            <Chip
              label={`${feeReport.paymentMethodsBreakdown.length} Methods`}
              size="small"
              sx={{ bgcolor: "#EEF2F7", color: "#1E3A5F", fontWeight: 600, fontSize: "0.70rem", height: 22, border: "1px solid #D6E0EB" }}
            />
          </Box>

          {feeReport.paymentMethodsBreakdown.length === 0 ? (
            <Box sx={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
                No payments recorded yet.
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={feeReport.paymentMethodsBreakdown} margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="method" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#4E6E93" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any}
                  formatter={(val, _name, item) => [
                    `₹${Number(val ?? 0).toLocaleString("en-IN")} (${(item as any)?.payload?.percentage}%)`,
                    "Total Collected",
                  ]}
                />
                <Bar dataKey="total" fill="#1E3A5F" radius={[6, 6, 0, 0] as any} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Box>

      {/* Sub-view Selector & Toolbar — MUI Chip/TextField/Select/Button */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2, alignItems: { lg: "center" }, justifyContent: "space-between" }}>
          {/* Subview Chips */}
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
              label={`Payment Transactions (${feeReport.payments.length})`}
              onClick={() => setSubView("transactions")}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "transactions" ? "white" : "transparent",
                color: subView === "transactions" ? "#1E3A5F" : "#475569",
                border: subView === "transactions" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "transactions" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "transactions" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
            <Chip
              label={`Outstanding Dues & Aging (${feeReport.duesAging.length})`}
              onClick={() => setSubView("dues")}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "dues" ? "white" : "transparent",
                color: subView === "dues" ? "#1E3A5F" : "#475569",
                border: subView === "dues" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "dues" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "dues" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
            <Chip
              label={`Methods Summary (${feeReport.paymentMethodsBreakdown.length})`}
              onClick={() => setSubView("methods")}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "methods" ? "white" : "transparent",
                color: subView === "methods" ? "#1E3A5F" : "#475569",
                border: subView === "methods" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "methods" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "methods" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
            {subView === "transactions" && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="fee-method-filter-label" sx={{ fontSize: "0.75rem" }}>
                  Payment Method
                </InputLabel>
                <Select
                  labelId="fee-method-filter-label"
                  label="Payment Method"
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
                >
                  <MenuItem value="ALL">All Methods</MenuItem>
                  {feeReport.paymentMethodsBreakdown.map((m) => (
                    <MenuItem key={m.method} value={m.method}>
                      {m.method}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              variant="contained"
              size="small"
              startIcon={<Download size={14} />}
              onClick={handleExportCsv}
              sx={{
                borderRadius: "12px",
                bgcolor: "#1E3A5F",
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "none",
                py: 1,
                px: 1.75,
                boxShadow: "none",
                "&:hover": { bgcolor: "#182F4C" },
              }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {subView !== "methods" && (
          <Box sx={{ mt: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={
                subView === "transactions"
                  ? "Search payments by student name, mobile, course, or method..."
                  : "Search dues by student name, mobile, course, batch..."
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
        )}
      </Card>

      {/* Subview 1: Payment Transactions Table — MUI Table */}
      {subView === "transactions" && (
        <Card sx={{ overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                  <TableCell>Student</TableCell>
                  <TableCell>Course &amp; Batch</TableCell>
                  <TableCell align="right">Amount Paid</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Payment Date</TableCell>
                  <TableCell>Notes / Receipt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                      No payment transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p) => (
                    <TableRow key={p.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93", fontSize: "0.70rem", fontWeight: 600 }} variant="rounded">
                            {initials(p.studentName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>
                              {p.studentName}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
                              {p.studentMobile}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>
                          {p.courseName}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
                          {p.batchName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: "#059669", fontSize: "0.80rem", fontFamily: "var(--font-sora)" }}>
                        +{formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<CreditCard size={12} />}
                          label={p.method}
                          size="small"
                          sx={{ bgcolor: "#EEF2F7", color: "#334155", fontWeight: 500, fontSize: "0.70rem", height: 22, borderRadius: "9999px" }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(p.paidAt)}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem", color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Subview 2: Outstanding Dues Aging Table — MUI Table */}
      {subView === "dues" && (
        <Card sx={{ overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                  <TableCell>Student</TableCell>
                  <TableCell>Course &amp; Batch</TableCell>
                  <TableCell align="right">Total Fee</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Outstanding Dues</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Aging Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                      No outstanding dues! All students are paid up.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDues.map((d) => (
                    <TableRow key={d.studentId} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#FEF2F2", color: "#DC2626", fontSize: "0.70rem", fontWeight: 600 }} variant="rounded">
                            {initials(d.studentName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>
                              {d.studentName}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
                              {d.mobile}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>
                          {d.courseName}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
                          {d.batchName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>
                        {formatCurrency(d.totalFee)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#059669", fontSize: "0.80rem" }}>
                        {formatCurrency(d.paidFee)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: "#DC2626", fontSize: "0.80rem", fontFamily: "var(--font-sora)" }}>
                        {formatCurrency(d.pendingFee)}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {d.dueDate ? formatDate(d.dueDate) : "—"}
                      </TableCell>
                      <TableCell>
                        {d.isOverdue ? (
                          <Chip
                            icon={<AlertTriangle size={12} />}
                            label={`${d.daysOverdue} days overdue`}
                            size="small"
                            sx={{ bgcolor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", fontWeight: 700, fontSize: "0.70rem", height: 22 }}
                          />
                        ) : (
                          <Chip
                            label="Current Period"
                            size="small"
                            sx={{ bgcolor: "#F8FAFC", color: "#475569", fontWeight: 500, fontSize: "0.70rem", height: 22, border: "1px solid #E2E8F0" }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Subview 3: Payment Methods Summary Table — MUI Table */}
      {subView === "methods" && (
        <Card sx={{ overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                  <TableCell>Payment Channel / Mode</TableCell>
                  <TableCell align="center">Transactions Count</TableCell>
                  <TableCell align="right">Total Collected (INR)</TableCell>
                  <TableCell align="right">Share of Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feeReport.paymentMethodsBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                      No payment methods data.
                    </TableCell>
                  </TableRow>
                ) : (
                  feeReport.paymentMethodsBreakdown.map((m) => (
                    <TableRow key={m.method} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CreditCard size={14} style={{ color: "#64748b" }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>
                            {m.method}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>
                        {m.count}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: "#059669", fontSize: "0.80rem", fontFamily: "var(--font-sora)" }}>
                        {formatCurrency(m.total)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#475569", fontSize: "0.80rem" }}>
                        {m.percentage}%
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
