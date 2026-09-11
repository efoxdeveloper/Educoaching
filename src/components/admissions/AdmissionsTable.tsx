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
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  X,
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

// 21st.dev-inspired local components
import { LeadSectionTabs, type LeadSection } from "./ui/LeadSectionTabs";
import { StageBadge, PriorityBadge, FollowUpBadge } from "./ui/StatusBadge";
import { EmptyState } from "./ui/EmptyState";
import { LeadTableSkeleton } from "./ui/Skeleton";
import { LeadToastContainer, showLeadToast } from "./ui/Toast";
import { GuidedTooltip } from "./ui/Tooltip";

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
  const [activeSection, setActiveSection] = useState<LeadSection>("all");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [todayFollowUpOnly, setTodayFollowUpOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  // Count leads whose next follow-up is scheduled for today or overdue
  const todayDueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return admissions.filter((a) => {
      if (!a.nextFollowUpDate) return false;
      const d = new Date(a.nextFollowUpDate);
      d.setHours(0, 0, 0, 0);
      return d <= today && a.stage !== "ENROLLED" && a.stage !== "LOST";
    }).length;
  }, [admissions]);

  const convertedCount = stageCounts.ENROLLED || 0;
  const newCount = stageCounts.NEW || 0;

  // Follow-ups due = today or overdue, not enrolled/lost
  const followUpsDueLeads = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return admissions.filter((a) => {
      if (!a.nextFollowUpDate) return false;
      const d = new Date(a.nextFollowUpDate);
      d.setHours(0, 0, 0, 0);
      return d <= today && a.stage !== "ENROLLED" && a.stage !== "LOST";
    });
  }, [admissions]);

  const hasActiveFilters = Boolean(
    query.trim() ||
      stageFilter ||
      priorityFilter ||
      sourceFilter ||
      todayFollowUpOnly ||
      activeSection !== "all"
  );

  const handleResetFilters = () => {
    setQuery("");
    setStageFilter("");
    setPriorityFilter("");
    setSourceFilter("");
    setTodayFollowUpOnly(false);
    setActiveSection("all");
    setShowAdvancedFilters(false);
  };

  const filtered = useMemo(() => {
    const today = new Date();
    return admissions.filter((a) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === "" ||
        a.applicantName.toLowerCase().includes(q) ||
        a.mobile.includes(q);

      // Section filter (primary)
      let matchesSection = true;
      if (activeSection === "new") matchesSection = a.stage === "NEW";
      else if (activeSection === "followups") {
        if (!a.nextFollowUpDate) matchesSection = false;
        else {
          const d = new Date(a.nextFollowUpDate);
          d.setHours(0, 0, 0, 0);
          const t = new Date();
          t.setHours(0, 0, 0, 0);
          matchesSection = d <= t && a.stage !== "ENROLLED" && a.stage !== "LOST";
        }
      } else if (activeSection === "converted") matchesSection = a.stage === "ENROLLED";
      else matchesSection = true;

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

      return matchesQuery && matchesSection && matchesStage && matchesPriority && matchesSource && matchesToday;
    });
  }, [admissions, query, stageFilter, priorityFilter, sourceFilter, todayFollowUpOnly, viewMode, activeSection]);

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
      showLeadToast(`Lead moved to ${STAGES.find((s) => s.value === stage)?.label || stage}`, "success");
      router.refresh();
    } catch (err) {
      showLeadToast(err instanceof Error ? err.message : "Could not update stage. Please try again.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSectionChange = (section: LeadSection) => {
    setActiveSection(section);
    // When switching to follow-ups, also clear stage filter to avoid confusion
    if (section === "followups") setStageFilter("");
    if (section === "new") setStageFilter("NEW");
    if (section === "converted") setStageFilter("ENROLLED");
    if (section === "all") setStageFilter("");
  };

  return (
    <>
      <LeadToastContainer />
      <div className="space-y-4">
        {/* View Switcher — 21st.dev Tabs style */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl border border-scholar-100 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  viewMode === "table"
                    ? "bg-scholar-800 text-white shadow-sm"
                    : "text-scholar-600 hover:bg-scholar-50 hover:text-scholar-900"
                }`}
                aria-pressed={viewMode === "table"}
              >
                <TableIcon size={14} />
                <span className="hidden sm:inline">List View</span>
                <span className="sm:hidden">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pipeline")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  viewMode === "pipeline"
                    ? "bg-scholar-800 text-white shadow-sm"
                    : "text-scholar-600 hover:bg-scholar-50 hover:text-scholar-900"
                }`}
              >
                <Kanban size={14} />
                <span className="hidden sm:inline">Pipeline Board</span>
                <span className="sm:hidden">Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("analytics")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  viewMode === "analytics"
                    ? "bg-scholar-800 text-white shadow-sm"
                    : "text-scholar-600 hover:bg-scholar-50 hover:text-scholar-900"
                }`}
              >
                <BarChart3 size={14} />
                <span className="hidden sm:inline">Counsellor Performance</span>
                <span className="sm:hidden">Stats</span>
              </button>
            </div>

            {viewMode !== "analytics" && (
              <span className="hidden items-center gap-1.5 text-xs text-scholar-400 sm:inline-flex">
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                {admissions.length} total leads
              </span>
            )}
          </div>

          {viewMode !== "analytics" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/enquire/${instituteSlug || ""}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  showLeadToast("Enquiry form link copied! Share it with students.", "success");
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-bold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-sm"
                title="Copy link to share with students for new enquiries"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Globe size={14} className="text-scholar-600" />}
                <span className="hidden sm:inline">{copiedLink ? "Link Copied!" : "Copy Enquiry Form Link"}</span>
                <span className="sm:hidden">Link</span>
              </button>
              <GuidedTooltip content="Sends WhatsApp & Email reminders to counsellors for today's follow-ups">
                <button
                  type="button"
                  onClick={() => setRemindersOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-sm"
                >
                  <Bell size={14} className="text-amber-700" />
                  <span className="hidden sm:inline">Send Reminders</span>
                  <span className="sm:hidden">Remind</span>
                </button>
              </GuidedTooltip>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-scholar-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-scholar-900 transition-colors"
                aria-label="Add a new lead — enter name, phone and course"
              >
                <Plus size={15} />
                <span>Add New Lead</span>
              </button>
            </div>
          )}
        </div>

        {/* 21st.dev Section Tabs — New / Follow-ups / Converted / All */}
        {viewMode === "table" && (
          <LeadSectionTabs
            active={activeSection}
            onChange={handleSectionChange}
            counts={{ new: newCount, followups: followUpsDueLeads.length, converted: convertedCount, all: admissions.length }}
          />
        )}

        {/* Prominent Search + Filter Bar — 21st.dev style */}
        {viewMode !== "analytics" && (
          <Card className="p-3.5 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Primary: Search + Status */}
              <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="flex min-w-[240px] flex-1 items-center gap-2.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 shadow-sm focus-within:border-scholar-400 focus-within:ring-2 focus-within:ring-scholar-100">
                  <Search size={16} className="text-scholar-400 shrink-0" />
                  <input
                    placeholder="Search by student name or phone number..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-scholar-400"
                    aria-label="Search leads"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="text-scholar-400 hover:text-scholar-600" aria-label="Clear search">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="min-w-[160px] rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-semibold text-scholar-700 outline-none focus:border-scholar-400"
                    aria-label="Filter by lead stage"
                  >
                    <option value="">All Stages</option>
                    {STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label} ({stageCounts[s.value] || 0})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                      showAdvancedFilters || priorityFilter || sourceFilter
                        ? "border-scholar-800 bg-scholar-800 text-white"
                        : "border-scholar-200 bg-white text-scholar-700 hover:bg-scholar-50"
                    }`}
                  >
                    <SlidersHorizontal size={14} />
                    Filters
                    {(priorityFilter || sourceFilter) && <span className="ml-1 h-2 w-2 rounded-full bg-amber-400" />}
                    <ChevronDown size={12} className={`transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Today's Follow-ups Toggle — prominent */}
                <button
                  type="button"
                  onClick={() => setTodayFollowUpOnly(!todayFollowUpOnly)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all shadow-sm ${
                    todayFollowUpOnly
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <Calendar size={14} />
                  <span className="hidden sm:inline">Today&apos;s Follow-ups</span>
                  <span className="sm:hidden">Today</span>
                  {todayDueCount > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${todayFollowUpOnly ? "bg-white text-amber-800" : "bg-amber-500 text-white"}`}>
                      {todayDueCount}
                    </span>
                  )}
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
                  >
                    <RotateCcw size={12} />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Advanced filters — hidden by default */}
            {showAdvancedFilters && (
              <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-scholar-100 bg-scholar-50/40 p-3 animate-in fade-in">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-600 outline-none"
                >
                  <option value="">All Priorities — Hot, Warm, Cold</option>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-600 outline-none"
                >
                  <option value="">All Sources — Walk-in, Website, etc.</option>
                  <option value="WALK_IN">Walk-in to Centre</option>
                  <option value="WEBSITE">Website Form</option>
                  <option value="GOOGLE">Google Search</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="HOARDING_BANNER">Banner / Ad</option>
                </select>

                <span className="text-[11px] text-scholar-400">Tip: Use priority to focus on Hot leads first.</span>
              </div>
            )}

            {/* Quick Stage Pills — secondary */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-scholar-100/70 pt-3">
              <span className="mr-1 text-[11px] font-semibold text-scholar-400">Quick filter:</span>
              <button
                type="button"
                onClick={() => setStageFilter("")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-all ${
                  stageFilter === "" ? "bg-scholar-800 text-white border-scholar-800" : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
                }`}
              >
                All Stages <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${stageFilter === "" ? "bg-white/20 text-white" : "bg-scholar-100 text-scholar-700"}`}>{admissions.length}</span>
              </button>
              {STAGES.map((s) => {
                const count = stageCounts[s.value] || 0;
                const isSelected = stageFilter === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStageFilter(isSelected ? "" : s.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                      isSelected ? "bg-scholar-800 text-white border-scholar-800" : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
                    }`}
                  >
                    {s.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${isSelected ? "bg-white/20 text-white" : "bg-scholar-100 text-scholar-700"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* View Mode 1: Tabular List View — responsive: table on sm+, cards on mobile */}
        {viewMode === "table" && (
          <Card className="overflow-hidden">
            {/* Loading skeleton - shown when updating */}
            {updatingId ? (
              <LeadTableSkeleton rows={4} />
            ) : (
              <>
                <div className="hidden sm:block w-full overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="border-b border-scholar-100 bg-scholar-50/80 text-left uppercase tracking-wider text-scholar-500 font-semibold text-[11px]">
                      <tr>
                        <th className="px-3.5 py-3">Lead / Applicant</th>
                        <th className="px-3.5 py-3">Contact</th>
                        <th className="px-3.5 py-3">Course & Fee</th>
                        <th className="px-3.5 py-3">Priority</th>
                        <th className="px-3.5 py-3">Stage</th>
                        <th className="px-3.5 py-3">Follow-up</th>
                        <th className="px-3.5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-scholar-100/60">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-0">
                            {admissions.length === 0 ? (
                              <div className="p-6">
                                <EmptyState variant="no-leads" onAction={() => setDrawerOpen(true)} />
                              </div>
                            ) : (
                              <div className="p-6">
                                <EmptyState
                                  variant="no-results"
                                  onAction={handleResetFilters}
                                  actionLabel="Clear all filters"
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filtered.map((a) => {
                          return (
                            <tr key={a.id} className="hover:bg-scholar-50/50 transition-colors">
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-scholar-100 text-xs font-bold text-scholar-700">
                                    {initials(a.applicantName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-ink truncate max-w-[140px]">{a.applicantName}</p>
                                    <span className="rounded-full bg-scholar-100 px-2 py-0.5 text-[9px] font-bold text-scholar-600 uppercase">
                                      {a.source.replace("_", " ")}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-ink">{a.mobile}</span>
                                  <a href={`tel:${a.mobile}`} title="Tap to call this student" className="text-scholar-400 hover:text-scholar-800 p-0.5">
                                    <Phone size={12} />
                                  </a>
                                  <a
                                    href={`https://wa.me/91${a.mobile}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Open WhatsApp chat"
                                    className="text-emerald-600 hover:opacity-80 p-0.5"
                                  >
                                    <MessageSquare size={12} />
                                  </a>
                                </div>
                                {a.email && <p className="text-[10px] text-scholar-400 truncate max-w-[140px]">{a.email}</p>}
                              </td>

                              <td className="px-3.5 py-2.5">
                                <p className="font-semibold text-ink truncate max-w-[120px]">{a.course.name}</p>
                                <p className="text-[10px] text-scholar-500">
                                  {a.batch?.name ?? "No batch yet"} · {formatCurrency(a.feePlan)}
                                </p>
                              </td>

                              <td className="px-3.5 py-2.5">
                                <PriorityBadge priority={a.priority} />
                              </td>

                              <td className="px-3.5 py-2.5">
                                <StageBadge stage={a.stage} />
                              </td>

                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                <FollowUpBadge dateStr={a.nextFollowUpDate} />
                              </td>

                              <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <GuidedTooltip content="Record what you discussed on the call and set next follow-up date">
                                    <button
                                      type="button"
                                      onClick={() => setFollowUpTarget(a)}
                                      className="inline-flex items-center gap-1 rounded-xl bg-white border border-scholar-200 px-2.5 py-1.5 text-xs font-bold text-scholar-700 hover:bg-scholar-50 hover:border-scholar-300 shadow-sm"
                                    >
                                      <PhoneCall size={12} className="text-scholar-600" />
                                      <span>Log Call</span>
                                      {a.followUps?.length ? <span className="ml-1 rounded-full bg-scholar-100 px-1.5 py-0.5 text-[10px]">{a.followUps.length}</span> : null}
                                    </button>
                                  </GuidedTooltip>

                                  <GuidedTooltip content="Schedule a trial demo class for this lead">
                                    <button
                                      type="button"
                                      onClick={() => setDemoTarget(a)}
                                      aria-label="Schedule demo — book a trial class to show teaching quality"
                                      className="rounded-xl bg-amber-50 p-2 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                    >
                                      <Video size={13} />
                                    </button>
                                  </GuidedTooltip>

                                  {a.status !== "ENROLLED" && (
                                    <GuidedTooltip content="Convert this lead into an enrolled student — creates student record and fee plan">
                                      <button
                                        type="button"
                                        onClick={() => setConvertTarget(a)}
                                        aria-label="Convert to student — this will create a student record"
                                        className="rounded-xl bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                      >
                                        <GraduationCap size={13} />
                                      </button>
                                    </GuidedTooltip>
                                  )}

                                  {a.stage !== "LOST" && (
                                    <GuidedTooltip content="Mark as lost if student joined elsewhere or not interested — helps track reasons">
                                      <button
                                        type="button"
                                        onClick={() => setLostTarget(a)}
                                        aria-label="Mark as lost — record why this lead did not convert"
                                        className="rounded-xl bg-white p-2 text-rose-600 hover:bg-rose-50 border border-rose-200"
                                      >
                                        <AlertOctagon size={13} />
                                      </button>
                                    </GuidedTooltip>
                                  )}
                                </div>
                                <div className="mt-1.5">
                                  <select
                                    value={a.stage}
                                    disabled={updatingId === a.id}
                                    onChange={(e) => handleStageChange(a.id, e.target.value)}
                                    className="w-full rounded-lg border border-scholar-200 bg-scholar-50 px-2 py-1 text-[11px] font-semibold text-scholar-700 outline-none hover:border-scholar-300"
                                    aria-label="Change lead stage"
                                  >
                                    {STAGES.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Mobile card layout — shown only below sm */}
                <div className="sm:hidden space-y-3 p-3">
                  {filtered.length === 0 ? (
                    admissions.length === 0 ? (
                      <EmptyState variant="no-leads" onAction={() => setDrawerOpen(true)} />
                    ) : (
                      <EmptyState variant="no-results" onAction={handleResetFilters} actionLabel="Clear filters" />
                    )
                  ) : (
                    filtered.map((a) => {
                      return (
                        <div key={a.id} className="rounded-2xl border border-scholar-100 bg-white p-4 space-y-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-scholar-100 text-xs font-bold text-scholar-700">
                                {initials(a.applicantName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-ink truncate">{a.applicantName}</p>
                                <span className="rounded-full bg-scholar-100 px-2 py-0.5 text-[9px] font-bold text-scholar-600 uppercase">
                                  {a.source.replace("_", " ")}
                                </span>
                                <p className="text-[11px] text-scholar-500 flex items-center gap-1 mt-1">
                                  {a.mobile}
                                  <a href={`tel:${a.mobile}`} className="text-scholar-400 hover:text-scholar-800" aria-label="Call">
                                    <Phone size={11} />
                                  </a>
                                  <a href={`https://wa.me/91${a.mobile}`} target="_blank" rel="noreferrer" className="text-emerald-600" aria-label="WhatsApp">
                                    <MessageSquare size={11} />
                                  </a>
                                </p>
                                {a.email && <p className="text-[10px] text-scholar-400 truncate max-w-[160px]">{a.email}</p>}
                              </div>
                            </div>
                            <PriorityBadge priority={a.priority} />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <StageBadge stage={a.stage} />
                            <FollowUpBadge dateStr={a.nextFollowUpDate} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] rounded-xl bg-scholar-50/60 p-2.5 border border-scholar-100">
                            <div>
                              <p className="text-[10px] font-bold text-scholar-500 uppercase tracking-wider">Course & Fee</p>
                              <p className="font-bold text-ink truncate">{a.course.name}</p>
                              <p className="text-scholar-500">{a.batch?.name ?? "No batch yet"} · {formatCurrency(a.feePlan)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-scholar-500 uppercase tracking-wider">Next Action</p>
                              <select
                                value={a.stage}
                                disabled={updatingId === a.id}
                                onChange={(e) => handleStageChange(a.id, e.target.value)}
                                className="mt-1 w-full rounded-xl border border-scholar-200 bg-white px-2.5 py-2 text-xs font-semibold text-scholar-800 outline-none"
                              >
                                {STAGES.map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setFollowUpTarget(a)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-scholar-800 px-3 py-2.5 text-xs font-bold text-white"
                            >
                              <PhoneCall size={13} />
                              Log Call
                              {a.followUps?.length ? ` (${a.followUps.length})` : ""}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDemoTarget(a)}
                              className="rounded-xl bg-amber-50 p-2.5 text-amber-700 border border-amber-200"
                              aria-label="Schedule demo"
                            >
                              <Video size={14} />
                            </button>
                            {a.status !== "ENROLLED" && (
                              <button
                                type="button"
                                onClick={() => setConvertTarget(a)}
                                className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 border border-emerald-200"
                                aria-label="Convert to student"
                              >
                                <GraduationCap size={14} />
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setLostTarget(a)}
                            className="w-full rounded-xl border border-rose-100 bg-white py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Mark as Lost — why not joined?
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-scholar-100 bg-scholar-50/40 px-4 py-3 text-xs text-scholar-600 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing <strong>{filtered.length}</strong> of <strong>{admissions.length}</strong> leads
                    {activeSection !== "all" && (
                      <span className="ml-1 rounded-full bg-scholar-800 px-2 py-0.5 text-[10px] font-bold text-white">
                        {activeSection === "new" ? "New" : activeSection === "followups" ? "Follow-ups Due" : activeSection === "converted" ? "Admitted" : "All"}
                      </span>
                    )}
                  </span>
                  {todayDueCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                      <Calendar size={12} /> {todayDueCount} follow-up{todayDueCount > 1 ? "s" : ""} due today <ArrowRight size={12} />
                    </span>
                  )}
                </div>
              </>
            )}
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
        onSuccess={() => {
          showLeadToast("Follow-up saved! Next step updated.", "success");
          router.refresh();
        }}
      />

      {/* Drawer: Schedule & Track Demo */}
      <ScheduleDemoDrawer
        lead={demoTarget}
        open={!!demoTarget}
        onClose={() => setDemoTarget(null)}
        onSuccess={() => {
          showLeadToast("Demo details saved.", "success");
          router.refresh();
        }}
        batches={batches}
      />

      {/* Modal: Mark Lead as Lost */}
      <MarkLostLeadModal
        lead={lostTarget}
        open={!!lostTarget}
        onClose={() => setLostTarget(null)}
        onSuccess={() => {
          showLeadToast("Lead marked as Lost. Reason saved for reports.", "info");
          router.refresh();
        }}
      />

      {/* Modal: 1-Click Convert to Student */}
      <ConvertLeadModal
        lead={convertTarget}
        open={!!convertTarget}
        onClose={() => setConvertTarget(null)}
        onSuccess={() => {
          showLeadToast("Great! Student enrolled and fee record created.", "success");
          router.refresh();
        }}
        courses={courses}
        batches={batches}
      />

      {/* Drawer: Automated Lead Follow-up Reminders */}
      <LeadRemindersDrawer
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        onDispatched={() => {
          showLeadToast("Reminders sent to counsellors via WhatsApp & Email!", "success");
          router.refresh();
        }}
      />
    </>
  );
}
