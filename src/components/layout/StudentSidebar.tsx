"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Layers,
  Video,
  Award,
  ClipboardCheck,
  BookOpen,
  PencilLine,
  Wallet,
  Sparkles,
  LifeBuoy,
  GraduationCap,
  X,
  type LucideIcon,
} from "lucide-react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const studentNav: NavItem[] = [
  { href: "/portal?tab=batch", label: "My Allocated Batch", icon: Layers },
  { href: "/portal?tab=live-classes", label: "Live Lectures", icon: Video },
  { href: "/portal?tab=certificates", label: "My Certificates", icon: Award },
  { href: "/portal?tab=exams", label: "Online CBT Exams", icon: ClipboardCheck },
  { href: "/portal?tab=materials", label: "Study Material & LMS", icon: BookOpen },
  { href: "/portal?tab=assignments", label: "Homework & DPP", icon: PencilLine },
  { href: "/portal?tab=fees", label: "Fee Ledger & Pay Online", icon: Wallet },
  { href: "/portal?tab=doubts", label: "AI Doubt Assistant", icon: Sparkles },
  { href: "/portal?tab=help", label: "Help & Support", icon: LifeBuoy },
];

export function StudentSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "batch";

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#334155", color: "#f1f5f9" }}>
      <Box sx={{ display: "flex", height: 64, alignItems: "center", justifyContent: "space-between", px: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ display: "flex", height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 1.5, bgcolor: "#fbbf24", color: "#422006" }}>
            <GraduationCap size={20} strokeWidth={2.5} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "inherit", fontSize: "1rem", fontWeight: 600, lineHeight: 1, color: "white" }}>Student Portal</Typography>
            <Typography sx={{ fontSize: "11px", color: "#cbd5e1" }}>My Learning Space</Typography>
          </Box>
        </Box>
        <Box component="button" onClick={onClose} sx={{ display: { lg: "none" }, color: "#cbd5e1", bgcolor: "transparent", border: "none", cursor: "pointer", p: 0.5 }} aria-label="Close menu">
          <X size={20} />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 2 }}>
        <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {studentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === "/portal" && (searchParams.get("tab") || "batch") === item.href.split("tab=")[1];
            return (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={onClose}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    px: 1.5,
                    py: 1.25,
                    gap: 1.5,
                    bgcolor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                    color: isActive ? "white" : "#f1f5f9",
                    fontWeight: isActive ? 700 : 600,
                    fontSize: "0.75rem",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.05)", color: "white" },
                    "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, color: isActive ? "#fbbf24" : "#e2e8f0" }}>
                    <Icon size={16} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: "0.75rem", fontWeight: isActive ? 700 : 600 } } }} />
                  {item.label === "AI Doubt Assistant" && <Typography sx={{ ml: "auto", fontSize: "10px" }}>✨</Typography>}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 1.5, textAlign: "center" }}>
        <Typography sx={{ fontSize: "11px", color: "#cbd5e1" }}>
          Student Portal • <Box component="span" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase" }}>v1.0</Box>
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer variant="temporary" open={open} onClose={onClose} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { width: 256, boxSizing: "border-box", bgcolor: "#334155", border: "none" } }}>
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", lg: "block" },
          width: 256,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: 256, boxSizing: "border-box", bgcolor: "#334155", border: "none", height: "100vh", overflow: "hidden", position: "fixed", top: 0, left: 0 },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

