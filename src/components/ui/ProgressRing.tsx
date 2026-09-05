"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = "#1E3A5F",
  trackColor = "#EEF2F7",
  label,
  className,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  // MUI CircularProgress thickness is relative; convert stroke to thickness prop
  // thickness 3.6 is default for 40px; scale proportionally
  const thickness = (stroke / size) * 40;

  return (
    <Box
      className={cn("relative inline-flex items-center justify-center", className)}
      sx={{ width: size, height: size, position: "relative", display: "inline-flex" }}
    >
      {/* Track */}
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={thickness}
        sx={{ color: trackColor, position: "absolute", left: 0, top: 0 }}
      />
      {/* Progress */}
      <CircularProgress
        variant="determinate"
        value={clamped}
        size={size}
        thickness={thickness}
        sx={{
          color: color,
          position: "absolute",
          left: 0,
          top: 0,
          "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
        }}
      />
      <Typography
        variant="body2"
        sx={{
          position: "absolute",
          fontFamily: "var(--font-sora)",
          fontWeight: 600,
          fontSize: size * 0.24,
          color: "text.primary",
          lineHeight: 1,
        }}
        className="tabular-nums"
      >
        {label ?? `${Math.round(clamped)}%`}
      </Typography>
    </Box>
  );
}
