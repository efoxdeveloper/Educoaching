import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-scholar-100 bg-white shadow-card", className)}>
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendTone = "success",
  accent = "scholar",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendTone?: "success" | "danger" | "neutral";
  accent?: "scholar" | "marigold";
}) {
  const trendColor =
    trendTone === "success" ? "text-success-600" : trendTone === "danger" ? "text-danger-600" : "text-scholar-400";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-scholar-400">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accent === "scholar" ? "bg-scholar-50 text-scholar-600" : "bg-marigold-50 text-marigold-600"
          )}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
      {trend && <p className={cn("mt-3 text-xs font-medium", trendColor)}>{trend}</p>}
    </Card>
  );
}
