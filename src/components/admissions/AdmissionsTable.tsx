"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Phone,
  MessageSquare,
  PhoneCall,
  Flame,
  Zap,
  Snowflake,
  Kanban,
  Table as TableIcon,
  Calendar,
  RotateCcw,
  BarChart3,
  Video,
  GraduationCap,
  AlertOctagon,
  Bell,
  Globe,
  Check,
  ExternalLink,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { AddAdmissionDrawer } from "./AddAdmissionDrawer";
import { AddFollowUpDrawer } from "./AddFollowUpDrawer";
import { ScheduleDemoDrawer } from "./ScheduleDemoDrawer";
import { MarkLostLeadModal } from "./MarkLostLeadModal";
import { ConvertLeadModal } from "./ConvertLeadModal";
import { LeadRemindersDrawer } from "./LeadRemindersDrawer";
import { LeadPipelineBoard, type PipelineLead } from "./LeadPipelineBoard";
import { CounsellorAnalyticsTab } from "./CounsellorAnalyticsTab";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

const STAGES = [
  { value: "NEW", label: "New Inquiry" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
  { value: "COUNSELLING", label: "Counselling" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "LOST", label: "Lost / Dropped" },
];

const PRIORITIES = [
  { value: "HOT", label: "🔥 Hot" },
  { value: "WARM", label: "⚡ Warm" },
  { value: "COLD", label: "❄️ Cold" },
];

export function AdmissionsTable({
  admissions,
  courses,
  batches,
  branches,
  faculty = [],
  defaultCounsellorId,
  instituteSlug,
  userName,
}: {
  admissions: PipelineLead[];
  courses: { id: string; name: string; fee: string }[];
  batches: { id: string; name: string; courseId: string }[];
  branches: { id: string; name: string }[];
  faculty?: { id: string; name: string; roleType: string }[];
  defaultCounsellorId?: string;
  instituteSlug?: string;
  userName?: string;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"table" | "pipeline" | "analytics">("table");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [todayFollowUpOnly, setTodayFollowUpOnly] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<PipelineLead | null>(null);
  const [demoTarget, setDemoTarget] = useState<PipelineLead | null>(null);
  const [lostTarget, setLostTarget] = useState<PipelineLead | null>(null);
  const [convertTarget, setConvertTarget] = useState<PipelineLead | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Count leads in each pipeline stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      DEMO_SCHEDULED: 0,
      COUNSELLING: 0,
      ENROLLED: 0,
      LOST: 0,
    };
    admissions.forEach((a) => {
      if (counts[a.stage] !== undefined) {
        counts[a.stage]++;
      }
    });
    return counts;
  }, [admissions]);

  // Count leads whose next follow-up is scheduled for today
  const todayDueCount = useMemo(() => {
    const today = new Date();
    return admissions.filter((a) => {
      if (!a.nextFollowUpDate) return false;
      const d = new Date(a.nextFollowUpDate);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }).length;
  }, [admissions]);

  const hasActiveFilters = Boolean(
    query.trim() ||
      stageFilter ||
      priorityFilter ||
      sourceFilter ||
      todayFollowUpOnly
  );

  const handleResetFilters = () => {
    setQuery("");
    setStageFilter("");
    setPriorityFilter("");
    setSourceFilter("");
    setTodayFollowUpOnly(false);
  };

  const filtered = useMemo(() => {
    const today = new Date();
    return admissions.filter((a) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === "" ||
        a.applicantName.toLowerCase().includes(q) ||
        a.mobile.includes(q);

      // In pipeline board mode, we show all columns so each stage is visible
      const matchesStage = viewMode === "pipeline" || !stageFilter || a.stage === stageFilter;
      const matchesPriority = !priorityFilter || a.priority === priorityFilter;
      const matchesSource = !sourceFilter || a.source === sourceFilter;

      let matchesToday = true;
      if (todayFollowUpOnly) {
        if (!a.nextFollowUpDate) {
          matchesToday = false;
        } else {
          const d = new Date(a.nextFollowUpDate);
          matchesToday =
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
        }
      }

      return matchesQuery && matchesStage && matchesPriority && matchesSource && matchesToday;
    });
  }, [admissions, query, stageFilter, priorityFilter, sourceFilter, todayFollowUpOnly, viewMode]);

  const handleStageChange = async (id: string, stage: string) => {
    const lead = admissions.find((a) => a.id === id);
    if (stage === "DEMO_SCHEDULED" && lead) {
      setDemoTarget(lead);
      return;
    }
    if (stage === "LOST" && lead) {
      setLostTarget(lead);
      return;
    }
    if (stage === "ENROLLED" && lead) {
      setConvertTarget(lead);
      return;
    }

    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update pipeline stage");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update stage.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View Switcher & Today's Follow-up Alert */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-scholar-100 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewMode === "table"
                    ? "bg-scholar-600 text-white shadow-sm"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                <TableIcon size={14} />
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pipeline")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewMode === "pipeline"
                    ? "bg-scholar-600 text-white shadow-sm"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                <Kanban size={14} />
                Pipeline Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode("analytics")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewMode === "analytics"
                    ? "bg-scholar-600 text-white shadow-sm"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                <BarChart3 size={14} />
                Counsellor Performance
              </button>
            </div>

            {/* Quick Today's Follow-ups Filter Button */}
            {viewMode !== "analytics" && (
              <button
                type="button"
                onClick={() => setTodayFollowUpOnly(!todayFollowUpOnly)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                  todayFollowUpOnly
                    ? "border-marigold-500 bg-marigold-500 text-white"
                    : "border-marigold-200 bg-marigold-50/70 text-marigold-800 hover:bg-marigold-100"
                }`}
              >
                <Calendar size={13} />
                <span>Today&apos;s Follow-ups</span>
                {todayDueCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      todayFollowUpOnly ? "bg-white text-marigold-800" : "bg-marigold-500 text-white"
                    }`}
                  >
                    {todayDueCount}
                  </span>
                )}
              </button>
            )}
          </div>

            {viewMode !== "analytics" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/enquire/${instituteSlug || ""}`;
                    navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-xs font-bold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs cursor-pointer"
                  title="Copy public website admissions enquiry link"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Globe size={14} className="text-scholar-600" />}
                  <span>{copiedLink ? "Link Copied!" : "Enquiry Form Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRemindersOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                  title="Send follow-up reminders to counsellors"
                >
                  <Bell size={14} className="text-amber-700" />
                  <span>Send Reminders</span>
                </button>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-scholar-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-scholar-700 transition-colors cursor-pointer"
                >
                  <Plus size={15} />
                  New Lead / Inquiry
                </button>
              </div>
            )}
          </div>

        {/* Filter Bar & Quick Stage Tabs */}
        {viewMode !== "analytics" && (
          <Card className="p-3 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex min-w-[200px] max-w-sm flex-1 items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2">
                <Search size={15} className="text-scholar-300 shrink-0" />
                <input
                  placeholder="Search leads by name or mobile..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent text-xs outline-none placeholder:text-scholar-300"
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-scholar-100 bg-paper px-3 py-2 text-xs font-medium text-scholar-600 outline-none"
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-xl border border-scholar-100 bg-paper px-3 py-2 text-xs font-medium text-scholar-600 outline-none"
              >
                <option value="">All Sources</option>
                <option value="WALK_IN">Walk-in</option>
                <option value="WEBSITE">Website</option>
                <option value="GOOGLE">Google Search</option>
                <option value="SOCIAL_MEDIA">Social Media</option>
                <option value="REFERRAL">Referral</option>
                <option value="HOARDING_BANNER">Banner / Ad</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 rounded-xl border border-scholar-200 bg-scholar-50 px-2.5 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-100 transition-colors"
                  title="Reset all filters"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Quick Stage Filter Pills Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-scholar-100/70">
              <button
                type="button"
                onClick={() => setStageFilter("")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border transition-all ${
                  stageFilter === ""
                    ? "bg-scholar-800 text-white border-scholar-800 shadow-2xs"
                    : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
                }`}
              >
                <span>All Leads</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    stageFilter === "" ? "bg-white/25 text-white" : "bg-scholar-100 text-scholar-700"
                  }`}
                >
                  {admissions.length}
                </span>
              </button>

              {STAGES.map((s) => {
                const count = stageCounts[s.value] || 0;
                const isSelected = stageFilter === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStageFilter(isSelected ? "" : s.value)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                      isSelected
                        ? "bg-scholar-800 text-white border-scholar-800 shadow-2xs"
                        : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
                    }`}
                  >
                    <span>{s.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isSelected ? "bg-white/25 text-white" : "bg-scholar-100 text-scholar-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* View Mode 1: Tabular List View (Default - Zero Horizontal Scrolling) */}
        {viewMode === "table" && (
          <Card className="overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="border-b border-scholar-100 bg-scholar-50/80 text-left uppercase tracking-wider text-scholar-500 font-semibold text-[11px]">
                  <tr>
                    <th className="px-3.5 py-3">Lead / Applicant</th>
                    <th className="px-3.5 py-3">Contact</th>
                    <th className="px-3.5 py-3">Course & Batch</th>
                    <th className="px-3.5 py-3">Priority</th>
                    <th className="px-3.5 py-3">Stage</th>
                    <th className="px-3.5 py-3">Follow-up</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-scholar-100/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-scholar-400">
                        No leads match your search or filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const followDate = a.nextFollowUpDate ? new Date(a.nextFollowUpDate) : null;
                      const isTodayFollow =
                        followDate &&
                        followDate.getDate() === today.getDate() &&
                        followDate.getMonth() === today.getMonth() &&
                        followDate.getFullYear() === today.getFullYear();
                      const isPastFollow = followDate && followDate < today && !isTodayFollow;

                      return (
                        <tr key={a.id} className="hover:bg-scholar-50/50 transition-colors">
                          {/* Lead Name & Source */}
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-scholar-100 text-xs font-bold text-scholar-700">
                                {initials(a.applicantName)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-ink truncate">{a.applicantName}</p>
                                <span className="rounded bg-scholar-100 px-1 py-0.2 text-[9px] font-bold text-scholar-600 uppercase">
                                  {a.source.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact: Phone & WhatsApp */}
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-ink">{a.mobile}</span>
                              <a
                                href={`tel:${a.mobile}`}
                                title="Call lead"
                                className="text-scholar-400 hover:text-scholar-800 p-0.5"
                              >
                                <Phone size={12} />
                              </a>
                              <a
                                href={`https://wa.me/91${a.mobile}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat on WhatsApp"
                                className="text-emerald-600 hover:opacity-80 p-0.5"
                              >
                                <MessageSquare size={12} />
                              </a>
                            </div>
                            {a.email && <p className="text-[10px] text-scholar-400 truncate max-w-[140px]">{a.email}</p>}
                          </td>

                          {/* Course & Fee */}
                          <td className="px-3.5 py-2.5">
                            <p className="font-semibold text-ink truncate">{a.course.name}</p>
                            <p className="text-[10px] text-scholar-500">
                              {a.batch?.name ?? "Unassigned"} &middot; {formatCurrency(a.feePlan)}
                            </p>
                          </td>

                          {/* Priority */}
                          <td className="px-3.5 py-2.5">
                            {a.priority === "HOT" ? (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/60">
                                <Flame size={10} className="text-rose-600" /> HOT
                              </span>
                            ) : a.priority === "WARM" ? (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/60">
                                <Zap size={10} className="text-amber-600" /> WARM
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-scholar-50 px-1.5 py-0.5 text-[10px] font-semibold text-scholar-600 border border-scholar-200/60">
                                <Snowflake size={10} className="text-scholar-400" /> COLD
                              </span>
                            )}
                          </td>

                          {/* Stage Dropdown */}
                          <td className="px-3.5 py-2.5">
                            <select
                              value={a.stage}
                              disabled={updatingId === a.id}
                              onChange={(e) => handleStageChange(a.id, e.target.value)}
                              className="rounded-lg border border-scholar-200 bg-white px-2 py-1 text-xs font-semibold text-scholar-800 outline-none hover:border-scholar-400 cursor-pointer shadow-2xs"
                            >
                              {STAGES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Next Follow-up */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {a.nextFollowUpDate ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                  isPastFollow
                                    ? "bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                                    : isTodayFollow
                                    ? "bg-amber-50 text-amber-800 border border-amber-200 font-bold"
                                    : "bg-scholar-50 text-scholar-700 border border-scholar-200/60"
                                }`}
                              >
                                <Calendar size={11} />
                                {formatDate(a.nextFollowUpDate)}
                                {isPastFollow && " (Overdue)"}
                                {isTodayFollow && " (Today)"}
                              </span>
                            ) : (
                              <span className="text-scholar-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Quick Actions */}
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setFollowUpTarget(a)}
                                className="inline-flex items-center gap-1 rounded-lg bg-scholar-100/80 px-2 py-1 text-xs font-bold text-scholar-800 hover:bg-scholar-200 transition-colors shadow-2xs"
                              >
                                <PhoneCall size={11} className="text-scholar-600" />
                                <span>Log Call {a.followUps?.length ? `(${a.followUps.length})` : ""}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDemoTarget(a)}
                                title="Schedule & Track Demo"
                                className="rounded-lg bg-amber-50 p-1.5 text-amber-800 hover:bg-amber-100 transition-colors border border-amber-200/60"
                              >
                                <Video size={12} />
                              </button>

                              {a.status !== "ENROLLED" && (
                                <button
                                  type="button"
                                  onClick={() => setConvertTarget(a)}
                                  title="Convert to Enrolled Student"
                                  className="rounded-lg bg-emerald-50 p-1.5 text-emerald-800 hover:bg-emerald-100 transition-colors border border-emerald-200/60"
                                >
                                  <GraduationCap size={12} />
                                </button>
                              )}

                              {a.stage !== "LOST" && (
                                <button
                                  type="button"
                                  onClick={() => setLostTarget(a)}
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-scholar-100 bg-scholar-50/40 px-4 py-2.5 text-xs text-scholar-600 flex items-center justify-between">
              <span>
                Showing <strong>{filtered.length}</strong> of <strong>{admissions.length}</strong> inquiries
              </span>
              {todayDueCount > 0 && (
                <span className="text-amber-800 font-semibold">
                  {todayDueCount} follow-up{todayDueCount > 1 ? "s" : ""} scheduled for today
                </span>
              )}
            </div>
          </Card>
        )}

        {/* View Mode 2: Kanban Pipeline Board */}
        {viewMode === "pipeline" && (
          <LeadPipelineBoard
            leads={filtered}
            onLogCall={(lead) => setFollowUpTarget(lead)}
            onStageChange={handleStageChange}
            onScheduleDemo={(lead) => setDemoTarget(lead)}
            onConvert={(lead) => setConvertTarget(lead)}
            onMarkLost={(lead) => setLostTarget(lead)}
            updatingId={updatingId}
          />
        )}

        {/* View Mode 3: Counsellor Performance Analytics */}
        {viewMode === "analytics" && <CounsellorAnalyticsTab />}
      </div>

      {/* Drawer: Add New Lead / Admission */}
      <AddAdmissionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        courses={courses}
        batches={batches}
        branches={branches}
        faculty={faculty}
        defaultCounsellorId={defaultCounsellorId}
      />

      {/* Drawer: Log Follow-up & Counselling Call */}
      <AddFollowUpDrawer
        lead={followUpTarget}
        open={!!followUpTarget}
        onClose={() => setFollowUpTarget(null)}
        userName={userName}
        faculty={faculty}
        defaultCounsellorId={defaultCounsellorId}
        onSuccess={() => router.refresh()}
      />

      {/* Drawer: Schedule & Track Demo */}
      <ScheduleDemoDrawer
        lead={demoTarget}
        open={!!demoTarget}
        onClose={() => setDemoTarget(null)}
        onSuccess={() => router.refresh()}
        batches={batches}
      />

      {/* Modal: Mark Lead as Lost */}
      <MarkLostLeadModal
        lead={lostTarget}
        open={!!lostTarget}
        onClose={() => setLostTarget(null)}
        onSuccess={() => router.refresh()}
      />

      {/* Modal: 1-Click Convert to Student */}
      <ConvertLeadModal
        lead={convertTarget}
        open={!!convertTarget}
        onClose={() => setConvertTarget(null)}
        onSuccess={() => router.refresh()}
        courses={courses}
        batches={batches}
      />

      {/* Drawer: Automated Lead Follow-up Reminders */}
      <LeadRemindersDrawer
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        onDispatched={() => router.refresh()}
      />
    </>
  );
}