"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

type BranchUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type Branch = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  contact: string | null;
  guidePhone: string | null;
  inChargeName?: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  users?: BranchUser[];
};

const emptyForm = {
  name: "",
  inChargeName: "",
  city: "",
  state: "",
  address: "",
  contact: "",
  guidePhone: "",
  email: "",
  password: "",
};

export function BranchesSection({ canManage }: { canManage: boolean }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // branch id, or "new"
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed to load branches");
      setBranches(await res.json());
    } catch {
      setError("Couldn't load branches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (branch?: Branch) => {
    setError("");
    setSuccessMessage("");
    if (branch) {
      setForm({
        name: branch.name,
        inChargeName: branch.inChargeName ?? "",
        city: branch.city ?? "",
        state: branch.state ?? "",
        address: branch.address ?? "",
        contact: branch.contact ?? "",
        guidePhone: branch.guidePhone ?? "",
        email: branch.users?.[0]?.email ?? "",
        password: "",
      });
      setEditing(branch.id);
    } else {
      setForm(emptyForm);
      setEditing("new");
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    // Match setup wizard: Branch Owner/In-Charge Name is mandatory
    if (!form.name.trim()) {
      setError("Branch name is required");
      return;
    }
    if (!form.inChargeName.trim()) {
      setError("Branch Owner Name is required — matches setup wizard requirement");
      return;
    }
    setSaving(true);
    try {
      const isNew = editing === "new";
      const url = isNew ? "/api/branches" : `/api/branches/${editing}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save branch");
      }
      const data = await res.json().catch(() => ({}));
      await load();
      cancelEdit();
      if (isNew) {
        setSuccessMessage(
          data.message ||
            "Your branch request is in processing. The platform admin has been notified and access will unlock once granted."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branch");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete branch");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete branch");
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-scholar-400" />
          <h2 className="font-display text-base font-semibold text-ink">Branches</h2>
        </div>
        {canManage && editing === null && (
          <button
            type="button"
            onClick={() => startEdit()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-100 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-scholar-50 cursor-pointer"
          >
            <Plus size={15} /> Add branch
          </button>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold flex items-center gap-1.5">
            ⏳ Sub-Branch Request in Processing
          </p>
          <p className="text-xs text-amber-800 mt-1">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-scholar-400">
          <Loader2 size={16} className="animate-spin" /> Loading branches...
        </div>
      ) : (
        <div className="space-y-3">
          {branches.length === 0 && editing === null && (
            <p className="py-4 text-sm text-scholar-400">No branches yet.</p>
          )}

          {branches.map((b) =>
            editing === b.id ? (
              <BranchForm
                key={b.id}
                form={form}
                setForm={setForm}
                onCancel={cancelEdit}
                onSubmit={handleSave}
                saving={saving}
                submitLabel="Save branch"
              />
            ) : (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-scholar-100 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{b.name}</span>
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
                  <p className="mt-0.5 text-xs text-scholar-400">
                    {b.inChargeName ? (
                      <span className="inline-flex items-center text-xs font-semibold text-ink">
                        👤 {b.inChargeName}
                      </span>
                    ) : (
                      <span className="text-[11px] italic">No owner set</span>
                    )}
                    <span className="ml-2">{[b.city, b.state].filter(Boolean).join(", ") || "No location set"}</span>
                    {b.guidePhone && (
                      <span className="ml-2 inline-flex items-center text-[11px] font-medium text-scholar-600">
                        • Guide Helpline: {b.guidePhone}
                      </span>
                    )}
                    {b.users && b.users.length > 0 && (
                      <span className="ml-2 inline-flex items-center text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        🔑 Login: {b.users[0].email}
                      </span>
                    )}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="rounded-lg p-2 text-scholar-400 hover:bg-scholar-50 hover:text-ink"
                      aria-label="Edit branch"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="rounded-lg p-2 text-scholar-400 hover:bg-danger-50 hover:text-danger-600"
                      aria-label="Delete branch"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {editing === "new" && (
            <BranchForm
              form={form}
              setForm={setForm}
              onCancel={cancelEdit}
              onSubmit={handleSave}
              saving={saving}
              submitLabel="Add branch"
            />
          )}
        </div>
      )}
    </Card>
  );
}

function BranchForm({
  form,
  setForm,
  onCancel,
  onSubmit,
  saving,
  submitLabel,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  submitLabel: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-scholar-100 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Branch name *">
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Meerut Branch"
          />
        </Field>
        <Field label="Branch Owner Name *">
          <input
            required
            className={inputClass}
            value={form.inChargeName}
            onChange={(e) => setForm((f) => ({ ...f, inChargeName: e.target.value }))}
            placeholder="e.g. Rajesh Kumar (Branch In-Charge)"
          />
        </Field>
        <Field label="Helpdesk / Office Phone">
          <input
            className={inputClass}
            value={form.contact}
            onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            placeholder="Helpdesk phone or email"
          />
        </Field>
        <Field label="Branch Guide / Counselor Phone">
          <input
            className={inputClass}
            value={form.guidePhone}
            onChange={(e) => setForm((f) => ({ ...f, guidePhone: e.target.value }))}
            placeholder="+91 98765 00000 (Local Guide Helpline)"
          />
        </Field>
        <Field label="City">
          <input
            className={inputClass}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="e.g. Meerut"
          />
        </Field>
        <Field label="State">
          <input
            className={inputClass}
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            placeholder="e.g. Uttar Pradesh"
          />
        </Field>
        <Field label="Address">
          <input
            className={inputClass}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Branch address"
          />
        </Field>
      </div>

      <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">🔑 Sub-Branch Login Credentials</span>
          <span className="text-[11px] text-scholar-500">(Optional / Recommended)</span>
        </div>
        <p className="text-[11px] text-scholar-600 leading-relaxed">
          Create sign-in credentials for this branch manager. Once Platform Admin approves the branch request, the branch administrator can log in directly with these credentials.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Branch Login Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="e.g. meerut@vidyalaya.in"
            />
          </Field>
          <Field label="Branch Login Password">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`${inputClass} pr-9`}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Set sign-in password (min 6 characters)"
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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-sm font-semibold text-scholar-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}