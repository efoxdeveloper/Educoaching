"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import { AdminSidebar } from "./AdminSidebar";
import { Topbar } from "./Topbar";

export function AdminShell({
  title,
  userName,
  children,
}: {
  title: string;
  userName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", bgcolor: "background.paper" }}>
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", minWidth: 0 }}>
        <Topbar onMenuClick={() => setOpen(true)} title={title} userName={userName} showSearch={false} />
        <Box component="main" sx={{ flex: 1, overflowY: "auto", px: { xs: 2, lg: 4 }, py: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

