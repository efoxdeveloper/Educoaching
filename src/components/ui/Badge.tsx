import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  success: "bg-success-50 text-success-600 border-success-500/20",
  danger: "bg-danger-50 text-danger-600 border-danger-500/20",
  warn: "bg-warn-50 text-warn-500 border-warn-500/20",
  neutral: "bg-scholar-50 text-scholar-600 border-scholar-500/15",
  marigold: "bg-marigold-50 text-marigold-600 border-marigold-500/20",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof styles;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        styles[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", tone === "success" ? "bg-success-500" : tone === "danger" ? "bg-danger-500" : tone === "warn" ? "bg-warn-500" : "bg-scholar-500")} />}
      {children}
    </span>
  );
}

export function feeStatusTone(status: string): keyof typeof styles {
  switch (status) {
    case "PAID":
      return "success";
    case "PARTIAL":
      return "warn";
    case "OVERDUE":
      return "danger";
    default:
      return "neutral";
  }
}

export function studentStatusTone(status: string): keyof typeof styles {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "ON_HOLD":
      return "warn";
    case "INACTIVE":
      return "danger";
    default:
      return "neutral";
  }
}

export function admissionStatusTone(status: string): keyof typeof styles {
  switch (status) {
    case "ENROLLED":
      return "success";
    case "APPROVED":
      return "marigold";
    case "REJECTED":
      return "danger";
    case "PENDING":
    default:
      return "neutral";
  }
}
