"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Users } from "lucide-react";
import { useMemo } from "react";

type StudentLite = {
  status: string;
  course: { name: string };
};

export function StudentsDistributionCharts({ students }: { students: StudentLite[] }) {
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) map[s.status] = (map[s.status] || 0) + 1;
    return map;
  }, [students]);

  const statusDonutData = useMemo(() => {
    const colors: Record<string, string> = { ACTIVE: "#059669", ON_HOLD: "#F59E0B", INACTIVE: "#94A3B8" };
    return Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace("_", " "), value, color: colors[name] || "#1E3A5F" }));
  }, [statusCounts]);

  const courseCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) map[s.course.name] = (map[s.course.name] || 0) + 1;
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [students]);

  return (
    <Box sx={{ mb: 2, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" }, gap: 2 }}>
      <Card sx={{ p: 2, display: "flex", flexDirection: "column" }}>
        <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.75 }}>
          <Users size={14} style={{ color: "#1E3A5F" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>
            Students by Status
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ mb: 1.5, color: "#7E9BBC", fontSize: "0.75rem" }}>
          Active vs On Hold vs Inactive — distribution, not just count
        </Typography>
        <Box sx={{ height: 180, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusDonutData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={70}
                paddingAngle={2}
                stroke="none"
              >
                {statusDonutData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1.5 }}>
          {statusDonutData.map((d) => (
            <Box key={d.name} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ height: 8, width: 8, borderRadius: "50%", bgcolor: d.color }} />
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569" }}>
                {d.name} ({d.value})
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" sx={{ mt: 1, textAlign: "center", fontSize: "11px", color: "#7E9BBC" }}>
          Total: {students.length} students
        </Typography>
      </Card>

      <Card sx={{ p: 2 }}>
        <Box sx={{ mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>
            Students per Course
          </Typography>
          <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
            Top 6 courses
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ mb: 1.5, display: "block", color: "#7E9BBC", fontSize: "0.75rem" }}>
          Enrollment concentration by program — bar length = headcount
        </Typography>
        <Box sx={{ height: 180, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={courseCounts} margin={{ left: -10, right: 16, top: 4, bottom: 4 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#4E6E93" } as any}
                interval={0}
                angle={-14}
                textAnchor="end"
                height={50}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: "#4E6E93" } as any} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any} />
              <Bar dataKey="count" fill="#1E3A5F" radius={[6, 6, 0, 0] as any} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>
    </Box>
  );
}
