"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  ShieldCheck,
  Ban,
  Eye,
  SlidersHorizontal,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export type AdminInstituteDetail = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  mobile: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING_APPROVAL";
  billingCycle: "TRIAL" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  platformSubscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED";
  currentPeriodAmount: string | null;
  trialEndsAt: string;
  currentPeriodEnd: string | null;
  createdAt: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  academicYearLabel?: string | null;
  guidePhone?: string | null;
  settings?: any;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  branches?: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
    address?: string | null;
    contact?: string | null;
    guidePhone?: string | null;
    isMainBranch: boolean;
    status: string;
  }[];
  users?: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  files?: {
    id: string;
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
  }[];
  _count: { students: number; batches: number; faculty: number; branches?: number };
};

export function InstituteVerificationDrawer({
  institute,
  open,
  onClose,
  onAccessGranted,
  onStatusChanged,
  onImpersonate,
  onOpenFeatures,
}: {
  institute: AdminInstituteDetail | null;
  open: boolean;
  onClose: () => void;
  onAccessGranted?: (inst: AdminInstituteDetail) => void;
  onStatusChanged?: (inst: AdminInstituteDetail, newStatus: "ACTIVE" | "SUSPENDED") => void;
  onImpersonate?: (inst: AdminInstituteDetail) => void;
  onOpenFeatures?: (inst: AdminInstituteDetail) => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmActionTarget, setConfirmActionTarget] = useState<"GRANT" | "SUSPEND" | "REACTIVATE" | null>(null);

  if (!institute) return null;

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const cleanMobile = institute.mobile.replace(/\D/g, "");
  const whatsappNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${institute.ownerName}, this is the Platform Verification Team regarding your registration for "${institute.name}".`
  )}`;

  const mapQuery = encodeURIComponent(
    `${institute.name}, ${institute.address || ""} ${institute.city || ""} ${institute.state || ""}`.trim()
  );
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const taxNumber = institute.settings?.taxNumber || institute.settings?.gstin || null;

  const executeStatusAction = async () => {
    if (!confirmActionTarget) return;

    setActionLoading(true);
    setError("");
    try {
      const nextStatus = confirmActionTarget === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
      const res = await fetch(`/api/admin/institutes/${institute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update institute status");
      }

      setConfirmActionTarget(null);

      if (confirmActionTarget === "GRANT") {
        if (onAccessGranted) onAccessGranted(institute);
      } else {
        if (onStatusChanged) onStatusChanged(institute, nextStatus);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error performing action");
    } finally {
      setActionLoading(false);
    }
  };

  const copyFullVerificationSummary = () => {
    const summary = `--- INSTITUTE SIGNUP VERIFICATION REPORT ---
Institute: ${institute.name}
Status: ${institute.status}
Registered At: ${new Date(institute.createdAt).toLocaleString("en-IN")}

OWNER IDENTITY:
Name: ${institute.ownerName}
Email: ${institute.email} (${institute.emailVerified ? "Verified" : "Pending Verification"})
Mobile: ${institute.mobile}
Guide / Helpline: ${institute.guidePhone || "N/A"}

LOCATION & ENTITY:
Address: ${institute.address || "N/A"}, ${institute.city || "N/A"}, ${institute.state || "N/A"}
GSTIN / Tax ID: ${taxNumber || "N/A"}
Academic Session: ${institute.academicYearLabel || "N/A"}

BRANCHES:
${
  institute.branches && institute.branches.length > 0
    ? institute.branches
        .map(
          (b, idx) =>
            `${idx + 1}. ${b.name} (${b.isMainBranch ? "Main Branch" : "Sub-Branch"}) - ${b.city || "N/A"}, Contact: ${
              b.contact || "N/A"
            }`
        )
        .join("\n")
    : "Main Branch only"
}
---------------------------------------------`;
    copyToClipboard(summary, "fullSummary");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Institute & Owner Verification"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 pb-6 text-xs text-ink">
        {error && (
          <div className="rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger-700 border border-danger-200">
            {error}
          </div>
        )}

        {/* Top Status & Verification Badge Banner */}
        <div
          className={`rounded-2xl p-4 border transition-all ${
            institute.status === "PENDING_APPROVAL"
              ? "bg-amber-50/80 border-amber-200"
              : institute.status === "ACTIVE"
              ? "bg-emerald-50/80 border-emerald-200"
              : "bg-danger-50/80 border-danger-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-2xs ${
                  institute.status === "PENDING_APPROVAL"
                    ? "bg-amber-600"
                    : institute.status === "ACTIVE"
                    ? "bg-emerald-600"
                    : "bg-danger-600"
                }`}
              >
                <Building2 size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink">{institute.name}</h3>
                  <Badge
                    tone={
                      institute.status === "ACTIVE"
                        ? "success"
                        : institute.status === "PENDING_APPROVAL"
                        ? "warn"
                        : "danger"
                    }
                  >
                    {institute.status === "PENDING_APPROVAL" ? "PENDING REVIEW" : institute.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-scholar-500 mt-0.5 flex items-center gap-1.5">
                  <Clock size={12} className="text-scholar-400" />
                  <span>Requested on: {formatDate(institute.createdAt)} ({new Date(institute.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={copyFullVerificationSummary}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-scholar-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs cursor-pointer"
            >
              {copiedField === "fullSummary" ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span className="text-emerald-700">Copied Summary!</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-scholar-500" />
                  <span>Copy Verification Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 1: Owner Identity & Direct Verification Contacts */}
        <div className="rounded-2xl border border-scholar-200 bg-white p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-scholar-100 pb-2.5">
            <h4 className="font-bold text-xs text-scholar-800 flex items-center gap-1.5">
              <User size={15} className="text-scholar-600" />
              <span>Owner & Applicant Identity</span>
            </h4>
            <span className="rounded-md bg-scholar-100 px-2 py-0.5 text-[10px] font-bold text-scholar-800">
              Role: Primary Owner
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Owner Name */}
            <div className="p-2.5 rounded-xl bg-scholar-50/60 border border-scholar-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-scholar-400 block mb-0.5">
                Owner Full Name
              </span>
              <p className="font-bold text-ink text-sm flex items-center justify-between">
                <span>{institute.ownerName}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(institute.ownerName, "ownerName")}
                  className="text-scholar-400 hover:text-scholar-700 cursor-pointer p-0.5"
                  title="Copy Name"
                >
                  {copiedField === "ownerName" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </p>
            </div>

            {/* Email Address */}
            <div className="p-2.5 rounded-xl bg-scholar-50/60 border border-scholar-100">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-scholar-400">
                  Official Email Address
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    institute.emailVerified
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {institute.emailVerified ? "Verified" : "Unverified"}
                </span>
              </div>
              <div className="flex items-center justify-between font-semibold text-ink">
                <a
                  href={`mailto:${institute.email}`}
                  className="hover:text-scholar-600 hover:underline truncate text-xs flex items-center gap-1"
                >
                  <Mail size={12} className="text-scholar-400 shrink-0" />
                  <span className="truncate">{institute.email}</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(institute.email, "email")}
                  className="text-scholar-400 hover:text-scholar-700 cursor-pointer p-0.5 shrink-0 ml-1"
                  title="Copy Email"
                >
                  {copiedField === "email" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Mobile Contact with WhatsApp Verification Link */}
            <div className="p-2.5 rounded-xl bg-scholar-50/60 border border-scholar-100 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-scholar-400">
                  Mobile Contact & Verification Checks
                </span>
                <span className="text-[10px] text-scholar-500">10-Digit Mobile</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-scholar-500" />
                  <a
                    href={`tel:${institute.mobile}`}
                    className="font-black text-sm text-ink hover:underline tracking-wide"
                  >
                    {institute.mobile}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(institute.mobile, "mobile")}
                    className="text-scholar-400 hover:text-scholar-700 cursor-pointer p-0.5"
                    title="Copy Phone"
                  >
                    {copiedField === "mobile" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                  >
                    <MessageSquare size={12} />
                    <span>WhatsApp Owner</span>
                  </a>
                  <a
                    href={`tel:${institute.mobile}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-[11px] font-bold text-scholar-700 shadow-2xs hover:bg-scholar-50 transition-colors"
                  >
                    <Phone size={12} />
                    <span>Call Phone</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Physical Campus Location & Entity Legitimacy */}
        <div className="rounded-2xl border border-scholar-200 bg-white p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-scholar-100 pb-2.5">
            <h4 className="font-bold text-xs text-scholar-800 flex items-center gap-1.5">
              <Building2 size={15} className="text-scholar-600" />
              <span>Institute Entity & Physical Location</span>
            </h4>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-scholar-600 hover:underline flex items-center gap-1"
            >
              <span>Check on Google Maps</span>
              <ExternalLink size={11} />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Address & City */}
            <div className="p-2.5 rounded-xl bg-scholar-50/60 border border-scholar-100 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-scholar-400">
                  Physical Campus Address & City
                </span>
                {institute.address && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(institute.address || "", "address")}
                    className="text-scholar-400 hover:text-scholar-700 cursor-pointer p-0.5"
                    title="Copy Address"
                  >
                    {copiedField === "address" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
              <div className="font-semibold text-ink text-xs flex items-start gap-1.5">
                <MapPin size={14} className="text-scholar-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-ink text-sm">
                    {institute.address || <span className="text-scholar-400 italic font-normal text-xs">No address specified</span>}
                  </p>
                  <p className="text-scholar-600 text-xs">
                    {[institute.city, institute.state].filter(Boolean).join(", ") || (!institute.address ? "Location not specified" : "")}
                  </p>
                </div>
              </div>
            </div>

            {/* GSTIN / Tax ID */}
            <div className="p-2.5 rounded-xl bg-scholar-50/60 border border-scholar-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-scholar-400 block mb-0.5">
                Tax PAN / GSTIN / Registration ID
              </span>
              <p className="font-bold text-ink text-xs">
                {taxNumber ? (
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-scholar-200">
                    {taxNumber}
                  </span>
                ) : (
                  <span className="text-scholar-400 italic font-normal">Not provided during signup</span>
                )}
              </p>
            </div>

            {/* Helpline / Guide Phone */}
            <div className="p-2.5 rounded-xl bg-scholar-50/60 border border-scholar-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-scholar-400 block mb-0.5">
                Inquiry / Helpline Phone
              </span>
              <p className="font-bold text-ink text-xs">
                {institute.guidePhone || institute.mobile}
              </p>
            </div>

            {/* Academic Session */}
            <div className="p-2.5 rounded-xl bg-scholar-50/60 border border-scholar-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-scholar-400 block mb-0.5">
                Academic Session
              </span>
              <p className="font-bold text-ink text-xs">
                {institute.academicYearLabel || "To be set in Setup Wizard"}
              </p>
            </div>

            {/* Subscription Cadence */}
            <div className="p-2.5 rounded-xl bg-scholar-50/60 border border-scholar-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-scholar-400 block mb-0.5">
                Selected Plan & Billing
              </span>
              <div className="flex items-center gap-1.5">
                <Badge tone="scholar">
                  {institute.billingCycle} &middot; {institute.platformSubscriptionStatus}
                </Badge>
                {institute.currentPeriodAmount && (
                  <span className="text-xs font-bold text-ink">
                    {formatCurrency(institute.currentPeriodAmount)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Branch Campuses Submitted on Signup */}
        {institute.branches && institute.branches.length > 0 && (
          <div className="rounded-2xl border border-scholar-200 bg-white p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-scholar-100 pb-2">
              <h4 className="font-bold text-xs text-scholar-800 flex items-center gap-1.5">
                <Building2 size={15} className="text-scholar-600" />
                <span>Configured Campus Branches ({institute.branches.length})</span>
              </h4>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {institute.branches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-scholar-50/60 p-2 rounded-xl border border-scholar-100 text-xs"
                >
                  <div className="truncate max-w-[240px]">
                    <p className="font-bold text-ink truncate">
                      {b.name} {b.city ? `(${b.city})` : ""}
                    </p>
                    <p className="text-[10px] text-scholar-500 truncate">
                      {b.address || "No street address"} {b.contact ? `• Tel: ${b.contact}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {b.isMainBranch && (
                      <span className="rounded bg-scholar-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Main Branch
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        b.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Admin Action Controls */}
        <div className="rounded-2xl border border-scholar-200 bg-scholar-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-scholar-800 flex items-center gap-1">
              <ShieldCheck size={15} className="text-scholar-600" />
              <span>Platform Admin Access Controls</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {institute.status === "PENDING_APPROVAL" ? (
              <button
                type="button"
                onClick={() => setConfirmActionTarget("GRANT")}
                disabled={actionLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Verify & Grant Access (Send Welcome Email)</span>
              </button>
            ) : (
              <>
                {onImpersonate && (
                  <button
                    type="button"
                    onClick={() => onImpersonate(institute)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-bold text-scholar-700 shadow-2xs hover:bg-scholar-50 transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Impersonate Dashboard</span>
                  </button>
                )}

                {onOpenFeatures && (
                  <button
                    type="button"
                    onClick={() => onOpenFeatures(institute)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-bold text-scholar-700 shadow-2xs hover:bg-scholar-50 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal size={13} />
                    <span>Feature Flags</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setConfirmActionTarget(institute.status === "ACTIVE" ? "SUSPEND" : "REACTIVATE")
                  }
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors shadow-2xs cursor-pointer ${
                    institute.status === "ACTIVE"
                      ? "bg-danger-50 text-danger-700 border border-danger-200 hover:bg-danger-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {institute.status === "ACTIVE" ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                  <span>{institute.status === "ACTIVE" ? "Suspend Account" : "Reactivate Account"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmActionTarget}
        onClose={() => setConfirmActionTarget(null)}
        onConfirm={executeStatusAction}
        title={
          confirmActionTarget === "GRANT"
            ? "Grant Platform Access"
            : confirmActionTarget === "SUSPEND"
            ? "Suspend Institute Account"
            : "Re-activate Institute Account"
        }
        message={
          confirmActionTarget === "GRANT" ? (
            <span>
              Grant access to <strong>{institute.name}</strong>? The owner (
              <strong>{institute.ownerName}</strong> &lt;{institute.email}&gt;) will receive an access granted welcome email with sign-in instructions.
            </span>
          ) : confirmActionTarget === "SUSPEND" ? (
            <span>
              Are you sure you want to suspend <strong>{institute.name}</strong>? Staff and student logins will be temporarily blocked.
            </span>
          ) : (
            <span>
              Are you sure you want to reactivate <strong>{institute.name}</strong>? Full operational access will be restored.
            </span>
          )
        }
        confirmLabel={
          confirmActionTarget === "GRANT"
            ? "Grant Access Now"
            : confirmActionTarget === "SUSPEND"
            ? "Suspend Account"
            : "Re-activate Account"
        }
        cancelLabel="Cancel"
        tone={
          confirmActionTarget === "GRANT"
            ? "success"
            : confirmActionTarget === "SUSPEND"
            ? "danger"
            : "info"
        }
        loading={actionLoading}
      />
    </Drawer>
  );
}
