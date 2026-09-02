"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Topbar } from "./Topbar";

export function AdminShell({
  title,
  userName,
  children,
}: {
  title: string;
  userName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <Topbar onMenuClick={() => setOpen(true)} title={title} userName={userName} showSearch={false} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
