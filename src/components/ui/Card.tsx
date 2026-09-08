// @ts-nocheck - per-icon ESM deep imports have no .d.ts but are valid code-split entry
"use client";

import { lazy, Suspense } from "react";
import MuiCard from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import { cn } from "@/lib/utils";

export type IconName =
  | "Users"
  | "Wallet"
  | "IndianRupee"
  | "TrendingUp"
  | "TrendingDown"
  | "Building2"
  | "Clock3"
  | "ShieldCheck"
  | "Ban"
  | "Receipt"
  | "UserCheck"
  | "CreditCard"
  | "Banknote"
  | "Layers"
  | "Clock"
  | "CheckCircle2"
  | "AlertTriangle"
  | "RefreshCw"
  | "MessageSquare"
  | "Mail"
  | "Smartphone"
  | "Megaphone"
  | "PieChart"
  | "ClipboardList"
  | "CalendarCheck"
  | "XCircle"
  | "Award"
  | "GraduationCap"
  | "AlertCircle"
  | "Percent";

// Per-icon lazy imports — each icon is its own async chunk, so a page that uses
// e.g. 6 KpiCard icons only loads those 6 chunks, not all 31. This avoids the
// previous eager barrel import that bundled all 31 icons into every KpiCard consumer.
// File paths are lucide's code-split ESM entries; alias cases use the real file name
// (e.g. alert-triangle -> triangle-alert.mjs, pie-chart -> chart-pie.mjs).
const LAZY_ICONS: Record<IconName, React.LazyExoticComponent<React.ComponentType<{ size?: number; strokeWidth?: number }>>> = {
  Users: lazy(() => import("lucide-react/dist/esm/icons/users.mjs")),
  Wallet: lazy(() => import("lucide-react/dist/esm/icons/wallet.mjs")),
  IndianRupee: lazy(() => import("lucide-react/dist/esm/icons/indian-rupee.mjs")),
  TrendingUp: lazy(() => import("lucide-react/dist/esm/icons/trending-up.mjs")),
  TrendingDown: lazy(() => import("lucide-react/dist/esm/icons/trending-down.mjs")),
  Building2: lazy(() => import("lucide-react/dist/esm/icons/building-2.mjs")),
  Clock3: lazy(() => import("lucide-react/dist/esm/icons/clock-3.mjs")),
  ShieldCheck: lazy(() => import("lucide-react/dist/esm/icons/shield-check.mjs")),
  Ban: lazy(() => import("lucide-react/dist/esm/icons/ban.mjs")),
  Receipt: lazy(() => import("lucide-react/dist/esm/icons/receipt.mjs")),
  UserCheck: lazy(() => import("lucide-react/dist/esm/icons/user-check.mjs")),
  CreditCard: lazy(() => import("lucide-react/dist/esm/icons/credit-card.mjs")),
  Banknote: lazy(() => import("lucide-react/dist/esm/icons/banknote.mjs")),
  Layers: lazy(() => import("lucide-react/dist/esm/icons/layers.mjs")),
  Clock: lazy(() => import("lucide-react/dist/esm/icons/clock.mjs")),
  // alias: check-circle-2 is circle-check.mjs
  CheckCircle2: lazy(() => import("lucide-react/dist/esm/icons/circle-check.mjs")),
  // alias: alert-triangle is triangle-alert.mjs
  AlertTriangle: lazy(() => import("lucide-react/dist/esm/icons/triangle-alert.mjs")),
  RefreshCw: lazy(() => import("lucide-react/dist/esm/icons/refresh-cw.mjs")),
  MessageSquare: lazy(() => import("lucide-react/dist/esm/icons/message-square.mjs")),
  Mail: lazy(() => import("lucide-react/dist/esm/icons/mail.mjs")),
  Smartphone: lazy(() => import("lucide-react/dist/esm/icons/smartphone.mjs")),
  Megaphone: lazy(() => import("lucide-react/dist/esm/icons/megaphone.mjs")),
  // alias: pie-chart is chart-pie.mjs
  PieChart: lazy(() => import("lucide-react/dist/esm/icons/chart-pie.mjs")),
  ClipboardList: lazy(() => import("lucide-react/dist/esm/icons/clipboard-list.mjs")),
  CalendarCheck: lazy(() => import("lucide-react/dist/esm/icons/calendar-check.mjs")),
  // alias: x-circle is circle-x.mjs
  XCircle: lazy(() => import("lucide-react/dist/esm/icons/circle-x.mjs")),
  Award: lazy(() => import("lucide-react/dist/esm/icons/award.mjs")),
  GraduationCap: lazy(() => import("lucide-react/dist/esm/icons/graduation-cap.mjs")),
  // alias: alert-circle is circle-alert.mjs
  AlertCircle: lazy(() => import("lucide-react/dist/esm/icons/circle-alert.mjs")),
  Percent: lazy(() => import("lucide-react/dist/esm/icons/percent.mjs")),
};

function KpiIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  const LazyIcon = LAZY_ICONS[name] ?? LAZY_ICONS.Users;
  return (
    <Suspense fallback={<Box sx={{ width: size, height: size }} />}>
      <LazyIcon size={size} strokeWidth={2} />
    </Suspense>
  );
}

export function Card({ children, className, sx }: { children: React.ReactNode; className?: string; sx?: any }) {
  return (
    <MuiCard
      variant="outlined"
      className={cn("bg-white", className)}
      sx={{
        borderColor: "#D6E0EB",
        borderRadius: "18px",
        boxShadow: "0 1px 2px rgba(13,26,42,0.04), 0 1px 8px rgba(13,26,42,0.06)",
        bgcolor: "background.paper",
        overflow: "hidden",
        ...sx,
      }}
    >
      {children}
    </MuiCard>
  );
}

export function KpiCard({
  label,
  value,
  iconName,
  trend,
  trendTone = "success",
  accent = "scholar",
}: {
  label: string;
  value: string;
  iconName: IconName;
  trend?: string;
  trendTone?: "success" | "danger" | "neutral";
  accent?: "scholar" | "marigold";
}) {
  const trendColor =
    trendTone === "success" ? "success.main" : trendTone === "danger" ? "error.main" : "text.secondary";
  const avatarBg = accent === "scholar" ? "#EEF2F7" : "#FDF4E6";
  const avatarColor = accent === "scholar" ? "#1E3A5F" : "#B3741C";
  return (
    <MuiCard
      variant="outlined"
      sx={{
        p: 2.5,
        borderColor: "scholar.100",
        borderRadius: "18px",
        boxShadow: "0 1px 2px rgba(13,26,42,0.04), 0 1px 8px rgba(13,26,42,0.06)",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="body2" sx={{ fontSize: "0.875rem", fontWeight: 500, color: "text.secondary" }}>
            {label}
          </Typography>
          <Typography
            variant="h6"
            sx={{ mt: 1, fontFamily: "var(--font-sora)", fontSize: "1.5rem", fontWeight: 600, color: "text.primary" }}
            className="tabular-nums"
          >
            {value}
          </Typography>
        </Box>
        <Avatar
          variant="rounded"
          sx={{
            width: 40,
            height: 40,
            borderRadius: "12px",
            bgcolor: avatarBg as any,
            color: avatarColor as any,
          }}
        >
          <KpiIcon name={iconName} size={20} />
        </Avatar>
      </Box>
      {trend && (
        <Typography variant="caption" sx={{ mt: 1.5, display: "block", fontSize: "0.75rem", fontWeight: 500, color: trendColor }}>
          {trend}
        </Typography>
      )}
    </MuiCard>
  );
}
