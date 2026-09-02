"use client";

import { useEffect, useState } from "react";
import {
  Trophy,
  PhoneCall,
  UserCheck,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency, initials } from "@/lib/utils";

type CounsellorMetric = {
  counsellor: string;
  assignedCount: number;
  callsLogged: number;
  demosBooked: number;
  enrolledCount: number;
  lostCount: number;
  activePipeline: number;
  conversionRate: number;
  revenueGenerated: number;
  avgCallsPerLead: number;
  dispositionBreakdown: Record<string, number>;
};

type AnalyticsData = {
  counsellors: CounsellorMetric[];
  summary: {
    totalLeads: number;
    totalCalls: number;
    totalEnrolled: number;
    overallConversionRate: number;
    totalRevenue: number;
    topCounsellor: CounsellorMetric | null;
    overallDispositions: Record<string, number>;
  };
};

export function CounsellorAnalyticsTab() {
  const [timeRange, setTimeRange] = useState<"ALL" | "THIS_MONTH" | "LAST_30_DAYS">("ALL");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admissions/counsellors/analytics?timeRange=${timeRange}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-scholar-500" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, counsellors } = data;

  const dispositionLabels: Record<string, { label: string; color: string }> = {
    INTERESTED: { label: "Interested", color: "bg-emerald-500" },
    DEMO_BOOKED: { label: "Demo Booked", color: "bg-indigo-500" },
    VISIT_PLANNED: { label: "Visit Planned", color: "bg-purple-500" },
    CALL_BACK: { label: "Call Back", color: "bg-marigold-500" },
    NOT_REACHABLE: { label: "Not Reachable", color: "bg-scholar-400" },
    ENROLLED: { label: "Enrolled", color: "bg-success-600" },
    DROPPED: { label: "Dropped", color: "bg-rose-500" },
  };

  const totalDispositionCalls = Object.values(summary.overallDispositions).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-ink">
            Counsellor Performance & Conversion Analytics
          </h2>
          <p className="text-xs text-scholar-500">
            Track counselor follow-up activity, demo conversions, and student enrollment revenue.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-scholar-100 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTimeRange("ALL")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              timeRange === "ALL"
                ? "bg-scholar-600 text-white shadow-sm"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("THIS_MONTH")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              timeRange === "THIS_MONTH"
                ? "bg-scholar-600 text-white shadow-sm"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("LAST_30_DAYS")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
              timeRange === "LAST_30_DAYS"
                ? "bg-scholar-600 text-white shadow-sm"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Follow-up Calls Logged</span>
            <div className="rounded-xl bg-scholar-50 p-2 text-scholar-600">
              <PhoneCall size={18} />
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-ink mt-2">{summary.totalCalls}</p>
          <p className="text-[11px] text-scholar-400 mt-1">
            Across {counsellors.length} active team members
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Admissions Closed</span>
            <div className="rounded-xl bg-success-50 p-2 text-success-600">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-ink mt-2">{summary.totalEnrolled}</p>
          <p className="text-[11px] text-scholar-400 mt-1">
            Total Revenue: <span className="font-semibold text-success-600">{formatCurrency(summary.totalRevenue)}</span>
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Average Conversion Rate</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="font-display text-2xl font-bold text-ink mt-2">
            {summary.overallConversionRate}%
          </p>
          <p className="text-[11px] text-scholar-400 mt-1">
            Out of {summary.totalLeads} total inquiries
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Top Performing Counsellor</span>
            <div className="rounded-xl bg-marigold-50 p-2 text-marigold-600">
              <Trophy size={18} />
            </div>
          </div>
          <p className="font-display text-lg font-bold text-ink mt-2 truncate">
            {summary.topCounsellor ? summary.topCounsellor.counsellor : "—"}
          </p>
          <p className="text-[11px] text-scholar-400 mt-1">
            {summary.topCounsellor ? (
              <span className="font-semibold text-scholar-700">
                {summary.topCounsellor.enrolledCount} enrolled ({summary.topCounsellor.conversionRate}%)
              </span>
            ) : (
              "No closed admissions yet"
            )}
          </p>
        </Card>
      </div>

      {/* Call Disposition Breakdown Bar */}
      <Card className="p-5">
        <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider mb-3">
          Overall Call Disposition Breakdown
        </h3>

        {totalDispositionCalls === 0 ? (
          <p className="text-xs text-scholar-400 py-3">No call dispositions logged for this time range.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-scholar-100">
              {Object.entries(summary.overallDispositions).map(([key, count]) => {
                const meta = dispositionLabels[key] || { label: key, color: "bg-scholar-400" };
                const pct = ((count / totalDispositionCalls) * 100).toFixed(1);
                return (
                  <div
                    key={key}
                    style={{ width: `${pct}%` }}
                    className={`${meta.color} transition-all`}
                    title={`${meta.label}: ${count} (${pct}%)`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs">
              {Object.entries(summary.overallDispositions).map(([key, count]) => {
                const meta = dispositionLabels[key] || { label: key, color: "bg-scholar-400" };
                const pct = ((count / totalDispositionCalls) * 100).toFixed(1);
                return (
                  <div key={key} className="flex items-center gap-1.5 text-scholar-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.color}`} />
                    <span className="font-medium text-ink">{meta.label}:</span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Leaderboard Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-scholar-100 bg-scholar-50/60 px-5 py-3.5">
          <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider">
            Counsellor Leaderboard & Conversion Matrix
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-xs">
            <thead className="border-b border-scholar-100 bg-scholar-50/30 text-left uppercase tracking-wider text-scholar-500 font-semibold">
              <tr>
                <th className="px-4 py-3 text-center w-12">Rank</th>
                <th className="px-4 py-3">Counsellor</th>
                <th className="px-4 py-3 text-center">Assigned Leads</th>
                <th className="px-4 py-3 text-center">Calls Made</th>
                <th className="px-4 py-3 text-center">Demos & Visits</th>
                <th className="px-4 py-3 text-center">Admissions Closed</th>
                <th className="px-4 py-3">Conversion Rate</th>
                <th className="px-4 py-3 text-right">Revenue Closed</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-scholar-50">
              {counsellors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-scholar-400">
                    No counsellor activity found for this period.
                  </td>
                </tr>
              ) : (
                counsellors.map((c, idx) => (
                  <tr key={c.counsellor} className="hover:bg-scholar-50/40 transition-colors">
                    <td className="px-4 py-3.5 text-center font-bold">
                      {idx === 0 && c.enrolledCount > 0 ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-marigold-100 text-marigold-800 text-xs shadow-sm">
                          🥇
                        </span>
                      ) : idx === 1 && c.enrolledCount > 0 ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs shadow-sm">
                          🥈
                        </span>
                      ) : idx === 2 && c.enrolledCount > 0 ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-900 text-xs shadow-sm">
                          🥉
                        </span>
                      ) : (
                        <span className="text-scholar-400 font-medium">#{idx + 1}</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-scholar-100 font-bold text-scholar-700 text-[11px]">
                          {initials(c.counsellor)}
                        </div>
                        <div>
                          <p className="font-bold text-ink text-xs">{c.counsellor}</p>
                          <p className="text-[10px] text-scholar-400">
                            {c.avgCallsPerLead} calls/lead avg
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center font-medium text-ink">
                      {c.assignedCount}
                    </td>

                    <td className="px-4 py-3.5 text-center font-semibold text-scholar-700">
                      {c.callsLogged}
                    </td>

                    <td className="px-4 py-3.5 text-center font-semibold text-indigo-600">
                      {c.demosBooked}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 font-bold text-success-700 border border-success-200/60">
                        {c.enrolledCount}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                          <span className={c.conversionRate >= 30 ? "text-success-600" : "text-scholar-700"}>
                            {c.conversionRate}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-scholar-100 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(c.conversionRate, 100)}%` }}
                            className={`h-full rounded-full ${
                              c.conversionRate >= 40
                                ? "bg-success-500"
                                : c.conversionRate >= 20
                                ? "bg-marigold-500"
                                : "bg-scholar-400"
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-ink">
                      {formatCurrency(c.revenueGenerated)}
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
