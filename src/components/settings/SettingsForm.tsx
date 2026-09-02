"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Image as ImageIcon, Loader2, Trash2, Upload, Globe, Copy, Check, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { BranchesSection } from "@/components/settings/BranchesSection";
import { SecurityCredentialsSection } from "@/components/settings/SecurityCredentialsSection";
import { SmsGatewaySection } from "@/components/settings/SmsGatewaySection";
import { type InstituteSettings } from "@/lib/institute-settings";

type InstituteProfile = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  mobile: string;
  address: string | null;
  city: string | null;
  state: string | null;
  academicYearLabel: string | null;
  guidePhone: string | null;
  instituteSlug?: string | null;
  settings: InstituteSettings;
  logo: { id: string; fileName: string; mimeType: string } | null;
  billingCycle?: "TRIAL" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  platformSubscriptionStatus?: "TRIAL" | "ACTIVE" | "EXPIRED";
  currentPeriodAmount?: number | null;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
};

const MAX_LOGO_BYTES = 10 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function SettingsForm({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<InstituteProfile | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    academicYearLabel: "",
    guidePhone: "",
    taxNumber: "",
    applyGst: false,
    gstPercent: 18,
  });
  const [settings, setSettings] = useState<InstituteSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [copiedEnquiryUrl, setCopiedEnquiryUrl] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/institutes/me");
      if (!res.ok) throw new Error("Failed to load institute profile");
      const data: InstituteProfile = await res.json();
      setProfile(data);
      setForm({
        name: data.name,
        address: data.address ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        academicYearLabel: data.academicYearLabel ?? "",
        guidePhone: data.guidePhone ?? "",
        taxNumber: data.settings?.taxNumber ?? "",
        applyGst: Boolean(data.settings?.applyGst),
        gstPercent: data.settings?.gstPercent ?? 18,
      });
      setSettings(data.settings);
    } catch {
      setError("Couldn't load institute profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const updatedSettings = settings
        ? {
            ...settings,
            taxNumber: form.taxNumber.trim() || undefined,
            applyGst: form.applyGst,
            gstPercent: Number(form.gstPercent) || 18,
          }
        : undefined;

      const res = await fetch("/api/institutes/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          city: form.city,
          state: form.state,
          academicYearLabel: form.academicYearLabel,
          guidePhone: form.guidePhone,
          settings: updatedSettings,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save changes");
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError("Logo must be a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be under 10MB.");
      return;
    }

    setLogoBusy(true);
    try {
      // Replace, don't stack: an institute has one current logo, so clear
      // the old FileAsset (if any) before uploading the new one.
      if (profile?.logo) {
        await fetch(`/api/files/${profile.logo.id}`, { method: "DELETE" });
      }

      const body = new FormData();
      body.append("file", file);
      body.append("category", "INSTITUTE_LOGO");
      body.append("relatedType", "Institute");
      if (profile) body.append("relatedId", profile.id);

      const res = await fetch("/api/files", { method: "POST", body });
      if (!res.ok) throw new Error("Failed to upload logo");
      await load();
    } catch {
      setError("Failed to upload logo.");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!profile?.logo) return;
    setLogoBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/files/${profile.logo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove logo");
      await load();
    } catch {
      setError("Failed to remove logo.");
    } finally {
      setLogoBusy(false);
    }
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 p-10 text-sm text-scholar-400">
        <Loader2 size={18} className="animate-spin" /> Loading institute profile...
      </Card>
    );
  }

  if (!profile || !settings) {
    return (
      <Card className="p-6 text-sm text-danger-600">{error || "Couldn't load institute profile."}</Card>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSaveProfile} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl border border-success-100 bg-success-50 px-4 py-3 text-sm text-success-600">
            Changes saved.
          </div>
        )}

        {/* Branding */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon size={18} className="text-scholar-400" />
            <h2 className="font-display text-base font-semibold text-ink">Branding</h2>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-scholar-100 bg-scholar-50">
              {profile.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${profile.logo.id}`} alt="Institute logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 size={28} className="text-scholar-300" />
              )}
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-100 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-scholar-50 disabled:opacity-50"
                >
                  <Upload size={15} /> {profile.logo ? "Replace logo" : "Upload logo"}
                </button>
                {profile.logo && (
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-100 bg-white px-3 py-2 text-sm font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-50"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                )}
                <p className="w-full text-xs text-scholar-400">JPG, PNG, or WEBP. Up to 10MB.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Public Website Admissions Enquiry Form */}
        <Card className="p-6 border-scholar-200/80 bg-gradient-to-br from-white to-scholar-50/50">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-scholar-100 text-scholar-800">
                <Globe size={18} />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink">Public Admissions Enquiry Page</h2>
                <p className="text-xs text-scholar-500">
                  Share this link on your website, WhatsApp, or social media to capture prospective leads directly into CRM.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 font-mono text-xs text-scholar-800 shadow-2xs select-all overflow-x-auto">
              {typeof window !== "undefined"
                ? `${window.location.origin}/enquire/${profile?.instituteSlug || profile?.id}`
                : `/enquire/${profile?.instituteSlug || profile?.id}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/enquire/${profile?.instituteSlug || profile?.id}`;
                  navigator.clipboard.writeText(url);
                  setCopiedEnquiryUrl(true);
                  setTimeout(() => setCopiedEnquiryUrl(false), 2500);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-scholar-700 transition-colors cursor-pointer"
              >
                {copiedEnquiryUrl ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedEnquiryUrl ? "Copied to Clipboard!" : "Copy Link"}</span>
              </button>
              <a
                href={`/enquire/${profile?.instituteSlug || profile?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2.5 text-xs font-bold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs"
              >
                <ExternalLink size={14} />
                <span>Preview</span>
              </a>
            </div>
          </div>
        </Card>

        {/* Profile */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-scholar-400" />
            <h2 className="font-display text-base font-semibold text-ink">Institute profile</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Institute name">
              <input
                className={inputClass}
                value={form.name}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Academic session">
              <input
                className={inputClass}
                placeholder="e.g. 2026-27"
                value={form.academicYearLabel}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, academicYearLabel: e.target.value }))}
              />
            </Field>
            <Field label="Tax / GST Number (Optional)">
              <input
                className={inputClass}
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={form.taxNumber}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))}
              />
            </Field>
            <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.applyGst}
                  disabled={!canManage}
                  onChange={(e) => setForm((f) => ({ ...f, applyGst: e.target.checked }))}
                  className="rounded border-scholar-300 text-scholar-600 focus:ring-scholar-500 h-4 w-4"
                />
                <span>Enable GST Tax on Fee Receipts</span>
              </label>
              {form.applyGst && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-scholar-600">GST Rate (%):</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={form.gstPercent}
                    disabled={!canManage}
                    onChange={(e) => setForm((f) => ({ ...f, gstPercent: Number(e.target.value) }))}
                    className="w-20 rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-xs text-ink font-semibold"
                  />
                  <span className="text-[11px] text-scholar-500">(Printed on PDF receipts)</span>
                </div>
              )}
            </div>
            <Field label="Central Guide / Admission Counselor Helpline">
              <input
                className={inputClass}
                placeholder="e.g. +91 98765 00000 (Helpline for parents & students)"
                value={form.guidePhone}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, guidePhone: e.target.value }))}
              />
            </Field>
            <Field label="Owner">
              <input className={inputClass} value={profile.ownerName} disabled />
            </Field>
            <Field label="Contact email">
              <input className={inputClass} value={profile.email} disabled />
            </Field>
            <Field label="Contact mobile">
              <input className={inputClass} value={profile.mobile} disabled />
            </Field>
            <Field label="Address">
              <input
                className={inputClass}
                placeholder="Institute address"
                value={form.address}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Field>
            <Field label="City">
              <input
                className={inputClass}
                placeholder="e.g. Meerut"
                value={form.city}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </Field>
            <Field label="State">
              <input
                className={inputClass}
                placeholder="e.g. Uttar Pradesh"
                value={form.state}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </Field>
          </div>
          <p className="mt-3 text-xs text-scholar-400">
            Contact mobile is tied to your account record. To change your login email or password, use the Security & Credentials section below.
          </p>
        </Card>

        {canManage && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-scholar-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-scholar-800 disabled:opacity-50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save changes
            </button>
          </div>
        )}
      </form>

      {/* Security & Credentials (Email and Password verification) */}
      <SecurityCredentialsSection
        currentEmail={profile.email}
        ownerName={profile.ownerName}
        canManage={canManage}
      />

      {/* SMS Gateway (BYOK) */}
      <SmsGatewaySection canManage={canManage} />

      <BranchesSection canManage={canManage} />
    </div>
  );
}