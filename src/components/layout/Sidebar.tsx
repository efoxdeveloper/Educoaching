"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck,
  CalendarClock,
  Wallet,
  GraduationCap,
  UserCog,
  Settings,
  BookOpen,
  ClipboardList,
  Library,
  Award,
  BarChart3,
  Receipt,
  TrendingUp,
  Megaphone,
  FileText,
  CheckSquare,
  Building2,
  CreditCard,
  Video,
  HelpCircle,
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
import Divider from "@mui/material/Divider";
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from "@/lib/institute-settings";
import { hasPermission, type Permission } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  featureKey?: keyof FeatureFlags;
  permission?: Permission;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users, permission: "students:write" },
  { href: "/admissions", label: "Lead CRM", icon: ClipboardList, featureKey: "admissions", permission: "admissions:read" },
  { href: "/courses", label: "Courses", icon: Library, permission: "courses:write" },
  { href: "/batches", label: "Batches", icon: Layers, permission: "batches:write" },
  { href: "/timetable", label: "Timetable", icon: CalendarClock, featureKey: "timetable", permission: "timetable:write" },
  { href: "/subjects", label: "Subjects", icon: BookOpen, permission: "subjects:read" },
  { href: "/faculty", label: "Staff & Faculty", icon: UserCog, permission: "staff:manage" },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, featureKey: "attendance", permission: "attendance:write" },
  { href: "/tests", label: "Tests & CBT", icon: Award, featureKey: "onlineTests", permission: "tests:write" },
  { href: "/live-classes", label: "Live Classes", icon: Video, permission: "live-classes:write" },
  { href: "/certificates", label: "Certificates", icon: Award, permission: "certificates:write" },
  { href: "/study-material", label: "Study Material", icon: FileText, permission: "studyMaterials:write" },
  { href: "/assignments", label: "Assignments & DPP", icon: CheckSquare, permission: "assignments:write" },
  { href: "/portal", label: "Student Portal", icon: GraduationCap },
  { href: "/fees", label: "Fees & Collection", icon: Wallet, permission: "payments:write" },
  { href: "/expenses", label: "Expenses", icon: Receipt, featureKey: "expenses", permission: "expenses:write" },
  { href: "/income", label: "Extra Income", icon: TrendingUp, featureKey: "expenses", permission: "income:write" },
  { href: "/communication", label: "Broadcast", icon: Megaphone, featureKey: "communication", permission: "communication:write" },
  { href: "/reports", label: "Reports", icon: BarChart3, featureKey: "reports", permission: "payments:write" },
  { href: "/branches", label: "Branches", icon: Building2, permission: "branches:write" },
  { href: "/plans", label: "My Plans & Subscription", icon: CreditCard, permission: "billing:manage" },
  { href: "/settings", label: "Institute Setup", icon: Settings, permission: "institute:manage" },
  { href: "/support", label: "Help & Support", icon: HelpCircle },
];

// Strict Role-Based View Matrix: Staff only see their field, not the owner's full dashboard!
const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
  OWNER: ["*"], // Full system access
  ADMIN: ["*"], // Full operational access
  STAFF: [
    "/dashboard",
    "/students",
    "/batches",
    "/timetable",
    "/subjects",
    "/attendance",
    "/tests",
    "/live-classes",
    "/certificates",
    "/study-material",
    "/assignments",
    "/portal",
    "/communication",
    "/support",
  ],
  FACULTY: [
    "/dashboard",
    "/batches",
    "/timetable",
    "/subjects",
    "/attendance",
    "/tests",
    "/live-classes",
    "/certificates",
    "/study-material",
    "/assignments",
    "/portal",
    "/support",
  ],
  COUNSELLOR: [
    "/dashboard",
    "/admissions", // Lead CRM & Demos
    "/students",
    "/courses",
    "/batches",
    "/communication",
    "/support",
  ],
  ACCOUNTANT: [
    "/dashboard",
    "/students",
    "/fees", // Fees & Receipts
    "/expenses", // Daily expenses
    "/income", // Extra income & non-fee revenue
    "/reports", // Financial fee reports
    "/support",
  ],
  TECHNICIAN: [
    "/dashboard",
    "/tests", // CBT Lab tests & questions
    "/study-material",
    "/batches",
    "/support",
  ],
  STUDENT: [
    "/portal", // Dedicated student portal
    "/support", // Help & Support (role-aware)
  ],
  PARENT: [
    "/portal", // Dedicated parent portal
    "/support", // Help & Support (role-aware)
  ],
};

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const rawRole = (session?.user as { role?: string } | undefined)?.role || "OWNER";
  const userRole = String(rawRole).toUpperCase();

  // Impersonation detection — platform admin impersonating an institute/branch
  // uses either JWT impersonatingBranchId (branch impersonation) or
  // platform_impersonate_institute cookie (platform admin impersonating institute).
  // For client, check session JWT fields and cookie.
  const isImpersonatingBranch = Boolean(
    (session?.user as any)?.isImpersonatingBranch || (session?.user as any)?.impersonatingBranchId
  );
  const isPlatformImpersonating =
    typeof document !== "undefined" ? document.cookie.includes("platform_impersonate_institute") : false;
  const isImpersonating = isImpersonatingBranch || isPlatformImpersonating;
  // When PLATFORM_ADMIN is impersonating, treat as OWNER for nav so Courses/Faculty/etc. show
  const effectiveRole = userRole === "PLATFORM_ADMIN" && isImpersonating ? "OWNER" : userRole;

  useEffect(() => {
    fetch("/api/institutes/features")
      .then((res) => res.json())
      .then((data) => {
        if (data.featureFlags) setFeatures(data.featureFlags);
        if (Array.isArray(data.permissions)) setUserPermissions(data.permissions);
      })
      .catch(() => {});
  }, []);

  const sessionPermissions = (session?.user as any)?.permissions || [];
  const effectivePermissions = userPermissions.length > 0 ? userPermissions : sessionPermissions;

  const allowedList =
    ROLE_ALLOWED_ROUTES[effectiveRole] || (effectiveRole === "PARENT" ? ["/portal"] : ROLE_ALLOWED_ROUTES["STAFF"]);

  const visibleNav = nav
    .filter((item) => {
      if (item.featureKey && !features[item.featureKey]) return false;
      if (effectiveRole === "OWNER" || effectiveRole === "ADMIN") {
        if (allowedList.includes("*")) return true;
        return allowedList.includes(item.href);
      }
      if (effectiveRole === "STUDENT" || effectiveRole === "PARENT") {
        return item.href === "/portal";
      }
      // For staff roles, gate item if specific permission required
      if (item.permission) {
        if (!hasPermission({ role: effectiveRole, permissions: effectivePermissions }, item.permission)) {
          return false;
        }
      }
      if (allowedList.includes("*")) return true;
      return allowedList.includes(item.href);
    })
    .map((item) => {
      if (item.href === "/portal") {
        if (effectiveRole === "PARENT") return { ...item, label: "Parent Portal" };
        if (effectiveRole === "STUDENT") return { ...item, label: "Student Portal" };
      }
      return item;
    });

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#334155", color: "#f1f5f9" }}>
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
              color: "#422006",
            }}
          >
            <GraduationCap size={20} strokeWidth={2.5} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "inherit", fontSize: "1rem", fontWeight: 600, lineHeight: 1, color: "white" }}>
              Vidyalaya
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "#cbd5e1", textTransform: "capitalize" }}>
              {effectiveRole === "PARENT" ? "Parent Portal" : effectiveRole === "STUDENT" ? "Student Portal" : `${effectiveRole.toLowerCase()} Panel`}
            </Typography>
          </Box>
        </Box>
        <Box
          component="button"
          onClick={onClose}
          sx={{
            display: { lg: "none" },
            color: "#cbd5e1",
            bgcolor: "transparent",
            border: "none",
            cursor: "pointer",
            p: 0.5,
          }}
          aria-label="Close menu"
        >
          <X size={20} />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 2 }}>
        <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={onClose}
                  selected={active}
                  sx={{
                    borderRadius: 2,
                    px: 1.5,
                    py: 1.25,
                    gap: 1.5,
                    bgcolor: active ? "rgba(255,255,255,0.1)" : "transparent",
                    color: active ? "white" : "#f1f5f9",
                    fontWeight: active ? 700 : 600,
                    fontSize: "0.75rem",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.05)", color: "white" },
                    "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, color: active ? "#fbbf24" : "#e2e8f0" }}>
                    <Icon size={16} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { sx: { fontSize: "0.75rem", fontWeight: active ? 700 : 600 } } }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 1.5, textAlign: "center" }}>
        <Typography sx={{ fontSize: "11px", color: "#cbd5e1" }}>
          Role: <Box component="span" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase" }}>{effectiveRole}</Box>
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile temporary drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": { width: 256, boxSizing: "border-box", bgcolor: "#334155", border: "none" },
        }}
      >
        {drawerContent}
      </Drawer>
      {/* Desktop permanent drawer — fixed, independent scroll */}
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
            bgcolor: "#334155",
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

