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
  GraduationCap,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
              <p className="font-display text-base font-semibold leading-none text-white">Student Portal</p>
              <p className="text-[11px] text-scholar-300">My Learning Space</p>
            </div>
          </div>
          <button onClick={onClose} className="text-scholar-300 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {studentNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === "/portal" && (searchParams.get("tab") || "batch") === item.href.split("tab=")[1];
            // For Help & Support, also highlight when active
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
                {item.label === "AI Doubt Assistant" && <span className="ml-auto text-[10px]">✨</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-scholar-600/60 p-3 text-[11px] text-scholar-300 text-center">
          Student Portal • <span className="font-bold text-white uppercase">v1.0</span>
        </div>
      </aside>
    </>
  );
}
