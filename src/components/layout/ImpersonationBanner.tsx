"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";

export function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState(false);
  const [instituteName, setInstituteName] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/impersonate/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.isImpersonating) {
          setImpersonating(true);
          setInstituteName(data.instituteName);
        }
      })
      .catch(() => {});
  }, []);

  const handleExit = async () => {
    setExiting(true);
    try {
      await fetch("/api/admin/impersonate/exit", { method: "POST" });
      window.location.href = "/admin";
    } catch {
      alert("Failed to exit impersonation");
      setExiting(false);
    }
  };

  if (!impersonating) return null;

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b-2 border-marigold-400 bg-scholar-900 px-4 py-2.5 text-xs text-white shadow-lg">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1 rounded bg-marigold-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-scholar-900">
          <ShieldAlert size={13} />
          Support Mode
        </span>
        <span className="text-scholar-100">
          You are currently impersonating{" "}
          <span className="font-bold text-marigold-300 underline underline-offset-2">
            {instituteName ?? "Institute"}
          </span>
          . All changes made are live on this tenant.
        </span>
      </div>

      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-scholar-900 shadow transition-all hover:bg-marigold-100 hover:text-scholar-950 focus:outline-none focus:ring-2 focus:ring-marigold-400 disabled:opacity-50"
      >
        {exiting ? (
          <Loader2 size={14} className="animate-spin text-scholar-700" />
        ) : (
          <LogOut size={14} className="text-danger-600" />
        )}
        <span>Exit Impersonation</span>
      </button>
    </div>
  );
}
