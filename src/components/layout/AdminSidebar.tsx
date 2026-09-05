"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, ScrollText, GitBranch, Ticket, Settings, X } from "lucide-react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tickets", label: "Support Tickets", icon: Ticket },
  { href: "/admin/branches", label: "Branch Requests", icon: GitBranch },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Account Settings", icon: Settings },
];

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#0f172a", color: "#f1f5f9" }}>
      <Box sx={{ display: "flex", height: 64, alignItems: "center", justifyContent: "space-between", px: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              display: "flex",
              height: 36,
              width: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 1.5,
              bgcolor: "#fbbf24",
              color: "#1e293b",
            }}
          >
            <ShieldCheck size={20} strokeWidth={2.5} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "inherit", fontSize: "1rem", fontWeight: 600, lineHeight: 1, color: "white" }}>
              Vidyalaya
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "#cbd5e1" }}>Platform Admin</Typography>
          </Box>
        </Box>
        <Box
          component="button"
          onClick={onClose}
          sx={{ display: { lg: "none" }, color: "#cbd5e1", bgcolor: "transparent", border: "none", cursor: "pointer", p: 0.5 }}
          aria-label="Close menu"
        >
          <X size={20} />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 2 }}>
        <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname?.startsWith(href + "/"));
            return (
              <ListItem key={href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={href}
                  onClick={onClose}
                  selected={active}
                  sx={{
                    borderRadius: 2,
                    px: 1.5,
                    py: 1.25,
                    gap: 1.5,
                    bgcolor: active ? "rgba(255,255,255,0.1)" : "transparent",
                    color: active ? "white" : "#cbd5e1",
                    fontWeight: active ? 500 : 400,
                    fontSize: "0.875rem",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.05)", color: "white" },
                    "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, color: active ? "#fbbf24" : "#cbd5e1" }}>
                    <Icon size={18} strokeWidth={2} />
                  </ListItemIcon>
                  <ListItemText primary={label} slotProps={{ primary: { sx: { fontSize: "0.875rem", fontWeight: active ? 600 : 500 } } }} />
                  {active && <Box sx={{ ml: "auto", height: 6, width: 6, borderRadius: "50%", bgcolor: "#fbbf24" }} />}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", px: 2.5, py: 2, textAlign: "left" }}>
        <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>Platform Admin v1.0</Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { width: 256, boxSizing: "border-box", bgcolor: "#0f172a", border: "none" } }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", lg: "block" },
          width: 256,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 256,
            boxSizing: "border-box",
            bgcolor: "#0f172a",
            border: "none",
            height: "100vh",
            overflow: "hidden",
            position: "fixed",
            top: 0,
            left: 0,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

