"use client";

import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import { cn } from "@/lib/utils";

const toneMap: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  success: { bg: "#E9F7EF", color: "#1F9D66", border: "rgba(31,157,102,0.2)", dot: "#1F9D66" },
  danger: { bg: "#FCEBEA", color: "#D64545", border: "rgba(214,69,69,0.2)", dot: "#D64545" },
  warn: { bg: "#FFF6E5", color: "#DB9A1F", border: "rgba(219,154,31,0.2)", dot: "#DB9A1F" },
  neutral: { bg: "#EEF2F7", color: "#4E6E93", border: "rgba(78,110,147,0.15)", dot: "#4E6E93" },
  marigold: { bg: "#FDF4E6", color: "#D68F26", border: "rgba(214,143,38,0.2)", dot: "#D68F26" },
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneMap;
  dot?: boolean;
  className?: string;
}) {
  const t = toneMap[tone] || toneMap.neutral;
  return (
    <Chip
      label={
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
          {dot && <Box sx={{ height: 6, width: 6, borderRadius: "50%", bgcolor: t.dot, flexShrink: 0 }} />}
          {children}
        </Box>
      }
      size="small"
      variant="outlined"
      className={cn(className)}
      sx={{
        bgcolor: t.bg,
        color: t.color,
        borderColor: t.border,
        fontWeight: 500,
        fontSize: "0.75rem",
        height: 24,
        borderRadius: "9999px",
        px: 0.5,
        "& .MuiChip-label": { px: 1, display: "flex", alignItems: "center" },
      }}
    />
  );
}

export function feeStatusTone(status: string): keyof typeof toneMap {
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

export function studentStatusTone(status: string): keyof typeof toneMap {
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

export function admissionStatusTone(status: string): keyof typeof toneMap {
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
