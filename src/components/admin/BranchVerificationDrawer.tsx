"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  ShieldCheck,
  Ban,
  Loader2,
  Clock,
  Sparkles,
  Users,
  GraduationCap,
  Layers,
  KeyRound,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export type AdminBranchDetail = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  contact: string | null;
  guidePhone: string | null;
  isMainBranch: boolean;
  status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  createdAt: string;
  institute: {
    id: string;
    name: string;
    ownerName: string;
    email: string;
    mobile: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    status?: string;
    billingCycle?: string;
    platformSubscriptionStatus?: string;
    createdAt?: string;
    _count?: {
      branches: number;
      students: number;
      faculty: number;
      batches: number;
    };
  };
  users?: {
    id: string;
    name: string;
    email: string;
    role: string;
    mobile?: string | null;
    createdAt: string;
  }[];
  _count: {
    students: number;
    batches: number;
    faculty: number;
  };
};

export function BranchVerificationDrawer({
  branch,
  open,
  onClose,
  onAccessGranted,
  onStatusChanged,
}: {
  branch: AdminBranchDetail | null;
  open: boolean;
  onClose: () => void;
  onAccessGranted?: (branch: AdminBranchDetail) => void;
  onStatusChanged?: (branch: AdminBranchDetail, newStatus: "ACTIVE" | "INACTIVE") => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  if (!branch) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fullAddress = [branch.address, branch.city, branch.state]
    .filter(Boolean)
    .join(", ");

  const cleanPhone = (phone?: string | null) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "").slice(-10);
  };

  const branchPhoneDigits = cleanPhone(branch.contact || branch.guidePhone);
  const ownerPhoneDigits = cleanPhone(branch.institute.mobile);

  const googleMapsUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${branch.name}, ${fullAddress}`
      )}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${branch.name} ${branch.city || ""} ${branch.state || ""}`
      )}`;

  const whatsappBranchUrl = branchPhoneDigits
    ? `https://wa.me/91${branchPhoneDigits}?text=${encodeURIComponent(
        `Hello, this is Platform Administration verifying the sub-branch application for "${branch.name}" under "${branch.institute.name}". Please confirm your physical campus address and center incharge details.`
      )}`
    : null;

  const whatsappOwnerUrl = ownerPhoneDigits
    ? `https://wa.me/91${ownerPhoneDigits}?text=${encodeURIComponent(
        `Hello ${branch.institute.ownerName}, Platform Administration is verifying your sub-branch request for "${branch.name}".`
      )}`
    : null;

  const handleGrantAccess = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to grant access");
      }
      const updated = await res.json();
      if (onAccessGranted) onAccessGranted({ ...branch, status: "ACTIVE" });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to grant access");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = branch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update status");
      }
      if (onStatusChanged) onStatusChanged(branch, nextStatus);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopySummary = () => {
    const summary = `=== SUB-BRANCH VERIFICATION DOSSIER ===
Sub-Branch: ${branch.name}
Status: ${branch.status}
Physical Address: ${fullAddress || "Not provided"}
Branch Contact: ${branch.contact || "Not provided"}
Helpline: ${branch.guidePhone || "Not provided"}

--- PARENT INSTITUTE ---
Institute: ${branch.institute.name}
Owner: ${branch.institute.ownerName}
Owner Email: ${branch.institute.email}
Owner Mobile: ${branch.institute.mobile}
Total Branches: ${branch.institute._count?.branches ?? "N/A"}

--- OPERATIONAL CAPACITY ---
Students: ${branch._count.students}
Batches: ${branch._count.batches}
Faculty: ${branch._count.faculty}
Branch Logins: ${branch.users?.length || 0} configured
Created: ${formatDate(branch.createdAt)}
====================================`;

    copyToClipboard(summary, "full_summary");
  };

  const isPending = branch.status === "PENDING_APPROVAL";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Sub-Branch Verification: ${branch.name}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 pb-4">
        {/* Top Header Overview */}
        <div className="flex items-center justify-between rounded-xl bg-scholar-50 p-3 border border-scholar-200/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-scholar-200 text-scholar-800 shadow-2xs">
              <Building2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink">{branch.name}</span>
                <Badge
                  tone={
                    isPending
                      ? "warn"
                      : branch.status === "ACTIVE"
                      ? "success"
                      : "danger"
                  }
                >
                  {branch.status === "PENDING_APPROVAL"
                    ? "Pending Review"
                    : branch.status}
                </Badge>
                {branch.isMainBranch && (
                  <span className="rounded bg-scholar-200/70 px-1.5 py-0.5 text-[10px] font-bold text-scholar-800">
                    Main Campus
                  </span>
                )}
              </div>
              <p className="text-[11px] text-scholar-500 font-normal mt-0.5">
                Authenticity &amp; Physical Infrastructure Check
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertTriangle size={15} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Status Alert */}
        {isPending ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 space-y-2">
            <div className="flex items-start gap-2.5">
              <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Sub-Branch Access Request Under Verification
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Verify the physical address, branch phone number, and parent institute ownership to ensure this campus is genuine and operational before granting full access.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-900 shadow-xs hover:bg-amber-100/50"
              >
                <MapPin size={12} className="text-rose-600" />
                Check Physical Address on Google Maps
                <ExternalLink size={11} className="text-amber-600" />
              </a>
              {whatsappBranchUrl && (
                <a
                  href={whatsappBranchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-emerald-700"
                >
                  <MessageSquare size={12} />
                  WhatsApp Branch Manager
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                Sub-branch access is <strong>Active</strong>. Campus is operating under parent institute.
              </span>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline shrink-0"
            >
              <MapPin size={12} />
              View on Maps
              <ExternalLink size={10} />
            </a>
          </div>
        )}

        {/* SECTION 1: Sub-Branch Physical Location & Maps */}
        <div className="rounded-2xl border border-scholar-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-scholar-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
              <MapPin size={14} className="text-scholar-600" />
              1. Physical Campus &amp; Location Check
            </h3>
            <span className="text-[10px] text-scholar-400 font-mono">ID: {branch.id}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="md:col-span-2 rounded-xl bg-scholar-50/70 p-3 border border-scholar-200/70">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-scholar-500">
                Full Physical Campus Address
              </p>
              <p className="text-xs font-bold text-ink mt-0.5 select-all">
                {fullAddress || "No physical street address specified yet"}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-scholar-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-scholar-700 transition"
                >
                  <MapPin size={12} />
                  Open in Google Maps
                  <ExternalLink size={11} className="ml-0.5" />
                </a>
                {fullAddress && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(fullAddress, "branch_address")}
                    className="inline-flex items-center gap-1 rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-xs font-medium text-scholar-700 hover:bg-scholar-100 cursor-pointer"
                  >
                    {copiedField === "branch_address" ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span>Copied Address</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-scholar-100 p-2.5">
              <p className="text-[10px] font-semibold text-scholar-500">City / District</p>
              <p className="text-xs font-bold text-ink mt-0.5">{branch.city || "—"}</p>
            </div>

            <div className="rounded-xl border border-scholar-100 p-2.5">
              <p className="text-[10px] font-semibold text-scholar-500">State / Region</p>
              <p className="text-xs font-bold text-ink mt-0.5">{branch.state || "—"}</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Sub-Branch Direct Contact & Verification */}
        <div className="rounded-2xl border border-scholar-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-scholar-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
              <Phone size={14} className="text-scholar-600" />
              2. Branch Direct Contact &amp; Helpline
            </h3>
            <span className="text-[10px] text-scholar-400">Direct Incharge Line</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-scholar-100 bg-scholar-50/40 p-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-scholar-500">
                Branch Phone / Mobile
              </p>
              <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                {branch.contact || "—"}
              </p>
              {branch.contact && (
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href={`tel:${branch.contact}`}
                    className="inline-flex items-center gap-1 rounded bg-scholar-100 px-2 py-0.5 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-200"
                  >
                    <Phone size={10} /> Call Direct
                  </a>
                  {whatsappBranchUrl && (
                    <a
                      href={whatsappBranchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageSquare size={10} /> WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(branch.contact!, "branch_phone")}
                    className="text-scholar-400 hover:text-scholar-700 ml-auto cursor-pointer"
                  >
                    {copiedField === "branch_phone" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-scholar-100 bg-scholar-50/40 p-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-scholar-500">
                Branch Student Helpline
              </p>
              <p className="text-sm font-bold text-ink">
                {branch.guidePhone || "—"}
              </p>
              {branch.guidePhone && (
                <div className="flex items-center gap-1.5 pt-1">
                  <a
                    href={`tel:${branch.guidePhone}`}
                    className="inline-flex items-center gap-1 rounded bg-scholar-100 px-2 py-0.5 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-200"
                  >
                    <Phone size={10} /> Call Helpline
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(branch.guidePhone!, "guide_phone")}
                    className="text-scholar-400 hover:text-scholar-700 ml-auto cursor-pointer"
                  >
                    {copiedField === "guide_phone" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Parent Institute Ownership & Authority */}
        <div className="rounded-2xl border border-scholar-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-scholar-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-scholar-600" />
              3. Parent Institute Authority Check
            </h3>
            <span className="text-[10px] rounded bg-purple-100 px-1.5 py-0.5 font-bold text-purple-800">
              {branch.institute.platformSubscriptionStatus || "ACTIVE"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-scholar-100 p-2.5">
              <p className="text-[10px] font-semibold text-scholar-500">Parent Institute Legal Name</p>
              <p className="text-xs font-bold text-ink mt-0.5">{branch.institute.name}</p>
            </div>

            <div className="rounded-xl border border-scholar-100 p-2.5">
              <p className="text-[10px] font-semibold text-scholar-500">Institute Owner / Managing Trustee</p>
              <p className="text-xs font-bold text-ink mt-0.5 flex items-center gap-1">
                <User size={12} className="text-scholar-500" />
                {branch.institute.ownerName}
              </p>
            </div>

            <div className="rounded-xl border border-scholar-100 p-2.5">
              <p className="text-[10px] font-semibold text-scholar-500">Owner Verified Email</p>
              <div className="flex items-center justify-between mt-0.5">
                <a
                  href={`mailto:${branch.institute.email}`}
                  className="text-xs font-semibold text-scholar-700 hover:underline truncate"
                >
                  {branch.institute.email}
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(branch.institute.email, "owner_email")}
                  className="text-scholar-400 hover:text-scholar-700 ml-1 cursor-pointer"
                >
                  {copiedField === "owner_email" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-scholar-100 p-2.5">
              <p className="text-[10px] font-semibold text-scholar-500">Owner Verified Mobile</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs font-bold text-ink">{branch.institute.mobile}</span>
                <div className="flex items-center gap-1">
                  {whatsappOwnerUrl && (
                    <a
                      href={whatsappOwnerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100"
                      title="WhatsApp Institute Owner"
                    >
                      <MessageSquare size={12} />
                    </a>
                  )}
                  <a
                    href={`tel:${branch.institute.mobile}`}
                    className="rounded bg-scholar-50 p-1 text-scholar-700 hover:bg-scholar-100"
                    title="Call Institute Owner"
                  >
                    <Phone size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Sub-Branch Credentials & Access Accounts */}
        <div className="rounded-2xl border border-scholar-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-scholar-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
              <KeyRound size={14} className="text-scholar-600" />
              4. Branch Staff &amp; Dedicated Credentials
            </h3>
            <span className="text-[10px] text-scholar-400">
              {branch.users?.length || 0} user{branch.users?.length !== 1 ? "s" : ""} registered
            </span>
          </div>

          {branch.users && branch.users.length > 0 ? (
            <div className="divide-y divide-scholar-100 rounded-xl border border-scholar-100 overflow-hidden text-xs">
              {branch.users.map((u) => (
                <div key={u.id} className="p-2.5 bg-scholar-50/40 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink">{u.name || "Branch Incharge"}</p>
                    <p className="text-[11px] text-scholar-500 font-mono">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-scholar-200/80 px-1.5 py-0.5 text-[10px] font-bold text-scholar-800">
                      {u.role}
                    </span>
                    <p className="text-[10px] text-scholar-400 mt-0.5">
                      Added {formatDate(u.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-scholar-500 italic bg-scholar-50/50 p-3 rounded-xl border border-dashed border-scholar-200">
              No dedicated sub-branch login created yet. Main campus administrators will manage this branch via campus impersonation.
            </p>
          )}
        </div>

        {/* SECTION 5: Operational Scope & Activity */}
        <div className="rounded-2xl border border-scholar-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-scholar-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
              <Layers size={14} className="text-scholar-600" />
              5. Operations &amp; Resource Scope
            </h3>
            <span className="text-[10px] text-scholar-400">
              Created {formatDate(branch.createdAt)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3">
              <Users size={16} className="mx-auto text-scholar-600 mb-1" />
              <p className="text-lg font-black text-ink">{branch._count.students}</p>
              <p className="text-[10px] font-semibold text-scholar-500">Students Enrolled</p>
            </div>
            <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3">
              <Layers size={16} className="mx-auto text-scholar-600 mb-1" />
              <p className="text-lg font-black text-ink">{branch._count.batches}</p>
              <p className="text-[10px] font-semibold text-scholar-500">Assigned Batches</p>
            </div>
            <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3">
              <GraduationCap size={16} className="mx-auto text-scholar-600 mb-1" />
              <p className="text-lg font-black text-ink">{branch._count.faculty}</p>
              <p className="text-[10px] font-semibold text-scholar-500">Faculty Allocated</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="rounded-2xl border-2 border-scholar-200 bg-scholar-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-scholar-800">
              Platform Verification Actions
            </h4>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-100 cursor-pointer shadow-xs"
            >
              {copiedField === "full_summary" ? (
                <>
                  <Check size={12} className="text-emerald-600" />
                  <span>Dossier Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy Verification Dossier</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isPending ? (
              <button
                type="button"
                onClick={handleGrantAccess}
                disabled={actionLoading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Verify &amp; Grant Sub-Branch Access
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold shadow disabled:opacity-50 transition cursor-pointer ${
                  branch.status === "ACTIVE"
                    ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {actionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : branch.status === "ACTIVE" ? (
                  <Ban size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {branch.status === "ACTIVE"
                  ? "Deactivate Sub-Branch"
                  : "Reactivate Sub-Branch"}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-scholar-200 bg-white px-4 py-2.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-100 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
