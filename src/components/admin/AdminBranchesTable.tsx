"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  CheckCircle2,
  Ban,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/utils";
import {
  BranchVerificationDrawer,
  type AdminBranchDetail,
} from "@/components/admin/BranchVerificationDrawer";

export function AdminBranchesTable({
  initialBranches,
}: {
  initialBranches: AdminBranchDetail[];
}) {
  const router = useRouter();
  const [branches, setBranches] = useState<AdminBranchDetail[]>(initialBranches);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    branch: AdminBranchDetail;
    action: "DEACTIVATE" | "REACTIVATE" | "GRANT";
  } | null>(null);

  // Verification Drawer State
  const [selectedBranch, setSelectedBranch] = useState<AdminBranchDetail | null>(null);
  const [verificationDrawerOpen, setVerificationDrawerOpen] = useState(false);

  const openVerification = (branch: AdminBranchDetail) => {
    setSelectedBranch(branch);
    setVerificationDrawerOpen(true);
  };

  const filtered = useMemo(() => {
    return branches.filter((b) => {
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        b.institute.name.toLowerCase().includes(q) ||
        b.institute.ownerName.toLowerCase().includes(q) ||
        b.institute.email.toLowerCase().includes(q);

      const matchesStatus = !statusFilter || b.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [branches, query, statusFilter]);

  const executeStatusChange = async () => {
    if (!statusTarget) return;
    const { branch, action } = statusTarget;
    const nextStatus = action === "DEACTIVATE" ? "INACTIVE" : "ACTIVE";

    setBusyId(branch.id);
    try {
      const res = await fetch(`/api/admin/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setStatusTarget(null);
      if (res.ok) {
        setBranches((prev) =>
          prev.map((b) => (b.id === branch.id ? { ...b, status: nextStatus } : b))
        );
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = branches.filter((b) => b.status === "PENDING_APPROVAL").length;

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>{pendingCount} sub-branch access request{pendingCount > 1 ? "s" : ""}</strong> awaiting platform admin verification and approval.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING_APPROVAL")}
            className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 transition cursor-pointer shrink-0"
          >
            Review Pending Sub-Branches
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" />
          <input
            type="text"
            placeholder="Search branch, institute, city, address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-scholar-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-scholar-500 shadow-2xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-ink outline-none shadow-2xs cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_APPROVAL">Pending Review ({pendingCount})</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-scholar-100 bg-white shadow-xs">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead>
            <tr className="border-b border-scholar-100 bg-scholar-50/60 text-scholar-500 font-semibold uppercase tracking-wider">
              <th className="py-3 pl-4 pr-3">Sub-Branch</th>
              <th className="py-3 px-3">Parent Institute</th>
              <th className="py-3 px-3">Owner / Contact</th>
              <th className="py-3 px-3">Location &amp; Maps</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 pl-3 pr-4 text-right">Verification &amp; Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-scholar-100/70">
            {filtered.map((b) => {
              const fullAddr = [b.address, b.city, b.state].filter(Boolean).join(", ");
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${b.name}, ${fullAddr || b.city || ""}`
              )}`;

              return (
                <tr key={b.id} className="hover:bg-scholar-50/40 transition-colors">
                  <td className="py-3 pl-4 pr-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => openVerification(b)}
                        className="font-bold text-ink hover:text-scholar-600 flex items-center gap-1.5 text-left cursor-pointer group"
                      >
                        <span className="group-hover:underline">{b.name}</span>
                        {b.isMainBranch && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-900 border border-purple-200">
                            Main Branch
                          </span>
                        )}
                      </button>
                      <p className="text-[10px] text-scholar-400 font-mono mt-0.5">
                        ID: {b.id.slice(0, 12)}...
                      </p>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div>
                      <span className="font-semibold text-ink">{b.institute.name}</span>
                      <p className="text-[10px] text-scholar-400">
                        {b.institute._count?.branches ?? 1} total branch
                        {(b.institute._count?.branches ?? 1) !== 1 ? "es" : ""}
                      </p>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div>
                      <span className="text-scholar-700 font-medium">{b.institute.ownerName}</span>
                      <p className="text-[11px] text-scholar-400">{b.institute.email}</p>
                      {b.contact && (
                        <p className="flex items-center gap-1 text-[10px] text-scholar-500">
                          <Phone size={10} /> {b.contact}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div>
                      <p className="text-[11px] font-medium text-scholar-700 flex items-center gap-1 truncate max-w-[180px]">
                        <MapPin size={11} className="shrink-0 text-scholar-400" />
                        {[b.city, b.state].filter(Boolean).join(", ") || "—"}
                      </p>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-scholar-600 hover:underline mt-0.5"
                      >
                        <span>Check Map</span>
                        <ExternalLink size={9} />
                      </a>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <Badge
                      tone={
                        b.status === "ACTIVE"
                          ? "success"
                          : b.status === "PENDING_APPROVAL"
                          ? "warn"
                          : "danger"
                      }
                    >
                      {b.status === "PENDING_APPROVAL" ? "Pending Review" : b.status}
                    </Badge>
                  </td>

                  <td className="py-3 pl-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openVerification(b)}
                        className="inline-flex items-center gap-1 rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 hover:border-scholar-300 shadow-xs transition cursor-pointer"
                        title="Verify Sub-Branch Details"
                      >
                        <ShieldCheck size={13} className="text-scholar-600" />
                        <span>Verify</span>
                      </button>

                      {b.status === "PENDING_APPROVAL" ? (
                        <button
                          onClick={() => setStatusTarget({ branch: b, action: "GRANT" })}
                          disabled={busyId === b.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition disabled:opacity-50 cursor-pointer"
                          title="Grant Sub-Branch Access"
                        >
                          <CheckCircle2 size={13} />
                          {busyId === b.id ? "Granting..." : "Grant Access"}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setStatusTarget({
                              branch: b,
                              action: b.status === "ACTIVE" ? "DEACTIVATE" : "REACTIVATE",
                            })
                          }
                          disabled={busyId === b.id || b.isMainBranch}
                          className={
                            b.status === "ACTIVE"
                              ? "inline-flex items-center gap-1 rounded-lg border border-danger-500/20 bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-600 hover:bg-danger-100 disabled:opacity-50 cursor-pointer"
                              : "inline-flex items-center gap-1 rounded-lg border border-success-500/20 bg-success-50 px-2.5 py-1.5 text-xs font-medium text-success-600 hover:bg-success-100 disabled:opacity-50 cursor-pointer"
                          }
                        >
                          {b.status === "ACTIVE" ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                          {busyId === b.id ? "Working..." : b.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Building2 size={28} className="text-scholar-300" />
          <p className="text-sm text-scholar-400">No sub-branches found matching criteria.</p>
        </div>
      )}

      {/* Verification Drawer */}
      <BranchVerificationDrawer
        branch={selectedBranch}
        open={verificationDrawerOpen}
        onClose={() => {
          setVerificationDrawerOpen(false);
          setSelectedBranch(null);
        }}
        onAccessGranted={(updatedBranch) => {
          setBranches((prev) =>
            prev.map((b) => (b.id === updatedBranch.id ? { ...b, status: "ACTIVE" } : b))
          );
          router.refresh();
        }}
        onStatusChanged={(updatedBranch, newStatus) => {
          setBranches((prev) =>
            prev.map((b) => (b.id === updatedBranch.id ? { ...b, status: newStatus } : b))
          );
          router.refresh();
        }}
      />

      {/* Status Confirmation Dialog */}
      <ConfirmDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={executeStatusChange}
        title={
          statusTarget?.action === "GRANT"
            ? "Grant Sub-Branch Access"
            : statusTarget?.action === "DEACTIVATE"
            ? "Deactivate Sub-Branch"
            : "Re-activate Sub-Branch"
        }
        message={
          statusTarget ? (
            statusTarget.action === "GRANT" ? (
              <span>
                Grant access to sub-branch <strong>&ldquo;{statusTarget.branch.name}&rdquo;</strong> for{" "}
                <strong>{statusTarget.branch.institute.name}</strong>? An approval confirmation email will be sent to the institute owner and branch manager.
              </span>
            ) : statusTarget.action === "DEACTIVATE" ? (
              <span>
                Are you sure you want to deactivate sub-branch <strong>&ldquo;{statusTarget.branch.name}&rdquo;</strong>?
              </span>
            ) : (
              <span>
                Are you sure you want to reactivate sub-branch <strong>&ldquo;{statusTarget.branch.name}&rdquo;</strong>?
              </span>
            )
          ) : null
        }
        confirmLabel={
          statusTarget?.action === "GRANT"
            ? "Grant Access"
            : statusTarget?.action === "DEACTIVATE"
            ? "Deactivate Branch"
            : "Re-activate Branch"
        }
        cancelLabel="Cancel"
        tone={
          statusTarget?.action === "GRANT"
            ? "success"
            : statusTarget?.action === "DEACTIVATE"
            ? "danger"
            : "info"
        }
        loading={!!busyId}
      />
    </div>
  );
}

