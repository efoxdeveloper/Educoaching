"use client";

import DrawerMUI from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  // Map Tailwind max-w-* to pixel widths for MUI Drawer Paper
  const widthMap: Record<string, number> = {
    "max-w-sm": 380,
    "max-w-md": 448,
    "max-w-lg": 512,
    "max-w-xl": 576,
    "max-w-2xl": 672,
  };
  const paperWidth = widthMap[maxWidth] || 448;

  return (
    <DrawerMUI
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { sx: { bgcolor: "rgba(13,26,42,0.4)" } },
      }}
      sx={{
        zIndex: 50,
        "& .MuiDrawer-paper": {
          width: "100%",
          maxWidth: paperWidth,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          boxShadow: "0 8px 30px rgba(13,26,42,0.12)",
          borderLeft: "1px solid #D6E0EB",
          boxSizing: "border-box",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", px: 3, py: 2 }}>
        <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontSize: "1.125rem", fontWeight: 600, color: "text.primary" }}>
          {title}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ color: "text.secondary", "&:hover": { color: "text.primary", bgcolor: "rgba(0,0,0,0.04)" } }}>
          <X size={20} />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5 }}>{children}</Box>
    </DrawerMUI>
  );
}
