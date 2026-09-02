"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, ScrollText, GitBranch, Ticket, X } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tickets", label: "Support Tickets", icon: Ticket },
  { href: "/admin/branches", label: "Branch Requests", icon: GitBranch },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-scholar-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-scholar-900 text-scholar-50 transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-base font-semibold leading-none text-white">Vidyalaya</p>
              <p className="text-[11px] text-scholar-300">Platform Admin</p>
            </div>
          </div>
          <button onClick={onClose} className="text-scholar-300 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname?.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-scholar-200 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon size={18} strokeWidth={2} className={active ? "text-marigold-400" : ""} />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-marigold-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-scholar-300">
          Platform Admin v1.0
        </div>
      </aside>
    </>
  );
}