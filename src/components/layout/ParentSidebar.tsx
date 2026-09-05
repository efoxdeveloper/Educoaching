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
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Fetch linked children for switcher
  useEffect(() => {
    // This will be populated via the portal page's student data, but we also try to fetch directly
    // For now, we rely on URL param ?child= or localStorage
    const stored = typeof window !== "undefined" ? localStorage.getItem("parentSelectedChildId") : null;
    if (stored) setSelectedChildId(stored);
  }, []);

  const handleChildSwitch = (childId: string) => {
    setSelectedChildId(childId);
    if (typeof window !== "undefined") {
      localStorage.setItem("parentSelectedChildId", childId);
      // Dispatch event so StudentPortalView can react
      window.dispatchEvent(new CustomEvent("parentChildSwitch", { detail: childId }));
      // Also update URL
      const url = new URL(window.location.href);
      url.searchParams.set("child", childId);
      window.history.replaceState({}, "", url.toString());
    }
  };

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
              <HeartHandshake size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-base font-semibold leading-none text-white">Parent Portal</p>
              <p className="text-[11px] text-scholar-300">Family Learning Hub</p>
            </div>
          </div>
          <button onClick={onClose} className="text-scholar-300 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {/* Child Switcher - only visible if parent has multiple children, populated via portal */}
        <div className="px-3 py-3 border-b border-scholar-600/40">
          <p className="text-[11px] font-bold text-scholar-300 uppercase tracking-wider mb-2">Viewing Child</p>
          <div className="rounded-xl bg-white/10 px-3 py-2.5 text-xs">
            <p className="font-semibold text-white flex items-center justify-between">
              <span>{(session?.user as any)?.name || "Parent Account"}</span>
              <span className="text-[11px] text-marigold-400">Switch in portal →</span>
            </p>
            <p className="text-[11px] text-scholar-300 mt-1">Use the child switcher at the top of the portal content to change which child’s batch, fees, and homework you’re viewing. All 9 sections below follow that selection.</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {parentNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === "/portal" && (searchParams.get("tab") || "batch") === item.href.split("tab=")[1];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-white/10 text-white font-bold shadow-2xs"
                    : "text-scholar-100 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon size={16} className={isActive ? "text-marigold-400" : "text-scholar-200"} />
                {item.label}
                {item.label === "AI Doubt Assistant" && <span className="ml-auto text-[10px] opacity-70">for parents</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-scholar-600/60 p-3 text-[11px] text-scholar-300 text-center">
          Parent Portal • <span className="font-bold text-white uppercase">v1.0</span>
        </div>
      </aside>
    </>
  );
}
