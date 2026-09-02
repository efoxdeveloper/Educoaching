"use client";

import { useEffect, useState } from "react";
import { Building2, LogOut, Loader2 } from "lucide-react";

export function BranchImpersonationBanner() {
  const [impersonating, setImpersonating] = useState(false);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [guidePhone, setGuidePhone] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    fetch("/api/branches/impersonate")
      .then((r) => r.json())
      .then((data) => {
        const isMain = Boolean(
          data.branch?.isMainBranch ||
          (data.branch?.name && data.branch.name.toLowerCase().includes("main"))
        );
        if (data.isImpersonating && data.branch && !isMain) {
          setImpersonating(true);
          setBranchName(data.branch.name);
          setGuidePhone(data.branch.guidePhone);
        } else {
          setImpersonating(false);
        }
      })
      .catch(() => {
        setImpersonating(false);
      });
  }, []);

  const handleExit = async () => {
    setExiting(true);
    try {
      await fetch("/api/branches/impersonate/exit", { method: "POST" });
      window.location.reload();
    } catch {
      alert("Failed to return to Main Campus");
      setExiting(false);
    }
  };

  if (!impersonating) return null;

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b-2 border-purple-400 bg-purple-950 px-4 py-2.5 text-xs text-white shadow-lg">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1 rounded bg-purple-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
          <Building2 size={13} />
          Main Campus Impersonation
        </span>
        <span className="text-purple-100">
          Viewing and managing as{" "}
          <span className="font-bold text-amber-300 underline underline-offset-2">
            {branchName ?? "Satellite Branch"}
          </span>
          {guidePhone ? ` • Guide Helpline: ${guidePhone}` : ""}. Full operational access active across students, batches, and records.
        </span>
      </div>

      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-purple-950 shadow transition-all hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 cursor-pointer"
      >
        {exiting ? (
          <Loader2 size={14} className="animate-spin text-purple-700" />
        ) : (
          <LogOut size={14} className="text-rose-600" />
        )}
        <span>Exit Branch View & Return to Main Campus</span>
      </button>
    </div>
  );
}
