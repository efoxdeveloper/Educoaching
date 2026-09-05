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
import { cn } from "@/lib/utils";
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

  const allowedList = ROLE_ALLOWED_ROUTES[userRole] || (userRole === "PARENT" ? ["/portal"] : ROLE_ALLOWED_ROUTES["STAFF"]);

  const visibleNav = nav
    .filter((item) => {
      if (item.featureKey && !features[item.featureKey]) return false;
      if (userRole === "OWNER" || userRole === "ADMIN") {
        if (allowedList.includes("*")) return true;
        return allowedList.includes(item.href);
      }
      if (userRole === "STUDENT" || userRole === "PARENT") {
        return item.href === "/portal";
      }
      // For staff roles, gate item if specific permission required
      if (item.permission) {
        if (!hasPermission({ role: userRole, permissions: effectivePermissions }, item.permission)) {
          return false;
        }
      }
      if (allowedList.includes("*")) return true;
      return allowedList.includes(item.href);
    })
    .map((item) => {
      if (item.href === "/portal") {
        if (userRole === "PARENT") return { ...item, label: "Parent Portal" };
        if (userRole === "STUDENT") return { ...item, label: "Student Portal" };
      }
      return item;
    });

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-scholar-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-scholar-700 text-scholar-50 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:overflow-hidden lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
              <GraduationCap size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-base font-semibold leading-none text-white">Vidyalaya</p>
              <p className="text-[11px] text-scholar-300 capitalize">
                {userRole === "PARENT" ? "Parent Portal" : userRole === "STUDENT" ? "Student Portal" : `${userRole.toLowerCase()} Panel`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-scholar-300 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-white/10 text-white font-bold shadow-2xs"
                    : "text-scholar-100 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon size={16} className={active ? "text-marigold-400" : "text-scholar-200"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-scholar-600/60 p-3 text-[11px] text-scholar-300 text-center">
          Role: <span className="font-bold text-white uppercase">{userRole}</span>
        </div>
      </aside>
    </>
  );
}