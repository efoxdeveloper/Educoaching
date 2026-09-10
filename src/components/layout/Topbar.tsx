"use client";

import { useState, useEffect } from "react";
import { Menu, Search, LogOut, Building2, KeyRound, AlertCircle, CheckCircle2, Loader2, X, Mail } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { initials } from "@/lib/utils";
import Chip from "@mui/material/Chip";

export function Topbar({
  onMenuClick,
  title,
  userName,
  showSearch = true,
}: {
  onMenuClick: () => void;
  title: string;
  userName?: string;
  showSearch?: boolean;
}) {
  const [branches, setBranches] = useState<Array<{ id: string; name: string; isMainBranch?: boolean }>>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setBranches(data);
          const mainBranch = data.find((b: { isMainBranch?: boolean }) => b.isMainBranch) || data[0];
          fetch("/api/branches/impersonate")
            .then((r) => r.json())
            .then((impData) => {
              if (impData.isImpersonating && impData.branchId && !impData.branch?.isMainBranch) {
                setSelectedBranch(impData.branchId);
                setIsImpersonating(true);
              } else if (mainBranch) {
                setSelectedBranch(mainBranch.id);
                setIsImpersonating(false);
              }
            })
            .catch(() => {
              if (mainBranch) {
                setSelectedBranch(mainBranch.id);
                setIsImpersonating(false);
              }
            });
        }
      })
      .catch(() => {});
  }, []);

  const { data: session, update } = useSession();

  const handleBranchChange = async (newBranchId: string) => {
    setSelectedBranch(newBranchId);
    const chosen = branches.find((b) => b.id === newBranchId);
    const isMain = Boolean(
      chosen?.isMainBranch ||
      (chosen?.name && chosen.name.toLowerCase().includes("main"))
    );
    if (isMain) {
      await fetch("/api/branches/impersonate/exit", { method: "POST" });
      if (update) {
        await update({ impersonatingBranchId: null, impersonationStartedAt: null });
      }
    } else {
      const res = await fetch("/api/branches/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: newBranchId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to switch branch");
        return;
      }
      if (update) {
        await update({
          impersonatingBranchId: data.impersonatingBranchId || data.branchId || newBranchId,
          impersonationStartedAt: Date.now(),
        });
      }
    }
    window.location.reload();
  };

  const rawRole = (session?.user as { role?: string } | undefined)?.role || "";
  const userRole = String(rawRole).toUpperCase();
  const userBranchId = (session?.user as { branchId?: string | null } | undefined)?.branchId;
  const isMainBranch = (session?.user as { isMainBranch?: boolean } | undefined)?.isMainBranch ?? true;
  const isSubBranchUser = Boolean(userBranchId && !isMainBranch);

  // Main Branch users, Owners, and Platform Admins can switch between branches.
  // Sub-branch users, Students, Parents, and Faculty are strictly scoped to their assigned branch.
  const isStudentOrParentOrFaculty = userRole === "STUDENT" || userRole === "PARENT" || userRole === "FACULTY";
  const canSwitchBranch =
    !isStudentOrParentOrFaculty &&
    !isSubBranchUser &&
    (userRole === "OWNER" || (userRole === "ADMIN" && isMainBranch) || userRole === "PLATFORM_ADMIN");

  const currentBranch = branches.find((b) => b.id === (isSubBranchUser ? userBranchId : selectedBranch));
  const currentBranchName = currentBranch?.name;
  const currentBranchIsMain = !!currentBranch?.isMainBranch;

  // Change Password State for logged-in user
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");

  const handleRequestPasswordChange = async () => {
    setRequestingPassword(true);
    setPasswordErrorMsg("");
    setPasswordSuccessMsg("");

    try {
      const res = await fetch("/api/auth/security/request-password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordErrorMsg(data.error || "Failed to send verification email");
      } else {
        setPasswordSuccessMsg(data.message || "Verification email sent successfully!");
      }
    } catch {
      setPasswordErrorMsg("Network error. Please try again.");
    } finally {
      setRequestingPassword(false);
    }
  };

  return (
    <header className="flex min-h-16 flex-col gap-2 border-b border-scholar-100 bg-white px-4 py-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-3 lg:py-0 lg:px-8">
      <div className="flex min-w-0 w-full flex-1 items-center gap-3 lg:w-auto">
        <button
          onClick={onMenuClick}
          className="shrink-0 rounded-lg p-2 text-scholar-500 hover:bg-scholar-50 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="min-w-0 flex-1 break-words font-display text-base font-bold leading-tight text-ink sm:text-lg sm:leading-tight lg:text-xl">{title}</h1>
      </div>

      <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap lg:justify-end lg:gap-3">
        {canSwitchBranch ? (
          branches.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-scholar-50/60 px-2.5 py-1">
              <Building2 size={14} className="text-scholar-600" />
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-scholar-800 outline-none cursor-pointer"
                title="Select Branch"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.isMainBranch ? `🏛️ ${b.name} (Main)` : `📍 ${b.name}`}
                  </option>
                ))}
              </select>
            </div>
          )
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-scholar-50 px-2.5 py-1 text-xs font-semibold text-scholar-700">
            <Building2 size={13} className="text-scholar-500" />
            <span>{currentBranchName ? `📍 ${currentBranchName} Branch` : "Assigned Branch Credentials"}</span>
            {currentBranchIsMain && currentBranchName && <Chip label="Main" size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: "#F5F3FF", color: "#4C1D95", border: "1px solid #DDD6FE" }} />}
          </div>
        )}

        {showSearch && (
          <div className="hidden items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-2 text-sm text-scholar-400 sm:flex">
            <Search size={16} />
            <input
              placeholder="Search students, batches..."
              className="w-56 bg-transparent outline-none placeholder:text-scholar-300"
            />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white py-1.5 pl-1.5 pr-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-600 text-xs font-semibold text-white">
            {initials(userName || "Admin")}
          </div>
          <span className="hidden text-sm font-medium text-ink sm:inline">{userName || "Admin"}</span>
        </div>

        <button
          onClick={() => {
            setPasswordErrorMsg("");
            setPasswordSuccessMsg("");
            setPasswordModalOpen(true);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-scholar-100 bg-white text-scholar-500 hover:text-scholar-800 hover:bg-scholar-50 cursor-pointer"
          title="Change Password"
          aria-label="Change Password"
        >
          <KeyRound size={15} />
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-scholar-100 bg-white text-scholar-500 hover:text-danger-500 cursor-pointer"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Password Change Modal for Faculty / Staff */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between border-b border-scholar-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-50 text-scholar-800 border border-scholar-200">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-ink">Change Account Password</h3>
                  <p className="text-[11px] text-scholar-500">Identity verification via email</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-50 hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {passwordSuccessMsg ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <h4 className="text-xs font-bold text-emerald-950">Verification Email Sent!</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {passwordSuccessMsg}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium pt-1">
                  Please check your inbox. Once verified, you can set your new password.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="w-full rounded-xl bg-emerald-700 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-scholar-100 bg-scholar-50 p-3.5 text-xs text-scholar-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-scholar-900">
                    <Mail size={14} className="text-scholar-600" />
                    <span>Identity Verification</span>
                  </div>
                  <p className="text-scholar-600 leading-relaxed text-[11px]">
                    To change your password, a verification link will be sent to your registered email address to verify your identity.
                  </p>
                  <div className="mt-2 rounded-lg border border-scholar-200 bg-white px-3 py-2 text-xs">
                    <span className="text-scholar-500 font-medium">Logged-in Email: </span>
                    <span className="font-mono font-bold text-scholar-900">{session?.user?.email || "Account email"}</span>
                  </div>
                </div>

                {passwordErrorMsg && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-scholar-100">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="rounded-xl border border-scholar-200 px-3.5 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestPasswordChange}
                    disabled={requestingPassword || !session?.user?.email}
                    className="inline-flex items-center gap-2 rounded-xl bg-scholar-800 px-4 py-2 text-xs font-bold text-white hover:bg-scholar-900 disabled:opacity-50 cursor-pointer"
                  >
                    {requestingPassword && <Loader2 size={13} className="animate-spin" />}
                    <span>Send Verification Email</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
