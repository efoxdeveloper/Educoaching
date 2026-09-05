"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography
        component="label"
        variant="body2"
        sx={{ fontSize: "0.875rem", fontWeight: 500, color: "text.primary", lineHeight: 1.4 }}
      >
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

export const inputClass =
  "w-full rounded-xl border border-scholar-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-scholar-400";
