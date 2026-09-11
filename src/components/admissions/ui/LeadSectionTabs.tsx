"use client";

/**
 * 21st.dev-inspired Section Tabs
 * Registry: https://21st.dev/r/tabs — shadcn/ui Tabs polished variant
 * Used only in Lead CRM & Admissions for clear sectioning:
 * New Leads / Follow-ups Due / Converted / All Leads
 */
import { cn } from "@/lib/utils";

export type LeadSection = "new" | "followups" | "converted" | "all";

interface LeadSectionTabsProps {
  active: LeadSection;
  onChange: (v: LeadSection) => void;
  counts: { new: number; followups: number; converted: number; all: number };
}

const tabs: { id: LeadSection; label: string; hint: string }[] = [
  { id: "new", label: "New Leads", hint: "Recently received inquiries" },
  { id: "followups", label: "Follow-ups Due", hint: "Due today or overdue" },
  { id: "converted", label: "Admitted", hint: "Students who have enrolled" },
  { id: "all", label: "All Leads", hint: "All inquiries in one place" },
];

export function LeadSectionTabs({ active, onChange, counts }: LeadSectionTabsProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <div
        role="tablist"
        aria-label="Lead sections"
        className="inline-flex min-w-full items-center gap-1 rounded-2xl border border-scholar-100 bg-white p-1.5 shadow-sm"
      >
        {tabs.map((t) => {
          const isActive = active === t.id;
          const count =
            t.id === "new" ? counts.new : t.id === "followups" ? counts.followups : t.id === "converted" ? counts.converted : counts.all;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={cn(
                "group flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all sm:px-4",
                isActive
                  ? "bg-scholar-800 text-white shadow-sm"
                  : "text-scholar-600 hover:bg-scholar-50 hover:text-scholar-800"
              )}
            >
              <span className="flex flex-col items-start text-left leading-none">
                <span className={cn("text-xs font-bold", isActive ? "text-white" : "text-ink")}>{t.label}</span>
                <span className={cn("mt-0.5 text-[10px] font-medium", isActive ? "text-white/70" : "text-scholar-400")}>
                  {t.hint}
                </span>
              </span>
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[11px] font-black",
                  isActive ? "bg-white/20 text-white" : "bg-scholar-100 text-scholar-700 group-hover:bg-scholar-200"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
