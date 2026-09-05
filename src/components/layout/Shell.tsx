"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import { Sidebar } from "./Sidebar";
import { StudentSidebar } from "./StudentSidebar";
import { ParentSidebar } from "./ParentSidebar";
import { Topbar } from "./Topbar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { BranchImpersonationBanner } from "./BranchImpersonationBanner";

export function Shell({
  title,
  userName,
  children,
}: {
  title: string;
  userName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const role = String((session?.user as { role?: string })?.role || "").toUpperCase();

  const renderSidebar = () => {
    if (role === "STUDENT") return <StudentSidebar open={open} onClose={() => setOpen(false)} />;
    if (role === "PARENT") return <ParentSidebar open={open} onClose={() => setOpen(false)} />;
    return <Sidebar open={open} onClose={() => setOpen(false)} />;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", bgcolor: "background.paper", width: "100%", maxWidth: "100%" }}>
      <ImpersonationBanner />
      <BranchImpersonationBanner />
      <Box sx={{ display: "flex", flex: 1, height: "100vh", overflow: "hidden", width: "100%", minWidth: 0 }}>
        {renderSidebar()}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden", width: "100%" }}>
          <Topbar onMenuClick={() => setOpen(true)} title={title} userName={userName} />
          <Box component="main" sx={{ flex: 1, overflowY: "auto", minWidth: 0, width: "100%", px: { xs: 2, lg: 4 }, py: 3 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

