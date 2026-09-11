"use client";

/**
 * 21st.dev-inspired Empty State — friendly, plain-language, clear CTA
 * Registry: https://21st.dev/r/empty-state
 */
import { Inbox, Plus, SearchX, CalendarCheck, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "no-leads" | "no-results" | "no-followups" | "no-converted";

interface EmptyStateProps {
  variant?: Variant;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const config: Record<Variant, { icon: React.ElementType; title: string; desc: string; cta: string }> = {
  "no-leads": {
    icon: Inbox,
    title: "No leads yet — let's add your first one!",
    desc: "When someone enquires about your courses (walk-in, website, or phone call), add them here. You can track calls, demo and admission step-by-step.",
    cta: "Add your first lead",
  },
  "no-results": {
    icon: SearchX,
    title: "No leads match your search",
    desc: "Try clearing filters or searching with a different name or phone number. Your leads are still there — just hidden by filters.",
    cta: "Clear all filters",
  },
  "no-followups": {
    icon: CalendarCheck,
    title: "All follow-ups are up to date!",
    desc: "No calls due today. Great job! New follow-ups will appear here when you schedule them after a counselling call.",
    cta: "View all leads",
  },
  "no-converted": {
    icon: GraduationCap,
    title: "No admissions yet",
    desc: "When you convert a lead to a student, they will appear here. Tap “Convert to Student” on any lead to enroll them.",
    cta: "Go to New Leads",
  },
};

export function EmptyState({ variant = "no-leads", onAction, actionLabel, className }: EmptyStateProps) {
  const c = config[variant];
  const Icon = c.icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-scholar-200 bg-scholar-50/40 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-scholar-200 bg-white shadow-sm">
        <Icon size={24} className="text-scholar-500" />
      </div>
      <h3 className="font-display text-sm font-bold text-ink">{c.title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-scholar-500">{c.desc}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-scholar-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-scholar-700"
        >
          <Plus size={14} />
          {actionLabel || c.cta}
        </button>
      )}
    </div>
  );
}
