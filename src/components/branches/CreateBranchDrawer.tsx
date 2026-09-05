"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export type BranchItem = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  contact: string | null;
  guidePhone?: string | null;
  inChargeName?: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  isMainBranch?: boolean;
  studentCount?: number;
  batchCount?: number;
  leadCount?: number;
  totalCollected?: number;
  totalPendingFee?: number;
  totalExpenses?: number;
  netProfit?: number;
};

export function CreateBranchDrawer({
  open,
  onClose,
  branchToEdit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  branchToEdit?: BranchItem | null;
  onSaved: (branch: any) => void;
}) {
  const [name, setName] = useState("");
  const [inChargeName, setInChargeName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [guidePhone, setGuidePhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "PENDING_APPROVAL">("ACTIVE");
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branchToEdit) {
      setName(branchToEdit.name);
      setInChargeName(branchToEdit.inChargeName || "");
      setCity(branchToEdit.city || "");
      setState(branchToEdit.state || "");
      setAddress(branchToEdit.address || "");
      setContact(branchToEdit.contact || "");
      setGuidePhone(branchToEdit.guidePhone || "");
      setEmail("");
      setPassword("");
      setStatus(branchToEdit.status);
      setIsMainBranch(Boolean(branchToEdit.isMainBranch));
    } else {
      setName("");
      setInChargeName("");
      setCity("");
      setState("");
      setAddress("");
      setContact("");
      setGuidePhone("");
      setEmail("");
      setPassword("");
      setStatus("ACTIVE");
      setIsMainBranch(false);
    }
  }, [branchToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Branch name is required");
      return;
    }
    // Match setup wizard validation: Branch In-Charge/Owner Name is mandatory
    if (!inChargeName.trim()) {
      setError("Branch Owner Name is required — matches setup wizard requirement");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isEditing = Boolean(branchToEdit);
      const url = isEditing ? `/api/branches/${branchToEdit!.id}` : "/api/branches";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          inChargeName: inChargeName.trim(),
          city: city.trim() || null,
          state: state.trim() || null,
          address: address.trim() || null,
          contact: contact.trim() || null,
          guidePhone: guidePhone.trim() || null,
          status,
          isMainBranch,
          email: email.trim() || undefined,
          password: password.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save branch");
      }

      const data = await res.json().catch(() => ({}));
      onSaved(data.message);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={branchToEdit ? `Edit Branch: ${branchToEdit.name}` : "Create New Institute Branch"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch / Center Name *">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. South Extension Campus, Kota Center"
              className={inputClass}
            />
          </Field>
          <Field label="Branch Owner Name *">
            <input
              type="text"
              required
              value={inChargeName}
              onChange={(e) => setInChargeName(e.target.value)}
              placeholder="e.g. Rajesh Kumar (Branch In-Charge)"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. New Delhi, Kota, Pune"
              className={inputClass}
            />
          </Field>

          <Field label="State">
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Delhi, Rajasthan"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Physical Address / Street">
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Building, Street, Landmark, Pin code..."
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Helpdesk / Contact Phone">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={contact}
              onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              className={inputClass}
            />
          </Field>

          <Field label="Guide / Counselor Phone">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={guidePhone}
              onChange={(e) => setGuidePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876500000"
              className={inputClass}
            />
          </Field>
        </div>

        {branchToEdit && (
          <Field label="Operational Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL")}
              className={inputClass}
            >
              <option value="ACTIVE">Active Operating Branch</option>
              <option value="INACTIVE">Inactive / Temporarily Closed</option>
              {branchToEdit.status === "PENDING_APPROVAL" && (
                <option value="PENDING_APPROVAL">Pending Platform Admin Approval</option>
              )}
            </select>
          </Field>
        )}

        {!branchToEdit && !isMainBranch && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold text-amber-900 flex items-center gap-1.5">
              ⏳ Platform Admin Access Approval Workflow
            </p>
            <p className="text-[11px] leading-relaxed text-amber-700">
              When this sub-branch is added, an access request is dispatched to the Platform Administrator. Confirmation emails will be sent to you and the Main Branch owner. Access unlocks immediately upon platform administrator approval.
            </p>
          </div>
        )}

        {!branchToEdit && (
          <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">🔑 Sub-Branch Login Credentials</span>
              <span className="text-[11px] text-scholar-500">(Optional / Recommended)</span>
            </div>
            <p className="text-[11px] text-scholar-600 leading-relaxed">
              Create credentials for this branch manager. Once Platform Admin approves the request, the branch manager can sign in using these credentials.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Branch Login Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. branch@vidyalaya.in"
                  className={inputClass}
                />
              </Field>
              <Field label="Branch Login Password">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className={`${inputClass} pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-scholar-400 hover:text-scholar-700 transition p-0.5 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* Main Branch / Head Office Designation */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/70 p-3.5 space-y-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isMainBranch}
              onChange={(e) => setIsMainBranch(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-scholar-300 text-scholar-600 focus:ring-scholar-500"
            />
            <div>
              <span className="text-xs font-bold text-ink">
                🏛️ Main Branch / Head Office (Master Administrative Access)
              </span>
              <p className="text-[11px] text-scholar-500 mt-0.5">
                Staff and administrators at the Main Branch have full access to switch to other branches, monitor enrollments, and make changes to any branch.
              </p>
            </div>
          </label>
        </div>

        <div className="mt-4 flex gap-2 border-t border-scholar-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-200 py-2.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {branchToEdit ? "Update Branch" : "Create Branch"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
