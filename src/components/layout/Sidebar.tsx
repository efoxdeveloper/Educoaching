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
  Lock,
  ChevronLeft,
  ChevronRight,
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
import Tooltip from "@mui/material/Tooltip";
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from "@/lib/institute-settings";
import { hasPermission, type Permission } from "@/lib/permissions";
import { isInstituteSubscriptionExpired, isRouteRestrictedBySubscription } from "@/lib/subscription";

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
  PLATFORM_ADMIN: ["*"], // Full access under institute impersonation
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

export function Sidebar({
  open,
  onClose,
  initialFeatures,
  initialPermissions,
}: {
  open: boolean;
  onClose: () => void;
  initialFeatures?: FeatureFlags;
  initialPermissions?: string[];
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [features, setFeatures] = useState<FeatureFlags>(initialFeatures ?? DEFAULT_FEATURE_FLAGS);
  const [userPermissions, setUserPermissions] = useState<string[]>(initialPermissions ?? []);

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
  // When PLATFORM_ADMIN is in institute dashboard (via impersonation), treat as OWNER for nav
  const effectiveRole = userRole === "PLATFORM_ADMIN" ? "OWNER" : userRole;

  useEffect(() => {
    if (initialFeatures && initialPermissions !== undefined) return;
    fetch("/api/institutes/features")
      .then((res) => res.json())
      .then((data) => {
        if (data.featureFlags) setFeatures(data.featureFlags);
        if (Array.isArray(data.permissions)) setUserPermissions(data.permissions);
      })
      .catch(() => {});
  }, [initialFeatures, initialPermissions]);

  const sessionPermissions = (session?.user as any)?.permissions || [];
  const effectivePermissions = userPermissions.length > 0 ? userPermissions : sessionPermissions;

  const allowedList =
    ROLE_ALLOWED_ROUTES[effectiveRole] || (effectiveRole === "PARENT" ? ["/portal"] : ROLE_ALLOWED_ROUTES["STAFF"]);

  const STAFF_ROLES = ["STAFF", "FACULTY", "COUNSELLOR", "ACCOUNTANT", "TECHNICIAN"];
  const isStaffRole = STAFF_ROLES.includes(effectiveRole);

  // Subscription gate — for UX: show lock on sidebar when expired
  const sessionUserSub = session?.user as any;
  const isSubscriptionExpired = isInstituteSubscriptionExpired({
    billingCycle: sessionUserSub?.billingCycle,
    trialEndsAt: sessionUserSub?.trialEndsAt,
    currentPeriodEnd: sessionUserSub?.currentPeriodEnd,
  });

  const visibleNav = nav
    .filter((item) => {
      if (item.featureKey && !features[item.featureKey]) return false;
      if (effectiveRole === "OWNER" || effectiveRole === "ADMIN" || effectiveRole === "PLATFORM_ADMIN") {
        if (allowedList.includes("*")) return true;
        return allowedList.includes(item.href);
      }
      if (effectiveRole === "STUDENT" || effectiveRole === "PARENT") {
        return item.href === "/portal";
      }
      // For staff roles, permission is the single source of truth
      if (isStaffRole) {
        if (item.permission) {
          return hasPermission({ role: effectiveRole, permissions: effectivePermissions }, item.permission);
        }
        // Items without permission (dashboard, portal, support) are visible to all staff
        return true;
      }
      // Fallback for any other role
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

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const renderDrawerContent = (collapsed: boolean) => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#334155", color: "#f1f5f9" }}>
      <Box sx={{ display: "flex", height: 64, alignItems: "center", justifyContent: collapsed ? "center" : "space-between", px: collapsed ? 1 : 2.5, transition: "padding 0.2s" }}>
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
              flexShrink: 0,
            }}
          >
            <GraduationCap size={20} strokeWidth={2.5} />
          </Box>
          {!collapsed && (
            <Box sx={{ whiteSpace: "nowrap", overflow: "hidden" }}>
              <Typography sx={{ fontFamily: "inherit", fontSize: "1rem", fontWeight: 600, lineHeight: 1, color: "white" }}>
                Vidyalaya
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#cbd5e1", textTransform: "capitalize" }}>
                {effectiveRole === "PARENT" ? "Parent Portal" : effectiveRole === "STUDENT" ? "Student Portal" : `${effectiveRole.toLowerCase()} Panel`}
              </Typography>
            </Box>
          )}
        </Box>
        {/* Mobile close button */}
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
        {/* Desktop collapse toggle button when expanded */}
        {!collapsed && (
          <Box
            component="button"
            onClick={toggleCollapse}
            sx={{
              display: { xs: "none", lg: "flex" },
              color: "#cbd5e1",
              bgcolor: "rgba(255,255,255,0.06)",
              border: "none",
              cursor: "pointer",
              p: 0.75,
              borderRadius: 1.5,
              transition: "background 0.2s, color 0.2s",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)", color: "white" },
            }}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </Box>
        )}
      </Box>

      {/* Desktop expand button under logo when collapsed */}
      {collapsed && (
        <Box sx={{ display: { xs: "none", lg: "flex" }, justifyContent: "center", py: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Tooltip title="Expand sidebar" placement="right" arrow>
            <Box
              component="button"
              onClick={toggleCollapse}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 28,
                borderRadius: 1.5,
                color: "#cbd5e1",
                bgcolor: "rgba(255,255,255,0.06)",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s, color 0.2s",
                "&:hover": { bgcolor: "rgba(255,255,255,0.18)", color: "#fbbf24" },
              }}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} />
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* Subscription expired notice in sidebar */}
      {isSubscriptionExpired && !isPlatformImpersonating && !["STUDENT", "PARENT", "PLATFORM_ADMIN"].includes(effectiveRole) && (
        collapsed ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 1 }}>
            <Tooltip title="Plan Expired — Renew to unlock all sections" placement="right" arrow>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(239,68,68,0.2)", color: "#fecaca" }}>
                <Lock size={16} />
              </Box>
            </Tooltip>
          </Box>
        ) : (
          <Box sx={{ mx: 1.5, mb: 1, p: 1.5, borderRadius: 2, bgcolor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#fecaca", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Lock size={12} /> Plan Expired
            </Typography>
            <Typography sx={{ fontSize: "10px", color: "#fecaca", mt: 0.5, lineHeight: 1.4 }}>
              Renew to unlock all sections. Only Plans & Settings are available.
            </Typography>
          </Box>
        )
      )}

      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", px: collapsed ? 1 : 1.5, py: 2 }}>
        <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const isLocked =
              isSubscriptionExpired &&
              isRouteRestrictedBySubscription({
                pathname: item.href,
                role: effectiveRole,
                isImpersonating: isPlatformImpersonating,
                isExpired: isSubscriptionExpired,
              });
            return (
              <ListItem key={item.href} disablePadding sx={{ display: "block" }}>
                <Tooltip title={item.label} placement="right" arrow disableHoverListener={!collapsed}>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    onClick={onClose}
                    selected={active}
                    title={!collapsed && isLocked ? "Unlocks after renewing your plan" : undefined}
                    sx={{
                      borderRadius: 2,
                      px: collapsed ? 1 : 1.5,
                      py: 1.25,
                      minHeight: 40,
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: collapsed ? 0 : 1.5,
                      bgcolor: active ? "rgba(255,255,255,0.1)" : "transparent",
                      color: active ? "white" : isLocked ? "#94a3b8" : "#f1f5f9",
                      fontWeight: active ? 700 : 600,
                      fontSize: "0.75rem",
                      opacity: isLocked ? 0.7 : 1,
                      "&:hover": { bgcolor: isLocked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)", color: isLocked ? "#94a3b8" : "white" },
                      "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.1)" },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 0, justifyContent: "center", color: active ? "#fbbf24" : isLocked ? "#64748b" : "#e2e8f0" }}>
                      <Icon size={18} />
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        slotProps={{ primary: { sx: { fontSize: "0.75rem", fontWeight: active ? 700 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } } }}
                      />
                    )}
                    {!collapsed && isLocked && <Lock size={12} style={{ color: "#64748b", flexShrink: 0 }} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 1.5, textAlign: "center", transition: "padding 0.2s" }}>
        {collapsed ? (
          <Tooltip title="Expand sidebar" placement="right" arrow>
            <Box
              component="button"
              onClick={toggleCollapse}
              sx={{
                display: { xs: "none", lg: "flex" },
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 32,
                mx: "auto",
                borderRadius: 1.5,
                color: "#cbd5e1",
                bgcolor: "rgba(255,255,255,0.06)",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s, color 0.2s",
                "&:hover": { bgcolor: "rgba(255,255,255,0.18)", color: "#fbbf24" },
              }}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} />
            </Box>
          </Tooltip>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: "11px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
              Role: <Box component="span" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase" }}>{effectiveRole}</Box>
            </Typography>
            <Box
              component="button"
              onClick={toggleCollapse}
              sx={{
                display: { xs: "none", lg: "flex" },
                alignItems: "center",
                gap: 0.5,
                color: "#cbd5e1",
                bgcolor: "rgba(255,255,255,0.06)",
                border: "none",
                cursor: "pointer",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: "11px",
                transition: "background 0.2s, color 0.2s",
                "&:hover": { bgcolor: "rgba(255,255,255,0.15)", color: "white" },
              }}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft size={14} />
              <span>Collapse</span>
            </Box>
          </Box>
        )}
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
        {renderDrawerContent(false)}
      </Drawer>
      {/* Desktop permanent drawer — fixed, independent scroll */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", lg: "block" },
          width: isCollapsed ? 64 : 256,
          flexShrink: 0,
          transition: "width 0.2s ease-in-out",
          "& .MuiDrawer-paper": {
            width: isCollapsed ? 64 : 256,
            boxSizing: "border-box",
            bgcolor: "#334155",
            border: "none",
            height: "100vh",
            overflowX: "hidden",
            position: "fixed",
            top: 0,
            left: 0,
            transition: "width 0.2s ease-in-out",
          },
        }}
      >
        {renderDrawerContent(isCollapsed)}
      </Drawer>
    </>
  );
}
