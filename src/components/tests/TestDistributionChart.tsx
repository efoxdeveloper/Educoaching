"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { BarChart2 } from "lucide-react";

export function TestDistributionChart({
  distribution,
}: {
  distribution: { range: string; count: number }[];
}) {
  const chartColors = ["#1F9D66", "#2F507A", "#4E6E93", "#E8A33D", "#D64545"];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="range" stroke="#7E9BBC" fontSize={11} tickLine={false} axisLine={{ stroke: "#D6E0EB" }} />
          <YAxis allowDecimals={false} stroke="#7E9BBC" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "#F7F5F0" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload;
              return (
                <div className="rounded-xl border border-scholar-100 bg-white p-2.5 shadow-popover">
                  <p className="text-xs font-semibold text-ink">{item.range}</p>
                  <p className="text-xs text-scholar-500">
                    Students: <strong>{item.count}</strong>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {distribution.map((_, index) => (
              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
