"use client";

/**
 * 21st.dev-inspired Status Badges — polished, color-coded, dot + icon variant
 * Registry style: https://21st.dev/r/badge — shadcn Badge with 21st polish
 * Only used in Admissions; does NOT modify src/components/ui/Badge.tsx
 */
import { Flame, Zap, Snowflake, CheckCircle2, Phone, Clock3, Video, GraduationCap, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StageTone = "NEW" | "CONTACTED" | "DEMO_SCHEDULED" | "COUNSELLING" | "ENROLLED" | "LOST";
type PriorityTone = "HOT" | "WARM" | "COLD";

const stageConfig: Record<StageTone, { label: string; bg: string; text: string; border: string; dot: string; icon: React.ElementType }> = {
  NEW: { label: "New", bg: "bg-scholar-50", text: "text-scholar-800", border: "border-scholar-200", dot: "bg-scholar-500", icon: Clock3 },
  CONTACTED: { label: "Contacted", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-600", icon: Phone },
  DEMO_SCHEDULED: { label: "Demo Scheduled", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500", icon: Video },
  COUNSELLING: { label: "Counselling", bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", dot: "bg-violet-600", icon: Phone },
  ENROLLED: { label: "Admitted", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-600", icon: GraduationCap },
  LOST: { label: "Lost", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500", icon: XCircle },
};

const priorityConfig: Record<PriorityTone, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  HOT: { label: "Hot — High Interest", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: Flame },
  WARM: { label: "Warm — Follow-up", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: Zap },
  COLD: { label: "Cold — Just Browsing", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", icon: Snowflake },
};

export function StageBadge({ stage, size = "sm" }: { stage: string; size?: "sm" | "md" }) {
  const cfg = stageConfig[stage as StageTone] || stageConfig.NEW;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold",
        cfg.bg,
        cfg.text,
        cfg.border,
        size === "sm" ? "text-[11px]" : "text-xs"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} aria-hidden />
      <Icon size={12} className="shrink-0" />
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityConfig[priority as PriorityTone] || priorityConfig.COLD;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold", cfg.bg, cfg.text, cfg.border)}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export function FollowUpBadge({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span className="text-[11px] text-scholar-400">No follow-up set — tap “Log Call” to schedule</span>;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  const isOverdue = d < today && !isToday;
  if (isOverdue)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
        <Clock3 size={12} /> Overdue — {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
      </span>
    );
  if (isToday)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
        <Clock3 size={12} /> Today — {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-scholar-200 bg-scholar-50 px-2.5 py-1 text-[11px] font-semibold text-scholar-700">
      <Clock3 size={12} /> {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
    </span>
  );
}

// Keep simple success badge for enrolled
export function EnrolledBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
      <CheckCircle2 size={12} /> Enrolled
    </span>
  );
}
