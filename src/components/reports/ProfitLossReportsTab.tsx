"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Receipt, Search, Download, Wallet } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
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
import Paper from "@mui/material/Paper";

export function ProfitLossReportsTab({ data }: { data: ReportsData }) {
  const { profitLossReport } = data;
  const [subView, setSubView] = useState<"summary" | "income" | "expenses">("summary");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const { kpis, monthlyTrend, incomeCategoryBreakdown, expenseCategoryBreakdown, incomes, expenses } =
    profitLossReport;

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTitle = i.title.toLowerCase().includes(q);
        const matchPayer = (i.receivedFrom || "").toLowerCase().includes(q);
        const matchNotes = (i.notes || "").toLowerCase().includes(q);
        const matchCat = i.categoryLabel.toLowerCase().includes(q);
        if (!matchTitle && !matchPayer && !matchNotes && !matchCat) return false;
      }
      if (categoryFilter !== "ALL" && i.category !== categoryFilter) return false;
      return true;
    });
  }, [incomes, searchTerm, categoryFilter]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchPaidTo = (e.paidTo || "").toLowerCase().includes(q);
        const matchNotes = (e.notes || "").toLowerCase().includes(q);
        const matchCat = e.categoryLabel.toLowerCase().includes(q);
        if (!matchTitle && !matchPaidTo && !matchNotes && !matchCat) return false;
      }
      if (categoryFilter !== "ALL" && e.category !== categoryFilter) return false;
      return true;
    });
  }, [expenses, searchTerm, categoryFilter]);

  // CSV Exporters
  const handleExportStatement = () => {
    const headers = [
      "Month",
      "Fee Collection (INR)",
      "Extra Income (INR)",
      "Total Gross Revenue (INR)",
      "Total Expenses (INR)",
      "Net Profit / Loss (INR)",
    ];
    const rows = monthlyTrend.map((m) => [
      m.month,
      m.feeRevenue,
      m.extraIncome,
      m.totalRevenue,
      m.expenses,
      m.netProfit,
    ]);
    exportToCsv("Profit_Loss_Statement", headers, rows);
  };

  const handleExportIncome = () => {
    const headers = ["Title", "Category", "Amount (INR)", "Method", "Date", "Received From", "Notes"];
    const rows = filteredIncomes.map((i) => [
      i.title,
      i.categoryLabel,
      i.amount,
      i.paymentMethod,
      formatDate(new Date(i.incomeDate)),
      i.receivedFrom || "",
      i.notes || "",
    ]);
    exportToCsv("Extra_Income_Ledger", headers, rows);
  };

  const handleExportExpenses = () => {
    const headers = ["Title", "Category", "Amount (INR)", "Method", "Date", "Paid To", "Notes"];
    const rows = filteredExpenses.map((e) => [
      e.title,
      e.categoryLabel,
      e.amount,
      e.paymentMethod,
      formatDate(new Date(e.expenseDate)),
      e.paidTo || "",
      e.notes || "",
    ]);
    exportToCsv("Expenses_Ledger", headers, rows);
  };

  const isNetProfitPositive = kpis.netProfit >= 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Sub-navigation + Export — MUI Chip/Button */}
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
              icon={<TrendingUp size={14} />}
              label="P&L Overview & Trends"
              onClick={() => {
                setSubView("summary");
                setCategoryFilter("ALL");
              }}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "summary" ? "white" : "transparent",
                color: subView === "summary" ? "#1E3A5F" : "#475569",
                border: subView === "summary" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "summary" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "summary" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
            <Chip
              icon={<Wallet size={14} />}
              label={`Extra Income (${incomes.length})`}
              onClick={() => {
                setSubView("income");
                setCategoryFilter("ALL");
              }}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "income" ? "white" : "transparent",
                color: subView === "income" ? "#1E3A5F" : "#475569",
                border: subView === "income" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "income" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "income" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
            <Chip
              icon={<Receipt size={14} />}
              label={`Expenses (${expenses.length})`}
              onClick={() => {
                setSubView("expenses");
                setCategoryFilter("ALL");
              }}
              size="small"
              sx={{
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.75rem",
                px: 0.5,
                bgcolor: subView === "expenses" ? "white" : "transparent",
                color: subView === "expenses" ? "#1E3A5F" : "#475569",
                border: subView === "expenses" ? "1px solid #D6E0EB" : "1px solid transparent",
                boxShadow: subView === "expenses" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                "&:hover": { bgcolor: subView === "expenses" ? "white" : "rgba(255,255,255,0.6)" },
              }}
            />
          </Box>

          <Button
            variant="contained"
            size="small"
            startIcon={<Download size={13} />}
            onClick={subView === "income" ? handleExportIncome : subView === "expenses" ? handleExportExpenses : handleExportStatement}
            sx={{
              borderRadius: "12px",
              bgcolor: "#1E3A5F",
              fontWeight: 600,
              fontSize: "0.75rem",
              textTransform: "none",
              py: 1,
              px: 1.75,
              boxShadow: "none",
              whiteSpace: "nowrap",
              "&:hover": { bgcolor: "#182F4C" },
            }}
          >
            {subView === "income" ? "Export Income CSV" : subView === "expenses" ? "Export Expenses CSV" : "Export P&L Statement (CSV)"}
          </Button>
        </Box>
      </Card>

      {/* KPI Cards Banner — Box grid + KpiCard */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiCard
          label="Total Gross Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          iconName="IndianRupee"
          trend={`Fees (${formatCurrency(kpis.feeRevenue)}) + Extra (${formatCurrency(kpis.extraIncome)})`}
        />
        <KpiCard
          label="Total Operating Expenses"
          value={formatCurrency(kpis.totalExpenses)}
          iconName="TrendingDown"
          trend={`${kpis.expenseTransactionsCount} total expense transactions`}
        />
        <KpiCard
          label="Net Profit / (Loss)"
          value={formatCurrency(kpis.netProfit)}
          iconName={isNetProfitPositive ? "TrendingUp" : "TrendingDown"}
          trend={isNetProfitPositive ? "Profitable operations (Revenue > Expenses)" : "Net loss incurred during this timeframe"}
        />
        <KpiCard
          label="Operating Profit Margin"
          value={`${kpis.profitMargin}%`}
          iconName="Percent"
          trend="Net margin on total gross revenue"
        />
      </Box>

      {/* Sub-view 1: P&L Overview & Charts */}
      {subView === "summary" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Monthly Revenue vs Expense Chart — keep recharts exactly */}
          <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem", fontFamily: "var(--font-sora)" }}>
                Monthly P&L Comparison: Total Revenue vs. Total Expenses
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>
                Tracking monthly trends across fee revenue, extra non-fee income, and branch expenses.
              </Typography>
            </Box>

            <Box sx={{ height: 288, width: "100%", pt: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val || 0)), ""]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #CBD5E1",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} iconType="circle" />
                  <Bar dataKey="feeRevenue" name="Fee Revenue" fill="#2563EB" radius={[4, 4, 0, 0] as any} />
                  <Bar dataKey="extraIncome" name="Extra Revenue" fill="#10B981" radius={[4, 4, 0, 0] as any} />
                  <Bar dataKey="expenses" name="Operating Expenses" fill="#F43F5E" radius={[4, 4, 0, 0] as any} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>

          {/* Breakdown Grids — Box grid + Paper/Box bars */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
            {/* Non-Fee Extra Revenue Drivers */}
            <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <TrendingUp size={15} style={{ color: "#059669" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem", fontFamily: "var(--font-sora)" }}>
                      Non-Fee Extra Revenue Drivers
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>
                    Breakdown of non-fee income sources
                  </Typography>
                </Box>
                <Chip
                  label={`${formatCurrency(kpis.extraIncome)} Total`}
                  size="small"
                  sx={{ bgcolor: "#ECFDF5", color: "#065f46", border: "1px solid #A7F3D0", fontWeight: 700, fontSize: "0.70rem", height: 22 }}
                />
              </Box>

              {incomeCategoryBreakdown.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.75rem" }}>
                    No extra revenue entries recorded for this period.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {incomeCategoryBreakdown.map((cat) => (
                    <Box key={cat.category} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>
                          {cat.label}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                            {cat.count} txns
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "#065f46", fontSize: "0.75rem" }}>
                            {formatCurrency(cat.total)}
                          </Typography>
                        </Box>
                      </Box>
                      <Paper
                        elevation={0}
                        sx={{ height: 8, width: "100%", borderRadius: "9999px", bgcolor: "#EEF2F7", overflow: "hidden" }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            borderRadius: "9999px",
                            bgcolor: "#10B981",
                            width: `${Math.min(100, Math.max(5, cat.percentage))}%`,
                            transition: "width 0.3s",
                          }}
                        />
                      </Paper>
                    </Box>
                  ))}
                </Box>
              )}
            </Card>

            {/* Operating Expense Drivers */}
            <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <TrendingDown size={15} style={{ color: "#E11D48" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem", fontFamily: "var(--font-sora)" }}>
                      Operating Expense Drivers
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>
                    Breakdown of major cost centers
                  </Typography>
                </Box>
                <Chip
                  label={`${formatCurrency(kpis.totalExpenses)} Total`}
                  size="small"
                  sx={{ bgcolor: "#FEF2F2", color: "#9F1239", border: "1px solid #FECACA", fontWeight: 700, fontSize: "0.70rem", height: 22 }}
                />
              </Box>

              {expenseCategoryBreakdown.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.75rem" }}>
                    No operating expenses logged for this period.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {expenseCategoryBreakdown.map((cat) => (
                    <Box key={cat.category} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>
                          {cat.label}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                            {cat.count} txns
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "#9F1239", fontSize: "0.75rem" }}>
                            {formatCurrency(cat.total)}
                          </Typography>
                        </Box>
                      </Box>
                      <Paper
                        elevation={0}
                        sx={{ height: 8, width: "100%", borderRadius: "9999px", bgcolor: "#EEF2F7", overflow: "hidden" }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            borderRadius: "9999px",
                            bgcolor: "#F43F5E",
                            width: `${Math.min(100, Math.max(5, cat.percentage))}%`,
                            transition: "width 0.3s",
                          }}
                        />
                      </Paper>
                    </Box>
                  ))}
                </Box>
              )}
            </Card>
          </Box>
        </Box>
      )}

      {/* Sub-view 2: Extra Income Ledger — TextField + Select + MUI Table */}
      {subView === "income" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
              <TextField
                size="small"
                placeholder="Search income by title, payer, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flex: 1, maxWidth: { sm: 360 }, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem" } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} style={{ color: "#7E9BBC" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="income-category-filter-label" sx={{ fontSize: "0.75rem" }}>
                  Income Category
                </InputLabel>
                <Select
                  labelId="income-category-filter-label"
                  label="Income Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
                >
                  <MenuItem value="ALL">All Income Categories</MenuItem>
                  {incomeCategoryBreakdown.map((c) => (
                    <MenuItem key={c.category} value={c.category}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Card>

          <Card sx={{ overflow: "hidden" }}>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 750 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.75, borderBottom: "1px solid #D6E0EB", whiteSpace: "nowrap" } }}>
                    <TableCell>Income Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Received From</TableCell>
                    <TableCell align="right">Amount (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredIncomes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                        No extra income records found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncomes.map((i) => (
                      <TableRow key={i.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.75 } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.80rem" }}>
                            {i.title}
                          </Typography>
                          {i.notes && (
                            <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8", display: "block" }}>
                              {i.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={i.categoryLabel}
                            size="small"
                            sx={{ bgcolor: "#ECFDF5", color: "#065f46", border: "1px solid #A7F3D0", fontWeight: 700, fontSize: "0.65rem", height: 22 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500, whiteSpace: "nowrap" }}>{i.paymentMethod}</TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>
                          {formatDate(new Date(i.incomeDate))}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", color: "#475569" }}>
                          {i.receivedFrom || (
                            <Typography variant="caption" sx={{ color: "#CBD5E1", fontStyle: "italic", fontSize: "0.75rem" }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#059669", fontSize: "0.80rem", fontFamily: "var(--font-sora)", whiteSpace: "nowrap" }}>
                          +{formatCurrency(i.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* Sub-view 3: Expenses Ledger — TextField + Select + MUI Table */}
      {subView === "expenses" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
              <TextField
                size="small"
                placeholder="Search expenses by title, recipient, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flex: 1, maxWidth: { sm: 360 }, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem" } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} style={{ color: "#7E9BBC" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="expense-category-filter-label" sx={{ fontSize: "0.75rem" }}>
                  Expense Category
                </InputLabel>
                <Select
                  labelId="expense-category-filter-label"
                  label="Expense Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
                >
                  <MenuItem value="ALL">All Expense Categories</MenuItem>
                  {expenseCategoryBreakdown.map((c) => (
                    <MenuItem key={c.category} value={c.category}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Card>

          <Card sx={{ overflow: "hidden" }}>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 750 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.75, borderBottom: "1px solid #D6E0EB", whiteSpace: "nowrap" } }}>
                    <TableCell>Expense Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Paid To</TableCell>
                    <TableCell align="right">Amount (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                        No expense records found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((e) => (
                      <TableRow key={e.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.75 } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.80rem" }}>
                            {e.title}
                          </Typography>
                          {e.notes && (
                            <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8", display: "block" }}>
                              {e.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={e.categoryLabel}
                            size="small"
                            sx={{ bgcolor: "#FEF2F2", color: "#9F1239", border: "1px solid #FECACA", fontWeight: 700, fontSize: "0.65rem", height: 22 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500, whiteSpace: "nowrap" }}>{e.paymentMethod}</TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>
                          {formatDate(new Date(e.expenseDate))}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.75rem", color: "#475569" }}>
                          {e.paidTo || (
                            <Typography variant="caption" sx={{ color: "#CBD5E1", fontStyle: "italic", fontSize: "0.75rem" }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#E11D48", fontSize: "0.80rem", fontFamily: "var(--font-sora)", whiteSpace: "nowrap" }}>
                          -{formatCurrency(e.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}
    </Box>
  );
}
