"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  HeartHandshake,
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

const parentNav: NavItem[] = [
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

export function ParentSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [children, setChildren] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("parentSelectedChildId") : null;
    if (stored) setSelectedChildId(stored);
  }, []);

  const handleChildSwitch = (childId: string) => {
    setSelectedChildId(childId);
    if (typeof window !== "undefined") {
      localStorage.setItem("parentSelectedChildId", childId);
      window.dispatchEvent(new CustomEvent("parentChildSwitch", { detail: childId }));
      const url = new URL(window.location.href);
      url.searchParams.set("child", childId);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#334155", color: "#f1f5f9" }}>
      <Box sx={{ display: "flex", height: 64, alignItems: "center", justifyContent: "space-between", px: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ display: "flex", height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 1.5, bgcolor: "#fbbf24", color: "#422006" }}>
            <HeartHandshake size={20} strokeWidth={2.5} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "inherit", fontSize: "1rem", fontWeight: 600, lineHeight: 1, color: "white" }}>Parent Portal</Typography>
            <Typography sx={{ fontSize: "11px", color: "#cbd5e1" }}>Family Learning Hub</Typography>
          </Box>
        </Box>
        <Box component="button" onClick={onClose} sx={{ display: { lg: "none" }, color: "#cbd5e1", bgcolor: "transparent", border: "none", cursor: "pointer", p: 0.5 }} aria-label="Close menu">
          <X size={20} />
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>Viewing Child</Typography>
        <Box sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.1)", px: 1.5, py: 1.25 }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box component="span">{(session?.user as any)?.name || "Parent Account"}</Box>
            <Box component="span" sx={{ fontSize: "11px", color: "#fbbf24" }}>Switch in portal →</Box>
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "#cbd5e1", mt: 0.5 }}>
            Use the child switcher at the top of the portal content to change which child’s batch, fees, and homework you’re viewing. All 9 sections below follow that selection.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 2 }}>
        <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {parentNav.map((item) => {
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
                  {item.label === "AI Doubt Assistant" && <Typography sx={{ ml: "auto", fontSize: "10px", opacity: 0.7 }}>for parents</Typography>}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 1.5, textAlign: "center" }}>
        <Typography sx={{ fontSize: "11px", color: "#cbd5e1" }}>
          Parent Portal • <Box component="span" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase" }}>v1.0</Box>
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

