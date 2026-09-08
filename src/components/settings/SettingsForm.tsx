"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Image as ImageIcon, Loader2, Trash2, Upload, Globe, Copy, Check, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BranchesSection } from "@/components/settings/BranchesSection";
import { SecurityCredentialsSection } from "@/components/settings/SecurityCredentialsSection";
import { SmsGatewaySection } from "@/components/settings/SmsGatewaySection";
import { type InstituteSettings } from "@/lib/institute-settings";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";

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
      <Card sx={{ p: 5, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25 }}>
        <CircularProgress size={18} sx={{ color: "#4E6E93" }} />
        <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>Loading institute profile...</Typography>
      </Card>
    );
  }

  if (!profile || !settings) {
    return (
      <Card sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.875rem" }}>{error || "Couldn't load institute profile."}</Alert>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box component="form" onSubmit={handleSaveProfile} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.875rem" }}>
            {error}
          </Alert>
        )}
        {saved && (
          <Alert severity="success" sx={{ borderRadius: "12px", fontSize: "0.875rem" }}>
            Changes saved.
          </Alert>
        )}

        {/* Branding — Avatar for logo preview */}
        <Card sx={{ p: 3 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <ImageIcon size={18} style={{ color: "#7E9BBC" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Branding</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
            <Avatar
              src={profile.logo ? `/api/files/${profile.logo.id}` : undefined}
              variant="rounded"
              sx={{ width: 80, height: 80, borderRadius: "16px", border: "1px solid #D6E0EB", bgcolor: "#F8FAFC", color: "#7E9BBC" }}
            >
              {!profile.logo && <Building2 size={28} />}
            </Avatar>
            {canManage && (
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={handleLogoSelect}
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={logoBusy}
                  startIcon={logoBusy ? <CircularProgress size={15} /> : <Upload size={15} />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#171A21", fontWeight: 600, fontSize: "0.80rem", textTransform: "none", bgcolor: "white", "&:hover": { bgcolor: "#F8FAFC" } }}
                >
                  {profile.logo ? "Replace logo" : "Upload logo"}
                </Button>
                {profile.logo && (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={logoBusy}
                    startIcon={<Trash2 size={15} />}
                    onClick={handleRemoveLogo}
                    sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#DC2626", fontWeight: 600, fontSize: "0.80rem", textTransform: "none", bgcolor: "white", "&:hover": { bgcolor: "#FEF2F2", borderColor: "#FECACA" } }}
                  >
                    Remove
                  </Button>
                )}
                <Typography variant="caption" sx={{ width: "100%", fontSize: "0.70rem", color: "#7E9BBC", mt: 0.5 }}>JPG, PNG, or WEBP. Up to 10MB.</Typography>
              </Box>
            )}
          </Box>
        </Card>

        {/* Public Website Admissions Enquiry Form — NOTE: setupCompleted flag NOT touched here; copy link preserved exactly */}
        <Card sx={{ p: 3, borderColor: "rgba(214,224,235,0.8)", background: "linear-gradient(135deg, #ffffff 0%, rgba(238,242,247,0.5) 100%)" }}>
          <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#1E3A5F" }}>
                <Globe size={18} />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Public Admissions Enquiry Page</Typography>
                <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
                  Share this link on your website, WhatsApp, or social media to capture prospective leads directly into CRM.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ mt: 2, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.25, alignItems: { sm: "center" } }}>
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                px: 1.75,
                py: 1.25,
                borderRadius: "12px",
                borderColor: "#D6E0EB",
                bgcolor: "white",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                color: "#1E3A5F",
                overflowX: "auto",
                whiteSpace: "nowrap",
              }}
            >
              {typeof window !== "undefined"
                ? `${window.location.origin}/enquire/${profile?.instituteSlug || profile?.id}`
                : `/enquire/${profile?.instituteSlug || profile?.id}`}
            </Paper>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                startIcon={copiedEnquiryUrl ? <Check size={14} /> : <Copy size={14} />}
                onClick={() => {
                  const url = `${window.location.origin}/enquire/${profile?.instituteSlug || profile?.id}`;
                  navigator.clipboard.writeText(url);
                  setCopiedEnquiryUrl(true);
                  setTimeout(() => setCopiedEnquiryUrl(false), 2500);
                }}
                sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", px: 2, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
              >
                {copiedEnquiryUrl ? "Copied to Clipboard!" : "Copy Link"}
              </Button>
              <Button
                component="a"
                href={`/enquire/${profile?.instituteSlug || profile?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                size="small"
                startIcon={<ExternalLink size={14} />}
                sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#334155", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", px: 1.75, py: 1.25, bgcolor: "white", "&:hover": { bgcolor: "#F8FAFC" } }}
              >
                Preview
              </Button>
            </Stack>
          </Box>
        </Card>

        {/* Profile */}
        <Card sx={{ p: 3 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <Building2 size={18} style={{ color: "#7E9BBC" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Institute profile</Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Institute name"
              fullWidth
              size="small"
              required
              value={form.name}
              disabled={!canManage}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
            <TextField
              label="Academic session"
              fullWidth
              size="small"
              value={form.academicYearLabel}
              disabled={!canManage}
              onChange={(e) => setForm((f) => ({ ...f, academicYearLabel: e.target.value }))}
              placeholder="e.g. 2026-27"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
            <TextField
              label="Tax / GST Number (Optional)"
              fullWidth
              size="small"
              value={form.taxNumber}
              disabled={!canManage}
              onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))}
              placeholder="e.g. 07AAAAA0000A1Z5"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.4)", display: "flex", flexDirection: "column", gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.applyGst}
                    disabled={!canManage}
                    onChange={(e) => setForm((f) => ({ ...f, applyGst: e.target.checked }))}
                    size="small"
                    sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }}
                  />
                }
                label={<Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21" }}>Enable GST Tax on Fee Receipts</Typography>}
                sx={{ m: 0 }}
              />
              {form.applyGst && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569" }}>GST Rate (%):</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={form.gstPercent}
                    disabled={!canManage}
                    onChange={(e) => setForm((f) => ({ ...f, gstPercent: Number(e.target.value) }))}
                    slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } as any }}
                    sx={{ width: 80, "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "white", fontSize: "0.875rem", fontWeight: 600 } }}
                  />
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>(Printed on PDF receipts)</Typography>
                </Box>
              )}
            </Paper>
            <TextField
              label="Central Guide / Admission Counselor Helpline"
              fullWidth
              size="small"
              value={form.guidePhone}
              disabled={!canManage}
              onChange={(e) => setForm((f) => ({ ...f, guidePhone: e.target.value }))}
              placeholder="e.g. +91 98765 00000 (Helpline for parents & students)"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
            <TextField label="Owner" fullWidth size="small" value={profile.ownerName} disabled slotProps={{ inputLabel: { shrink: true } }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F8FAFC" } }} />
            <TextField label="Contact email" fullWidth size="small" value={profile.email} disabled slotProps={{ inputLabel: { shrink: true } }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F8FAFC" } }} />
            <TextField label="Contact mobile" fullWidth size="small" value={profile.mobile} disabled slotProps={{ inputLabel: { shrink: true } }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F8FAFC" } }} />
            <TextField
              label="Address"
              fullWidth
              size="small"
              value={form.address}
              disabled={!canManage}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Institute address"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
            <TextField
              label="City"
              fullWidth
              size="small"
              value={form.city}
              disabled={!canManage}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="e.g. Meerut"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
            <TextField
              label="State"
              fullWidth
              size="small"
              value={form.state}
              disabled={!canManage}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="e.g. Uttar Pradesh"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
          </Box>
          <Typography variant="caption" sx={{ mt: 1.5, display: "block", fontSize: "0.75rem", color: "#7E9BBC" }}>
            Contact mobile is tied to your account record. To change your login email or password, use the Security & Credentials section below.
          </Typography>
        </Card>

        {canManage && (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
              sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.875rem", textTransform: "none", px: 3, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
            >
              Save changes
            </Button>
          </Box>
        )}
      </Box>

      {/* Security & Credentials (Email and Password verification) */}
      <SecurityCredentialsSection
        currentEmail={profile.email}
        ownerName={profile.ownerName}
        canManage={canManage}
      />

      {/* SMS Gateway (BYOK) */}
      <SmsGatewaySection canManage={canManage} />

      <BranchesSection canManage={canManage} />
    </Box>
  );
}
