"use client";

import { useState, useMemo } from "react";
import {
  Layers,
  Search,
  Download,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
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
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Batch KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-full min-w-0">
        <KpiCard
          label="Total Batches"
          value={batchReport.kpis.totalBatches.toString()}
          icon={Layers}
          accent="scholar"
        />
        <KpiCard
          label="Overall Occupancy"
          value={`${batchReport.kpis.overallOccupancy}%`}
          icon={Users}
          accent="marigold"
          trend={`${batchReport.kpis.totalEnrolled} enrolled of ${batchReport.kpis.totalCapacity} capacity`}
          trendTone="neutral"
        />
        <KpiCard
          label="Active Batches"
          value={batchReport.kpis.activeBatches.toString()}
          icon={CheckCircle2}
          accent="scholar"
        />
        <KpiCard
          label="High Capacity (≥90%)"
          value={batchReport.kpis.highOccupancyBatches.toString()}
          icon={AlertTriangle}
          accent="marigold"
          trend={
            batchReport.kpis.highOccupancyBatches > 0
              ? "Consider opening new sections"
              : "Ample seat capacity"
          }
          trendTone={batchReport.kpis.highOccupancyBatches > 0 ? "danger" : "success"}
        />
      </div>

      {/* Chart: Capacity vs Enrolled */}
      {batchReport.batches.length > 0 && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                Batch Capacity vs Enrolled Comparison
              </h3>
              <p className="text-xs text-scholar-400">
                Seat utilization per batch section
              </p>
            </div>
            <span className="text-xs font-semibold text-scholar-600">
              Avg Utilization: {batchReport.kpis.overallOccupancy}%
            </span>
          </div>

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
                contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }}
                formatter={(val, name) => [
                  val,
                  name === "enrolled" ? "Enrolled" : name === "capacity" ? "Capacity" : "Available Seats",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Bar dataKey="enrolled" name="Enrolled" fill="#1E3A5F" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="capacity" name="Capacity" fill="#D6E0EB" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Filter and Export Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder="Search batches by name, course, or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-scholar-100 bg-white py-2 pl-9 pr-4 text-sm text-ink placeholder:text-scholar-300 focus:border-scholar-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-white px-3 py-2 text-xs font-medium text-scholar-700 focus:border-scholar-500 focus:outline-none"
            >
              <option value="ALL">All Batches ({batchReport.batches.length})</option>
              <option value="ACTIVE">Active ({batchReport.kpis.activeBatches})</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-scholar-700 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-scholar-50 pt-2 text-xs text-scholar-400">
          <span>Showing {filteredBatches.length} of {batchReport.batches.length} batches</span>
          {(searchTerm || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
              }}
              className="text-scholar-600 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </Card>

      {/* Batches Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Batch & Course</th>
                <th className="px-4 py-3 font-semibold">Schedule</th>
                <th className="px-4 py-3 font-semibold">Faculty</th>
                <th className="px-4 py-3 font-semibold text-center">Capacity</th>
                <th className="px-4 py-3 font-semibold text-center">Enrolled</th>
                <th className="px-4 py-3 font-semibold">Occupancy Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Fee Volume</th>
                <th className="px-4 py-3 font-semibold text-center">Avg Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-50">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-scholar-400">
                    No batches found.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-scholar-50/40 transition-colors">
                    {/* Batch & Course */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{b.name}</p>
                      <p className="text-[11px] text-scholar-400">{b.courseName}</p>
                    </td>

                    {/* Schedule */}
                    <td className="px-4 py-3 text-scholar-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-scholar-400" />
                        <span>{b.timing}</span>
                      </div>
                    </td>

                    {/* Faculty */}
                    <td className="px-4 py-3">
                      {b.facultyNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {b.facultyNames.map((f, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-scholar-100/70 px-2 py-0.5 text-[11px] font-medium text-scholar-700"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-scholar-400">Not assigned</span>
                      )}
                    </td>

                    {/* Capacity */}
                    <td className="px-4 py-3 text-center font-medium text-ink tabular-nums">
                      {b.capacity}
                    </td>

                    {/* Enrolled */}
                    <td className="px-4 py-3 text-center tabular-nums">
                      <span className="font-semibold text-ink">{b.enrolledCount}</span>
                      <span className="text-[10px] text-scholar-400 block">
                        {b.availableSeats} open
                      </span>
                    </td>

                    {/* Occupancy Progress Bar */}
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold tabular-nums text-ink">{b.occupancyRate}%</span>
                        <span className="text-[10px] text-scholar-400">
                          {b.occupancyRate >= 90 ? (
                            <span className="text-danger-600 font-bold">NEAR FULL</span>
                          ) : b.occupancyRate >= 60 ? (
                            <span className="text-success-600">Optimal</span>
                          ) : (
                            <span>Available</span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-scholar-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            b.occupancyRate >= 90
                              ? "bg-danger-500"
                              : b.occupancyRate >= 60
                              ? "bg-success-600"
                              : "bg-marigold-500"
                          }`}
                          style={{ width: `${Math.min(100, b.occupancyRate)}%` }}
                        />
                      </div>
                    </td>

                    {/* Fee Volume */}
                    <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                      {formatCurrency(b.totalFees)}
                    </td>

                    {/* Attendance Rate */}
                    <td className="px-4 py-3 text-center tabular-nums">
                      {b.attendanceRate !== null ? (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            b.attendanceRate >= 75
                              ? "bg-success-50 text-success-700"
                              : "bg-danger-50 text-danger-700"
                          }`}
                        >
                          {b.attendanceRate}%
                        </span>
                      ) : (
                        <span className="text-scholar-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
