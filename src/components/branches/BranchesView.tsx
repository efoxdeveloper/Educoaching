"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  Plus,
  Search,
  Users,
  MapPin,
  Phone,
  Wallet,
  TrendingUp,
  Edit2,
  Trash2,
  Building,
  Zap,
  Loader2,
  LogOut,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateBranchDrawer, type BranchItem } from "./CreateBranchDrawer";
import { formatCurrency } from "@/lib/utils";

export function BranchesView({
  initialBranches,
}: {
  initialBranches: BranchItem[];
}) {
  const [branches, setBranches] = useState<BranchItem[]>(initialBranches);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<BranchItem | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<BranchItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [mainBranchNotice, setMainBranchNotice] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [activeImpersonationBranchId, setActiveImpersonationBranchId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const { update } = useSession();

  useEffect(() => {
    fetch("/api/branches/impersonate")
      .then((r) => r.json())
      .then((data) => {
        if (data.isImpersonating && data.branchId && !data.branch?.isMainBranch) {
          setActiveImpersonationBranchId(data.branchId);
        } else {
          setActiveImpersonationBranchId(null);
        }
      })
      .catch(() => {
        setActiveImpersonationBranchId(null);
      });
  }, []);

  const handleStartImpersonation = async (branch: BranchItem) => {
    setImpersonatingId(branch.id);
    try {
      const res = await fetch("/api/branches/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: branch.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error || "Failed to start branch impersonation");
        return;
      }
      // Per-session JWT: update session with impersonatingBranchId
      try {
        await update({ impersonatingBranchId: body.impersonatingBranchId || branch.id });
      } catch {}
      window.location.reload();
    } catch {
      alert("Error initiating branch impersonation");
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleExitImpersonation = async () => {
    try {
      const res = await fetch("/api/branches/impersonate/exit", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      try {
        await update({ impersonatingBranchId: null });
      } catch {}
      window.location.reload();
    } catch {
      alert("Error exiting branch impersonation");
    }
  };

  const refreshBranches = async () => {
    try {
      const res = await fetch("/api/branches/stats");
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch {
      console.error("Failed to refresh branch stats");
    }
  };

  const onDeleteClick = (branch: BranchItem) => {
    if (branch.isMainBranch) {
      setMainBranchNotice("Cannot delete the Main Branch / Head Office. Reassign another branch as Main Branch first.");
      return;
    }
    setBranchToDelete(branch);
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/branches/${branchToDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBranches((prev) => prev.filter((b) => b.id !== branchToDelete.id));
        setNotification(`Branch "${branchToDelete.name}" deleted successfully.`);
        setBranchToDelete(null);
      } else {
        setNotification(data.error || "Failed to delete branch");
      }
    } catch {
      setNotification("Failed to delete branch. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = branches.filter((b) => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchName = b.name.toLowerCase().includes(term);
      const matchCity = b.city?.toLowerCase().includes(term) ?? false;
      const matchState = b.state?.toLowerCase().includes(term) ?? false;
      if (!matchName && !matchCity && !matchState) return false;
    }
    return true;
  });

  const totalStudents = branches.reduce((sum, b) => sum + (b.studentCount || 0), 0);
  const totalCollections = branches.reduce((sum, b) => sum + (b.totalCollected || 0), 0);
  const totalExpenses = branches.reduce((sum, b) => sum + (b.totalExpenses || 0), 0);
  const totalProfit = totalCollections - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Multi-Branch Center Management</h1>
          <p className="mt-0.5 text-xs text-scholar-400">
            Manage your physical campus centers, track branch-level student enrollment, collections, and profitability.
          </p>
        </div>

        <button
          onClick={() => {
            setBranchToEdit(null);
            setDrawerOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-scholar-700 transition-colors"
        >
          <Plus size={15} /> Add Campus Branch
        </button>
      </div>

      {notification && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-2xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-base">⏳</span>
            <div>
              <p className="font-bold text-amber-950">Sub-Branch Request in Processing</p>
              <p className="mt-0.5 text-amber-800">{notification}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-amber-600 hover:text-amber-900 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Branch Master Control Banner */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-700 text-white shrink-0 shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-purple-950 flex items-center gap-2">
                <span>Main Branch Master Control Active</span>
                <span className="rounded-md bg-purple-200/90 px-2 py-0.5 text-[10px] font-bold text-purple-900 uppercase">
                  Centralized Administration
                </span>
              </h3>
              <p className="text-xs text-purple-900/80 mt-0.5">
                The Main Branch (Head Office) has full access to view, switch between, and make changes to all {branches.length} campus branches, including student enrollments, batch schedules, and fee collections.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Active Campuses</span>
            <Building2 size={16} className="text-scholar-600" />
          </div>
          <p className="font-display text-2xl font-bold text-ink mt-2">
            {branches.filter((b) => b.status === "ACTIVE").length}{" "}
            <span className="text-xs font-normal text-scholar-400">/ {branches.length}</span>
          </p>
          <p className="text-[10px] text-scholar-400 mt-1">Operational branch centers</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Total Enrolled Students</span>
            <Users size={16} className="text-scholar-600" />
          </div>
          <p className="font-display text-2xl font-bold text-ink mt-2">
            {totalStudents.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-scholar-400 mt-1">Across all branch campuses</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Total Fee Collections</span>
            <Wallet size={16} className="text-emerald-600" />
          </div>
          <p className="font-display text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(totalCollections)}
          </p>
          <p className="text-[10px] text-scholar-400 mt-1">Total cash inflow collected</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-scholar-500">Net Campus Profit</span>
            <TrendingUp size={16} className="text-scholar-600" />
          </div>
          <p className={`font-display text-2xl font-bold mt-2 ${totalProfit >= 0 ? "text-scholar-800" : "text-rose-600"}`}>
            {formatCurrency(totalProfit)}
          </p>
          <p className="text-[10px] text-scholar-400 mt-1">After deducting campus expenses</p>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder="Search by branch name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-scholar-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Centers Only</option>
            <option value="INACTIVE">Inactive Centers</option>
          </select>
        </div>

        <span className="text-xs font-medium text-scholar-400">
          Showing {filtered.length} branches
        </span>
      </div>

      {/* Branches Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-scholar-100 bg-white p-12 text-center shadow-card">
          <Building2 size={28} className="mx-auto text-scholar-400" />
          <h3 className="mt-3 font-display text-base font-semibold text-ink">No Branches Found</h3>
          <p className="mt-1 text-xs text-scholar-400 max-w-sm mx-auto">
            {search || statusFilter !== "ALL"
              ? "No branches match your current filter."
              : "Expand your coaching institute by creating multiple branch centers."}
          </p>
          <button
            onClick={() => {
              setBranchToEdit(null);
              setDrawerOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700"
          >
            <Plus size={14} /> Add First Branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => {
            const margin =
              b.totalCollected && b.totalCollected > 0
                ? Math.round(((b.netProfit || 0) / b.totalCollected) * 100)
                : 0;

            return (
              <Card
                key={b.id}
                className="flex flex-col justify-between p-5 transition-all hover:shadow-popover"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-50 text-scholar-600">
                        <Building size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-ink">{b.name}</h3>
                        <p className="flex items-center gap-1 text-[11px] text-scholar-400">
                          <MapPin size={11} /> {b.city || "Primary City"}{b.state ? `, ${b.state}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {b.isMainBranch && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900 border border-purple-200 shadow-2xs">
                          🏛️ Main Branch
                        </span>
                      )}
                      <Badge
                        tone={
                          b.status === "ACTIVE"
                            ? "success"
                            : b.status === "PENDING_APPROVAL"
                            ? "warn"
                            : "neutral"
                        }
                      >
                        {b.status === "PENDING_APPROVAL" ? "PENDING APPROVAL" : b.status}
                      </Badge>
                    </div>
                  </div>

                  {b.address && (
                    <p className="mt-3 text-xs text-scholar-500 bg-scholar-50/60 p-2 rounded-lg line-clamp-2">
                      {b.address}
                    </p>
                  )}

                  {b.contact && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-scholar-600 font-medium">
                      <Phone size={12} className="text-scholar-400" /> {b.contact}
                    </p>
                  )}

                  {b.guidePhone && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-purple-700 font-medium">
                      <span className="text-[11px] font-semibold text-purple-800">🧭 Guide Helpline:</span> {b.guidePhone}
                    </p>
                  )}

                  {b.inChargeName && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink">
                      <span className="text-[11px] font-semibold text-scholar-600">👤 Owner:</span> <span className="font-semibold">{b.inChargeName}</span>
                    </p>
                  )}

                  {b.isMainBranch ? (
                    <div className="mt-2.5 rounded-lg border border-purple-200 bg-purple-50/70 p-2 text-[11px] text-purple-900 font-semibold flex items-center gap-1.5">
                      <Building2 size={13} className="text-purple-700 shrink-0" />
                      <span>Head Office: Full administrative access to manage all {branches.length - 1} other branch locations.</span>
                    </div>
                  ) : b.status === "PENDING_APPROVAL" ? (
                    <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-[11px] text-amber-900 flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5">⏳</span>
                      <div>
                        <span className="font-bold">Request in Processing:</span> Platform admin approval is pending. Access will unlock once granted.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 rounded-lg border border-scholar-100 bg-scholar-50/60 p-2 text-[11px] text-scholar-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} className="text-scholar-400" />
                        <span>Governed by Main Branch</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBranchToEdit(b);
                          setDrawerOpen(true);
                        }}
                        className="text-[10px] font-bold text-scholar-700 hover:underline"
                      >
                        Configure from Main Branch →
                      </button>
                    </div>
                  )}

                  {/* Operational stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-scholar-50 py-2.5 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-scholar-400 uppercase font-semibold">
                        Students
                      </span>
                      <p className="font-bold text-ink mt-0.5">{b.studentCount || 0}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-scholar-400 uppercase font-semibold">
                        Batches
                      </span>
                      <p className="font-bold text-ink mt-0.5">{b.batchCount || 0}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-scholar-400 uppercase font-semibold">
                        CRM Leads
                      </span>
                      <p className="font-bold text-scholar-700 mt-0.5">{b.leadCount || 0}</p>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="mt-3 rounded-xl bg-scholar-50/70 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-scholar-500">Collections:</span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(b.totalCollected || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-scholar-500">Expenses:</span>
                      <span className="font-semibold text-rose-600">
                        -{formatCurrency(b.totalExpenses || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-scholar-200/50 pt-1">
                      <span className="font-semibold text-ink">Net Margin:</span>
                      <span className={`font-bold ${(b.netProfit || 0) >= 0 ? "text-scholar-800" : "text-rose-600"}`}>
                        {formatCurrency(b.netProfit || 0)} ({margin}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-scholar-100 pt-3">
                  {!b.isMainBranch && (
                    b.status === "PENDING_APPROVAL" ? (
                      <div className="w-full text-center rounded-xl border border-amber-200 bg-amber-50/60 py-1.5 px-2 text-[11px] font-semibold text-amber-800">
                        🔒 Sub-Branch Locked • Awaiting Admin Access Grant
                      </div>
                    ) : activeImpersonationBranchId === b.id ? (
                      <button
                        type="button"
                        onClick={handleExitImpersonation}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                      >
                        <LogOut size={12} className="text-amber-700" /> Active Impersonation • Exit to Main Branch
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartImpersonation(b)}
                        disabled={impersonatingId === b.id}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/90 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {impersonatingId === b.id ? (
                          <Loader2 size={13} className="animate-spin text-purple-700" />
                        ) : (
                          <Zap size={13} className="text-purple-700" />
                        )}
                        <span>⚡ Impersonate & Manage Branch View</span>
                      </button>
                    )
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBranchToEdit(b);
                        setDrawerOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-scholar-200 bg-white py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 cursor-pointer"
                    >
                      <Edit2 size={12} /> Edit Details
                    </button>

                    {!b.isMainBranch && (
                      <button
                        type="button"
                        onClick={() => onDeleteClick(b)}
                        className="p-1.5 rounded-xl border border-scholar-200 text-scholar-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer transition"
                        title="Delete Branch"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Drawer */}
      <CreateBranchDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setBranchToEdit(null);
        }}
        branchToEdit={branchToEdit}
        onSaved={(msg) => {
          refreshBranches();
          if (msg) setNotification(msg);
        }}
      />

      {/* Main Branch Deletion Restriction Modal */}
      <ConfirmDialog
        open={!!mainBranchNotice}
        onClose={() => setMainBranchNotice(null)}
        onConfirm={() => setMainBranchNotice(null)}
        title="Cannot Delete Main Branch"
        message={mainBranchNotice}
        confirmLabel="Understood"
        cancelLabel="Close"
        tone="warn"
      />

      {/* Branch Deletion Confirm Dialog */}
      <ConfirmDialog
        open={!!branchToDelete}
        onClose={() => setBranchToDelete(null)}
        onConfirm={confirmDeleteBranch}
        title="Delete Branch"
        message={
          branchToDelete ? (
            <span>
              Are you sure you want to delete sub-branch <strong>&ldquo;{branchToDelete.name}&rdquo;</strong>?
              {branchToDelete.studentCount && branchToDelete.studentCount > 0 ? (
                <span className="block mt-1 text-rose-600 font-semibold">
                  ⚠️ This branch currently has {branchToDelete.studentCount} students and {branchToDelete.batchCount || 0} batches.
                </span>
              ) : null}
            </span>
          ) : null
        }
        confirmLabel="Delete Branch"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
