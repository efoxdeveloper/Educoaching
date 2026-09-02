"use client";

import { useMemo, useState } from "react";
import {
  Phone,
  MessageSquare,
  Calendar,
  PhoneCall,
  Flame,
  Zap,
  Snowflake,
  CheckCircle2,
  Inbox,
  Video,
  GraduationCap,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

export type PipelineLead = {
  id: string;
  applicantName: string;
  mobile: string;
  email: string | null;
  feePlan: string | number;
  status: string;
  stage: string;
  source: string;
  priority: string;
  nextFollowUpDate: string | null;
  assignedTo: string | null;
  createdAt: string;
  course: { id: string; name: string };
  batch: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  demoDate?: string | null;
  demoStatus?: string | null;
  demoFeedback?: string | null;
  lostReason?: string | null;
  lostNotes?: string | null;
  followUps?: {
    id: string;
    counsellor: string;
    callStatus: string;
    notes: string;
    scheduledAt: string | null;
    createdAt: string;
  }[];
};

const STAGES = [
  {
    key: "NEW",
    label: "New Inquiries",
    dotColor: "bg-scholar-600",
    headerBg: "bg-scholar-50",
    borderColor: "border-scholar-200",
    accentColor: "text-scholar-800",
    badgeBg: "bg-scholar-100 text-scholar-800",
  },
  {
    key: "CONTACTED",
    label: "Contacted",
    dotColor: "bg-blue-600",
    headerBg: "bg-blue-50/70",
    borderColor: "border-blue-200",
    accentColor: "text-blue-900",
    badgeBg: "bg-blue-100 text-blue-800",
  },
  {
    key: "DEMO_SCHEDULED",
    label: "Demo Scheduled",
    dotColor: "bg-amber-500",
    headerBg: "bg-amber-50/70",
    borderColor: "border-amber-200",
    accentColor: "text-amber-900",
    badgeBg: "bg-amber-100 text-amber-900",
  },
  {
    key: "COUNSELLING",
    label: "Counselling",
    dotColor: "bg-purple-600",
    headerBg: "bg-purple-50/70",
    borderColor: "border-purple-200",
    accentColor: "text-purple-900",
    badgeBg: "bg-purple-100 text-purple-800",
  },
  {
    key: "ENROLLED",
    label: "Enrolled",
    dotColor: "bg-emerald-600",
    headerBg: "bg-emerald-50/70",
    borderColor: "border-emerald-200",
    accentColor: "text-emerald-900",
    badgeBg: "bg-emerald-100 text-emerald-800",
  },
  {
    key: "LOST",
    label: "Lost / Dropped",
    dotColor: "bg-slate-500",
    headerBg: "bg-slate-50",
    borderColor: "border-slate-200",
    accentColor: "text-slate-800",
    badgeBg: "bg-slate-100 text-slate-700",
  },
];

export function LeadPipelineBoard({
  leads,
  onLogCall,
  onStageChange,
  onScheduleDemo,
  onConvert,
  onMarkLost,
  updatingId,
}: {
  leads: PipelineLead[];
  onLogCall: (lead: PipelineLead) => void;
  onStageChange: (id: string, stage: string) => void;
  onScheduleDemo?: (lead: PipelineLead) => void;
  onConvert?: (lead: PipelineLead) => void;
  onMarkLost?: (lead: PipelineLead) => void;
  updatingId: string | null;
}) {
  // Track expanded stages (all expanded by default)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    NEW: true,
    CONTACTED: true,
    DEMO_SCHEDULED: true,
    COUNSELLING: true,
    ENROLLED: true,
    LOST: true,
  });

  const toggleStage = (stageKey: string) => {
    setExpandedStages((prev) => ({ ...prev, [stageKey]: !prev[stageKey] }));
  };

  const expandAll = () => {
    setExpandedStages({
      NEW: true,
      CONTACTED: true,
      DEMO_SCHEDULED: true,
      COUNSELLING: true,
      ENROLLED: true,
      LOST: true,
    });
  };

  const collapseAll = () => {
    setExpandedStages({
      NEW: false,
      CONTACTED: false,
      DEMO_SCHEDULED: false,
      COUNSELLING: false,
      ENROLLED: false,
      LOST: false,
    });
  };

  const grouped = useMemo(() => {
    const map: Record<string, PipelineLead[]> = {
      NEW: [],
      CONTACTED: [],
      DEMO_SCHEDULED: [],
      COUNSELLING: [],
      ENROLLED: [],
      LOST: [],
    };

    leads.forEach((l) => {
      const stage = map[l.stage] ? l.stage : "NEW";
      map[stage].push(l);
    });

    return map;
  }, [leads]);

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  return (
    <div className="space-y-4 w-full">
      {/* Top Stage KPI Summary Grid (Screen-fitting, no horizontal scroll) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STAGES.map((col) => {
          const stageLeads = grouped[col.key] || [];
          const totalValue = stageLeads.reduce((acc, l) => acc + Number(l.feePlan || 0), 0);
          const isExpanded = expandedStages[col.key];

          return (
            <button
              key={col.key}
              type="button"
              onClick={() => toggleStage(col.key)}
              className={`text-left rounded-xl border p-2.5 transition-all shadow-2xs hover:shadow-sm cursor-pointer ${
                col.borderColor
              } ${col.headerBg} ${isExpanded ? "ring-2 ring-scholar-400/40" : "opacity-80"}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`h-2 w-2 rounded-full ${col.dotColor} shrink-0`} />
                  <span className={`text-xs font-bold truncate ${col.accentColor}`}>{col.label}</span>
                </div>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${col.badgeBg}`}>
                  {stageLeads.length}
                </span>
              </div>
              <p className="text-[11px] font-bold text-scholar-800 mt-1.5">
                {formatCurrency(totalValue)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Expand / Collapse Controls */}
      <div className="flex items-center justify-between text-xs text-scholar-500 px-1">
        <span className="font-medium">
          Stage-wise Tabular Pipeline ({leads.length} total inquiries)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] font-semibold text-scholar-600 hover:text-scholar-900 underline cursor-pointer"
          >
            Expand All
          </button>
          <span>&middot;</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] font-semibold text-scholar-600 hover:text-scholar-900 underline cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Stage Tables Container (Zero Horizontal Scrolling) */}
      <div className="space-y-3.5">
        {STAGES.map((col) => {
          const stageLeads = grouped[col.key] || [];
          const totalValue = stageLeads.reduce((acc, l) => acc + Number(l.feePlan || 0), 0);
          const isExpanded = expandedStages[col.key];

          return (
            <div
              key={col.key}
              className={`rounded-xl border overflow-hidden bg-white shadow-2xs transition-all ${col.borderColor}`}
            >
              {/* Stage Table Header Banner */}
              <div
                onClick={() => toggleStage(col.key)}
                className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer border-b ${col.borderColor} ${col.headerBg} select-none`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor} shrink-0`} />
                  <h3 className={`text-xs font-bold ${col.accentColor}`}>{col.label}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${col.badgeBg}`}>
                    {stageLeads.length} {stageLeads.length === 1 ? "lead" : "leads"}
                  </span>
                  <span className="text-[11px] text-scholar-500 hidden sm:inline">
                    &middot; Target Vol: <strong className="text-scholar-800">{formatCurrency(totalValue)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-scholar-500">
                  <span className="text-[11px] font-semibold sm:hidden">{formatCurrency(totalValue)}</span>
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>

              {/* Stage Table Content */}
              {isExpanded && (
                <div className="w-full">
                  {stageLeads.length === 0 ? (
                    <div className="py-6 px-4 text-center text-xs text-scholar-400 bg-scholar-50/20">
                      No inquiries currently in {col.label}.
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-xs">
                      <thead className="border-b border-scholar-100 bg-scholar-50/50 text-left uppercase tracking-wider text-scholar-500 font-semibold text-[10px]">
                        <tr>
                          <th className="px-3.5 py-2">Applicant / Lead</th>
                          <th className="px-3.5 py-2">Contact</th>
                          <th className="px-3.5 py-2">Course & Target</th>
                          <th className="px-3.5 py-2">Priority</th>
                          <th className="px-3.5 py-2">Follow-up / Notes</th>
                          <th className="px-3.5 py-2">Stage Move</th>
                          <th className="px-3.5 py-2 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-scholar-100/60">
                        {stageLeads.map((lead) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const followDate = lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate) : null;
                          const followUpDue = isToday(lead.nextFollowUpDate);
                          const followUpPast = isOverdue(lead.nextFollowUpDate);

                          return (
                            <tr key={lead.id} className="hover:bg-scholar-50/40 transition-colors">
                              {/* Lead Name & Source */}
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-scholar-100 text-xs font-bold text-scholar-700">
                                    {initials(lead.applicantName)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-ink truncate">{lead.applicantName}</p>
                                      {lead.status === "ENROLLED" && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                                          <CheckCircle2 size={10} /> Enrolled
                                        </span>
                                      )}
                                    </div>
                                    <span className="rounded bg-scholar-100 px-1 py-0.2 text-[9px] font-bold text-scholar-600 uppercase">
                                      {lead.source.replace("_", " ")}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Contact */}
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-ink">{lead.mobile}</span>
                                  <a
                                    href={`tel:${lead.mobile}`}
                                    title="Call applicant"
                                    className="text-scholar-400 hover:text-scholar-800 p-0.5"
                                  >
                                    <Phone size={12} />
                                  </a>
                                  <a
                                    href={`https://wa.me/91${lead.mobile}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Chat on WhatsApp"
                                    className="text-emerald-600 hover:opacity-80 p-0.5"
                                  >
                                    <MessageSquare size={12} />
                                  </a>
                                </div>
                                {lead.email && <p className="text-[10px] text-scholar-400 truncate max-w-[130px]">{lead.email}</p>}
                              </td>

                              {/* Course & Target */}
                              <td className="px-3.5 py-2.5">
                                <p className="font-semibold text-ink truncate">{lead.course.name}</p>
                                <p className="text-[10px] text-scholar-500">
                                  {lead.batch?.name ?? "General"} &middot; <strong className="text-scholar-700">{formatCurrency(lead.feePlan)}</strong>
                                </p>
                              </td>

                              {/* Priority */}
                              <td className="px-3.5 py-2.5">
                                {lead.priority === "HOT" ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/60">
                                    <Flame size={10} className="text-rose-600" /> HOT
                                  </span>
                                ) : lead.priority === "WARM" ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/60">
                                    <Zap size={10} className="text-amber-600" /> WARM
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-scholar-50 px-1.5 py-0.5 text-[10px] font-semibold text-scholar-600 border border-scholar-200/60">
                                    <Snowflake size={10} className="text-scholar-400" /> COLD
                                  </span>
                                )}
                              </td>

                              {/* Follow-up / Demo Alert */}
                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                <div className="space-y-1">
                                  {lead.nextFollowUpDate ? (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                        followUpPast
                                          ? "bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                                          : followUpDue
                                          ? "bg-amber-50 text-amber-800 border border-amber-200 font-bold"
                                          : "bg-scholar-50 text-scholar-700 border border-scholar-200/60"
                                      }`}
                                    >
                                      <Calendar size={10} />
                                      {formatDate(lead.nextFollowUpDate)}
                                      {followUpPast && " (Overdue)"}
                                      {followUpDue && " (Today)"}
                                    </span>
                                  ) : (
                                    <span className="text-scholar-400 text-[10px]">No follow-up set</span>
                                  )}

                                  {lead.demoDate && (
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-800">
                                      <Video size={10} className="text-amber-600" />
                                      <span>Demo: {formatDate(lead.demoDate)}</span>
                                    </div>
                                  )}

                                  {lead.lostReason && (
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-700">
                                      <AlertOctagon size={10} />
                                      <span>Lost: {lead.lostReason.replace(/_/g, " ")}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Stage Move Dropdown */}
                              <td className="px-3.5 py-2.5">
                                <select
                                  disabled={updatingId === lead.id}
                                  value={lead.stage}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "DEMO_SCHEDULED" && onScheduleDemo) {
                                      onScheduleDemo(lead);
                                    } else if (val === "ENROLLED" && onConvert) {
                                      onConvert(lead);
                                    } else if (val === "LOST" && onMarkLost) {
                                      onMarkLost(lead);
                                    } else {
                                      onStageChange(lead.id, val);
                                    }
                                  }}
                                  className="rounded-lg border border-scholar-200 bg-white px-2 py-1 text-xs font-semibold text-scholar-800 outline-none hover:border-scholar-400 cursor-pointer shadow-2xs"
                                >
                                  {STAGES.map((s) => (
                                    <option key={s.key} value={s.key}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Actions */}
                              <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onLogCall(lead)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-scholar-100/80 px-2 py-1 text-xs font-bold text-scholar-800 hover:bg-scholar-200 transition-colors shadow-2xs"
                                  >
                                    <PhoneCall size={11} className="text-scholar-600" />
                                    <span>Log Call {lead.followUps?.length ? `(${lead.followUps.length})` : ""}</span>
                                  </button>

                                  {onScheduleDemo && (
                                    <button
                                      type="button"
                                      onClick={() => onScheduleDemo(lead)}
                                      title="Schedule / Track Demo"
                                      className="rounded-lg bg-amber-50 p-1.5 text-amber-800 hover:bg-amber-100 transition-colors border border-amber-200/60"
                                    >
                                      <Video size={12} />
                                    </button>
                                  )}

                                  {col.key !== "ENROLLED" && onConvert && (
                                    <button
                                      type="button"
                                      onClick={() => onConvert(lead)}
                                      title="Convert to Enrolled Student"
                                      className="rounded-lg bg-emerald-50 p-1.5 text-emerald-800 hover:bg-emerald-100 transition-colors border border-emerald-200/60"
                                    >
                                      <GraduationCap size={12} />
                                    </button>
                                  )}

                                  {col.key !== "LOST" && onMarkLost && (
                                    <button
                                      type="button"
                                      onClick={() => onMarkLost(lead)}
                                      title="Mark as Lost / Dropped"
                                      className="rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200/60"
                                    >
                                      <AlertOctagon size={12} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
