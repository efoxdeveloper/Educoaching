"use client";

import { useState, useMemo } from "react";
import { Search, Download, Clock } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
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

export function BatchReportsTab({ data }: { data: ReportsData }) {
  const { batchReport } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batchReport.batches.filter((b) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchCourse = b.courseName.toLowerCase().includes(q);
        const matchFaculty = b.facultyNames.some((f) => f.toLowerCase().includes(q));
        if (!matchName && !matchCourse && !matchFaculty) return false;
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE" && b.status.toLowerCase() !== "active") return false;
        if (statusFilter === "INACTIVE" && b.status.toLowerCase() === "active") return false;
      }

      return true;
    });
  }, [batchReport.batches, searchTerm, statusFilter]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Batch ID",
      "Batch Name",
      "Course",
      "Schedule / Timing",
      "Faculty Assigned",
      "Seating Capacity",
      "Enrolled Students",
      "Available Seats",
      "Occupancy Rate (%)",
      "Status",
      "Total Fees Generated (INR)",
      "Average Attendance Rate (%)",
    ];

    const rows = filteredBatches.map((b) => [
      b.id,
      b.name,
      b.courseName,
      b.timing,
      b.facultyNames.join(", ") || "None Assigned",
      b.capacity,
      b.enrolledCount,
      b.availableSeats,
      `${b.occupancyRate}%`,
      b.status,
      b.totalFees,
      b.attendanceRate !== null ? `${b.attendanceRate}%` : "No Records",
    ]);

    exportToCsv("batch_utilization_report", headers, rows);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      {/* Batch KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2, width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <KpiCard
          label="Total Batches"
          value={batchReport.kpis.totalBatches.toString()}
          iconName="Layers"
          accent="scholar"
        />
        <KpiCard
          label="Overall Occupancy"
          value={`${batchReport.kpis.overallOccupancy}%`}
          iconName="Users"
          accent="marigold"
          trend={`${batchReport.kpis.totalEnrolled} enrolled of ${batchReport.kpis.totalCapacity} capacity`}
          trendTone="neutral"
        />
        <KpiCard
          label="Active Batches"
          value={batchReport.kpis.activeBatches.toString()}
          iconName="CheckCircle2"
          accent="scholar"
        />
        <KpiCard
          label="High Capacity (≥90%)"
          value={batchReport.kpis.highOccupancyBatches.toString()}
          iconName="AlertTriangle"
          accent="marigold"
          trend={
            batchReport.kpis.highOccupancyBatches > 0
              ? "Consider opening new sections"
              : "Ample seat capacity"
          }
          trendTone={batchReport.kpis.highOccupancyBatches > 0 ? "danger" : "success"}
        />
      </Box>

      {/* Chart: Capacity vs Enrolled — keep recharts exactly wrapped in MUI Card */}
      {batchReport.batches.length > 0 && (
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem", fontFamily: "var(--font-sora)" }}>
                Batch Capacity vs Enrolled Comparison
              </Typography>
              <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
                Seat utilization per batch section
              </Typography>
            </Box>
            <Chip
              label={`Avg Utilization: ${batchReport.kpis.overallOccupancy}%`}
              size="small"
              sx={{ bgcolor: "#EEF2F7", color: "#1E3A5F", fontWeight: 600, fontSize: "0.70rem", height: 22, border: "1px solid #D6E0EB" }}
            />
          </Box>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={batchReport.batches.map((b) => ({
                name: b.name.length > 14 ? b.name.slice(0, 14) + "..." : b.name,
                fullName: b.name,
                capacity: b.capacity,
                enrolled: b.enrolledCount,
                available: b.availableSeats,
              }))}
              margin={{ left: -10, right: 10, top: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any}
                formatter={(val, name) => [
                  val as any,
                  name === "enrolled" ? "Enrolled" : name === "capacity" ? "Capacity" : "Available Seats",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Bar dataKey="enrolled" name="Enrolled" fill="#1E3A5F" radius={[4, 4, 0, 0] as any} maxBarSize={28} />
              <Bar dataKey="capacity" name="Capacity" fill="#D6E0EB" radius={[4, 4, 0, 0] as any} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Filter and Export Toolbar */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 1.5, alignItems: { lg: "center" }, justifyContent: "space-between" }}>
          <TextField
            size="small"
            placeholder="Search batches by name, course, or faculty..."
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
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="batch-status-label" sx={{ fontSize: "0.75rem" }}>Status</InputLabel>
              <Select
                labelId="batch-status-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
              >
                <MenuItem value="ALL">All Batches ({batchReport.batches.length})</MenuItem>
                <MenuItem value="ACTIVE">Active ({batchReport.kpis.activeBatches})</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
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
          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>Showing {filteredBatches.length} of {batchReport.batches.length} batches</Typography>
          {(searchTerm || statusFilter !== "ALL") && (
            <Button size="small" onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); }} sx={{ fontSize: "0.70rem", fontWeight: 500, color: "#475569", textTransform: "none", p: 0, minWidth: 0 }}>
              Reset filters
            </Button>
          )}
        </Box>
      </Card>

      {/* Batches Table — MUI Table */}
      <Card sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                <TableCell>Batch &amp; Course</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Faculty</TableCell>
                <TableCell align="center">Capacity</TableCell>
                <TableCell align="center">Enrolled</TableCell>
                <TableCell>Occupancy Rate</TableCell>
                <TableCell align="right">Fee Volume</TableCell>
                <TableCell align="center">Avg Attendance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                    No batches found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((b) => (
                  <TableRow key={b.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{b.name}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{b.courseName}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Clock size={12} style={{ color: "#7E9BBC" }} />
                        {b.timing}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {b.facultyNames.length > 0 ? (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {b.facultyNames.map((f, i) => (
                            <Chip key={i} label={f} size="small" sx={{ bgcolor: "rgba(238,242,247,0.7)", color: "#334155", fontWeight: 500, fontSize: "0.70rem", height: 22, borderRadius: "6px" }} />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: "#94A3B8" }}>Not assigned</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{b.capacity}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{b.enrolledCount}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC", display: "block" }}>{b.availableSeats} open</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "#171A21", fontSize: "11px" }}>{b.occupancyRate}%</Typography>
                        <Typography variant="caption" sx={{ fontSize: "10px", color: b.occupancyRate >= 90 ? "#DC2626" : b.occupancyRate >= 60 ? "#059669" : "#64748b", fontWeight: b.occupancyRate >= 90 ? 700 : 400 }}>
                          {b.occupancyRate >= 90 ? "NEAR FULL" : b.occupancyRate >= 60 ? "Optimal" : "Available"}
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, width: "100%", borderRadius: "9999px", bgcolor: "#EEF2F7", overflow: "hidden" }}>
                        <Box sx={{ height: "100%", borderRadius: "9999px", width: `${Math.min(100, b.occupancyRate)}%`, bgcolor: b.occupancyRate >= 90 ? "#EF4444" : b.occupancyRate >= 60 ? "#059669" : "#F59E0B" }} />
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem", fontFamily: "var(--font-sora)" }}>{formatCurrency(b.totalFees)}</TableCell>
                    <TableCell align="center">
                      {b.attendanceRate !== null ? (
                        <Chip
                          label={`${b.attendanceRate}%`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.70rem",
                            height: 22,
                            borderRadius: "9999px",
                            bgcolor: b.attendanceRate >= 75 ? "#ECFDF5" : "#FEF2F2",
                            color: b.attendanceRate >= 75 ? "#065F46" : "#DC2626",
                            border: `1px solid ${b.attendanceRate >= 75 ? "#A7F3D0" : "#FECACA"}`,
                          }}
                        />
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
