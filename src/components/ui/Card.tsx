"use client";

import MuiCard from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

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

// Wrapper that preserves original Tailwind padding behavior: if caller passes p-5 etc via className,
// we let that class handle padding on the inner Box. Otherwise, default to no extra.
// To keep exact visual, we render children directly inside MuiCard and rely on className for padding.
// The above Box is just a passthrough; actual padding comes from className on MuiCard.

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
          <Icon size={20} strokeWidth={2} />
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
