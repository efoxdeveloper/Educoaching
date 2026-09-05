"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Ban,
  CheckCircle2,
  Building2,
  Eye,
  SlidersHorizontal,
  Loader2,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FeatureFlagsDrawer } from "./FeatureFlagsDrawer";
import {
  InstituteVerificationDrawer,
  type AdminInstituteDetail,
} from "./InstituteVerificationDrawer";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

function subscriptionTone(status: AdminInstituteDetail["platformSubscriptionStatus"]) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "TRIAL") return "warn" as const;
  return "danger" as const;
}

export function InstitutesTable({ institutes }: { institutes: AdminInstituteDetail[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [featureTarget, setFeatureTarget] = useState<AdminInstituteDetail | null>(null);
  const [verificationTarget, setVerificationTarget] = useState<AdminInstituteDetail | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    institute: AdminInstituteDetail;
    action: "SUSPEND" | "REACTIVATE" | "GRANT";
  } | null>(null);

  const filtered = useMemo(() => {
    return institutes.filter((i) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === "" ||
        i.name.toLowerCase().includes(q) ||
        i.ownerName.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.mobile.toLowerCase().includes(q) ||
        (i.city && i.city.toLowerCase().includes(q)) ||
        (i.address && i.address.toLowerCase().includes(q)) ||
        (i.state && i.state.toLowerCase().includes(q));
      const matchesStatus = !statusFilter || i.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [institutes, query, statusFilter]);

  const executeStatusChange = async () => {
    if (!statusTarget) return;
    const { institute, action } = statusTarget;
    const nextStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";

    setBusyId(institute.id);
    try {
      const res = await fetch(`/api/admin/institutes/${institute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setStatusTarget(null);
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleImpersonate = async (institute: AdminInstituteDetail) => {
    setImpersonatingId(institute.id);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instituteId: institute.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Failed to start impersonation");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      alert("Error starting impersonation.");
    } finally {
      setImpersonatingId(null);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 sm:max-w-xs sm:flex-1">
            <Search size={16} className="text-scholar-300" />
            <input
              placeholder="Search by name, owner, email, phone or city"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-scholar-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 text-sm text-scholar-600 outline-none"
          >
            <option value="">All statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead>
            <tr className="border-b border-scholar-100 text-xs font-medium uppercase tracking-wide text-scholar-400">
              <th className="pb-3 pr-4">Institute & Owner</th>
              <th className="pb-3 pr-4">Location</th>
              <th className="pb-3 pr-4">Plan & Status</th>
              <th className="pb-3 pr-4">Renews / Expires</th>
              <th className="pb-3 pr-4">Stats</th>
              <th className="pb-3 pr-4 text-right">Verification & Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-scholar-400">
                  No institutes match your filters.
                </td>
              </tr>
            )}
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-scholar-50 last:border-0 hover:bg-scholar-50/40 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setVerificationTarget(i)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-scholar-50 text-xs font-semibold text-scholar-600 hover:bg-scholar-100 transition-colors cursor-pointer shrink-0"
                      title="Click to view full verification details"
                    >
                      {initials(i.name)}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => setVerificationTarget(i)}
                        className="font-bold text-ink hover:text-scholar-600 hover:underline text-left cursor-pointer"
                      >
                        {i.name}
                      </button>
                      <p className="text-xs text-scholar-500 flex items-center gap-1">
                        <span>{i.ownerName}</span>
                        <span>&middot;</span>
                        <span className="text-scholar-400">{i.mobile}</span>
                      </p>
                    </div>
                  </div>
                </td>

                <td className="py-3 pr-4 text-xs text-scholar-600">
                  {i.city || i.state || i.address ? (
                    <div className="space-y-0.5 max-w-[220px]">
                      <div className="flex items-center gap-1 font-medium text-ink">
                        <MapPin size={12} className="text-scholar-400 shrink-0" />
                        <span>{[i.city, i.state].filter(Boolean).join(", ") || "Location set"}</span>
                      </div>
                      {i.address && (
                        <p className="text-[11px] text-scholar-500 truncate" title={i.address}>
                          {i.address}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-scholar-300 italic">Not set</span>
                  )}
                </td>

                <td className="py-3 pr-4">
                  <div className="flex flex-col gap-1">
                    <Badge
                      tone={
                        i.status === "ACTIVE"
                          ? "success"
                          : i.status === "PENDING_APPROVAL"
                          ? "warn"
                          : "danger"
                      }
                    >
                      {i.status === "PENDING_APPROVAL" ? "PENDING REVIEW" : i.status}
                    </Badge>
                    <span className="text-[10px] text-scholar-400 font-medium">
                      {i.billingCycle} &middot; {i.platformSubscriptionStatus}
                    </span>
                  </div>
                </td>

                <td className="py-3 pr-4 text-xs text-scholar-500">
                  {formatDate(i.currentPeriodEnd ?? i.trialEndsAt)}
                </td>

                <td className="py-3 pr-4 text-xs text-scholar-600">
                  <div className="flex items-center gap-2">
                    <span title="Students">{i._count.students} St.</span>
                    <span>&middot;</span>
                    <span title="Batches">{i._count.batches} Bat.</span>
                  </div>
                </td>

                <td className="py-3 pr-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Always visible Verify Profile button */}
                    <button
                      type="button"
                      onClick={() => setVerificationTarget(i)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                        i.status === "PENDING_APPROVAL"
                          ? "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 font-bold"
                          : "border border-scholar-200 bg-white text-scholar-700 hover:bg-scholar-50"
                      }`}
                      title="Inspect full owner details, phone, address, and verification profile"
                    >
                      <ShieldCheck size={13} className={i.status === "PENDING_APPROVAL" ? "text-amber-700" : "text-scholar-500"} />
                      <span>{i.status === "PENDING_APPROVAL" ? "Review Details" : "Verify"}</span>
                    </button>

                    {i.status === "PENDING_APPROVAL" ? (
                      <button
                        onClick={() => setStatusTarget({ institute: i, action: "GRANT" })}
                        disabled={busyId === i.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        title="Grant Access and send Welcome Email"
                      >
                        <CheckCircle2 size={13} />
                        {busyId === i.id ? "Granting..." : "Grant Access"}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleImpersonate(i)}
                          disabled={impersonatingId === i.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-scholar-200 bg-scholar-50 px-2 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-100 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Impersonate Institute & Access Dashboard"
                        >
                          {impersonatingId === i.id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                          Impersonate
                        </button>

                        <button
                          onClick={() => setFeatureTarget(i)}
                          className="inline-flex items-center gap-1 rounded-lg border border-scholar-200 bg-white px-2 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors cursor-pointer"
                          title="Control Feature Flags"
                        >
                          <SlidersHorizontal size={13} />
                          Features
                        </button>

                        <button
                          onClick={() =>
                            setStatusTarget({
                              institute: i,
                              action: i.status === "ACTIVE" ? "SUSPEND" : "REACTIVATE",
                            })
                          }
                          disabled={busyId === i.id}
                          className={
                            i.status === "ACTIVE"
                              ? "inline-flex items-center gap-1 rounded-lg border border-danger-500/20 bg-danger-50 px-2 py-1.5 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-100 disabled:opacity-50 cursor-pointer"
                              : "inline-flex items-center gap-1 rounded-lg border border-success-500/20 bg-success-50 px-2 py-1.5 text-xs font-medium text-success-600 transition-colors hover:bg-success-100 disabled:opacity-50 cursor-pointer"
                          }
                        >
                          {i.status === "ACTIVE" ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                          {busyId === i.id ? "..." : i.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {institutes.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Building2 size={28} className="text-scholar-300" />
          <p className="text-sm text-scholar-400">No institutes have signed up yet.</p>
        </div>
      )}

      {/* Feature Flags Drawer */}
      <FeatureFlagsDrawer
        institute={featureTarget}
        open={!!featureTarget}
        onClose={() => setFeatureTarget(null)}
        onUpdated={() => router.refresh()}
      />

      {/* Institute & Owner Verification Profile Drawer */}
      <InstituteVerificationDrawer
        institute={verificationTarget}
        open={!!verificationTarget}
        onClose={() => setVerificationTarget(null)}
        onAccessGranted={() => router.refresh()}
        onStatusChanged={() => router.refresh()}
        onImpersonate={(inst) => handleImpersonate(inst)}
        onOpenFeatures={(inst) => {
          setVerificationTarget(null);
          setFeatureTarget(inst);
        }}
      />

      {/* Confirmation Dialog for Status Changes */}
      <ConfirmDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={executeStatusChange}
        title={
          statusTarget?.action === "GRANT"
            ? "Grant Platform Access"
            : statusTarget?.action === "SUSPEND"
            ? "Suspend Institute Account"
            : "Re-activate Institute Account"
        }
        message={
          statusTarget ? (
            statusTarget.action === "GRANT" ? (
              <span>
                Grant access to <strong>{statusTarget.institute.name}</strong>? The owner (
                <strong>{statusTarget.institute.ownerName}</strong> &lt;{statusTarget.institute.email}&gt;) will receive an access granted welcome email with sign-in instructions.
              </span>
            ) : statusTarget.action === "SUSPEND" ? (
              <span>
                Are you sure you want to suspend <strong>{statusTarget.institute.name}</strong>? Staff and student logins for this institute will be temporarily blocked.
              </span>
            ) : (
              <span>
                Are you sure you want to reactivate <strong>{statusTarget.institute.name}</strong>? Full operational access will be restored.
              </span>
            )
          ) : null
        }
        confirmLabel={
          statusTarget?.action === "GRANT"
            ? "Grant Access Now"
            : statusTarget?.action === "SUSPEND"
            ? "Suspend Account"
            : "Re-activate Account"
        }
        cancelLabel="Cancel"
        tone={
          statusTarget?.action === "GRANT"
            ? "success"
            : statusTarget?.action === "SUSPEND"
            ? "danger"
            : "info"
        }
        loading={!!busyId}
      />
    </Card>
  );
}