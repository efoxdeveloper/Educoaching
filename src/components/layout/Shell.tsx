"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { StudentSidebar } from "./StudentSidebar";
import { ParentSidebar } from "./ParentSidebar";
import { Topbar } from "./Topbar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { BranchImpersonationBanner } from "./BranchImpersonationBanner";

export function Shell({
  title,
  userName,
  children,
}: {
  title: string;
  userName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const role = String((session?.user as { role?: string })?.role || "").toUpperCase();

  const renderSidebar = () => {
    if (role === "STUDENT") return <StudentSidebar open={open} onClose={() => setOpen(false)} />;
    if (role === "PARENT") return <ParentSidebar open={open} onClose={() => setOpen(false)} />;
    return <Sidebar open={open} onClose={() => setOpen(false)} />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper w-full max-w-full overflow-x-hidden">
      <ImpersonationBanner />
      <BranchImpersonationBanner />
      <div className="flex min-h-screen flex-1 w-full max-w-full min-w-0">
        {renderSidebar()}
        <div className="flex min-h-screen flex-1 flex-col min-w-0 max-w-full w-full lg:pl-0">
          <Topbar onMenuClick={() => setOpen(true)} title={title} userName={userName} />
          <main className="flex-1 min-w-0 max-w-full w-full px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
