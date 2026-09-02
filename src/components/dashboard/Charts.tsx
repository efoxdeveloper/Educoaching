"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";

export function CollectionChart({
  data,
}: {
  data: { day: string; amount: number }[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">
            Collection trend
          </h3>
          <p className="text-xs text-scholar-400">Last 7 days</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ left: -20, right: 8, top: 8 }}
        >
          <defs>
            <linearGradient
              id="collectionFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#E8A33D"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="#E8A33D"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#EEF2F7"
            vertical={false}
          />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "#4E6E93" }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fontSize: 12, fill: "#4E6E93" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />

          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #D6E0EB",
              fontSize: 12,
            }}
            formatter={(value) => [
              `₹${Number(value ?? 0).toLocaleString("en-IN")}`,
              "Collection",
            ]}
          />

          <Area
            type="monotone"
            dataKey="amount"
            stroke="#E8A33D"
            strokeWidth={2.5}
            fill="url(#collectionFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function AttendanceChart({
  data,
}: {
  data: { day: string; percent: number }[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">
            Attendance trend
          </h3>
          <p className="text-xs text-scholar-400">
            Last 7 days, all batches
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ left: -20, right: 8, top: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#EEF2F7"
            vertical={false}
          />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "#4E6E93" }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fontSize: 12, fill: "#4E6E93" }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={[0, 100]}
          />

          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #D6E0EB",
              fontSize: 12,
            }}
            formatter={(value) => [
              `${Number(value ?? 0)}%`,
              "Present",
            ]}
          />

          <Bar
            dataKey="percent"
            fill="#1E3A5F"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function LeadFunnelChart({
  data,
}: {
  data: { stage: string; count: number; color: string }[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">
            Lead CRM Pipeline Funnel
          </h3>
          <p className="text-xs text-scholar-400">
            Prospect progression from inquiry to enrolled student
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 10, right: 24, top: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="stage"
            tick={{ fontSize: 11, fill: "#1E3A5F" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #D6E0EB",
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value ?? 0)} leads`, "Volume"]}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function LeadSourceBarChart({
  data,
}: {
  data: { source: string; count: number }[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">
            Inquiry Acquisition Sources
          </h3>
          <p className="text-xs text-scholar-400">Where student leads originate</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
          <XAxis
            dataKey="source"
            tick={{ fontSize: 11, fill: "#4E6E93" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#4E6E93" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #D6E0EB",
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value ?? 0)} inquiries`, "Leads"]}
          />
          <Bar dataKey="count" fill="#E8A33D" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}