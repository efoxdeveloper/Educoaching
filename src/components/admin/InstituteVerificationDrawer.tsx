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
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";

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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2, fontSize: "0.75rem", color: "#171A21" }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.75rem" }}>
            {error}
          </Alert>
        )}

        {/* Top Status & Verification Badge Banner — MUI Paper */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: "16px",
            borderColor:
              institute.status === "PENDING_APPROVAL"
                ? "#FDE68A"
                : institute.status === "ACTIVE"
                ? "#A7F3D0"
                : "#FECACA",
            bgcolor:
              institute.status === "PENDING_APPROVAL"
                ? "rgba(255,251,235,0.8)"
                : institute.status === "ACTIVE"
                ? "rgba(236,253,245,0.8)"
                : "rgba(254,242,242,0.8)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                variant="rounded"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  bgcolor:
                    institute.status === "PENDING_APPROVAL"
                      ? "#D97706"
                      : institute.status === "ACTIVE"
                      ? "#059669"
                      : "#DC2626",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                <Building2 size={22} />
              </Avatar>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem" }}>{institute.name}</Typography>
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
                </Box>
                <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                  <Clock size={12} style={{ color: "#94A3B8" }} />
                  Requested on: {formatDate(institute.createdAt)} ({new Date(institute.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                </Typography>
              </Box>
            </Box>

            <Button
              size="small"
              variant="outlined"
              startIcon={copiedField === "fullSummary" ? <Check size={13} style={{ color: "#059669" }} /> : <Copy size={13} />}
              onClick={copyFullVerificationSummary}
              sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", color: copiedField === "fullSummary" ? "#059669" : "#334155", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.75, px: 1.5, alignSelf: { xs: "flex-start", sm: "auto" } }}
            >
              {copiedField === "fullSummary" ? "Copied Summary!" : "Copy Verification Summary"}
            </Button>
          </Box>
        </Paper>

        {/* Section 1: Owner Identity & Direct Verification Contacts */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1.25, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <User size={15} style={{ color: "#4E6E93" }} />
              Owner & Applicant Identity
            </Typography>
            <Chip label="Role: Primary Owner" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 700, bgcolor: "#EEF2F7", color: "#1E3A5F", border: "1px solid #D6E0EB" }} />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.5)", borderColor: "#D6E0EB" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Owner Full Name</Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem" }}>{institute.ownerName}</Typography>
                <IconButton size="small" onClick={() => copyToClipboard(institute.ownerName, "ownerName")} sx={{ color: "#7E9BBC", width: 24, height: 24 }}>
                  {copiedField === "ownerName" ? <Check size={13} style={{ color: "#059669" }} /> : <Copy size={13} />}
                </IconButton>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.5)", borderColor: "#D6E0EB" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Official Email Address</Typography>
                <Chip label={institute.emailVerified ? "Verified" : "Unverified"} size="small" sx={{ height: 16, fontSize: "9px", fontWeight: 700, bgcolor: institute.emailVerified ? "#ECFDF5" : "#FFFBEB", color: institute.emailVerified ? "#065f46" : "#92400e", border: institute.emailVerified ? "1px solid #A7F3D0" : "1px solid #FDE68A" }} />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography component="a" href={`mailto:${institute.email}`} variant="caption" sx={{ fontWeight: 600, color: "#334155", fontSize: "0.75rem", textDecoration: "none", "&:hover": { textDecoration: "underline" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Mail size={12} style={{ color: "#94A3B8" }} />
                  {institute.email}
                </Typography>
                <IconButton size="small" onClick={() => copyToClipboard(institute.email, "email")} sx={{ color: "#7E9BBC", width: 24, height: 24, ml: 1 }}>
                  {copiedField === "email" ? <Check size={13} style={{ color: "#059669" }} /> : <Copy size={13} />}
                </IconButton>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.5)", borderColor: "#D6E0EB", gridColumn: "1 / -1" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Mobile Contact & Verification Checks</Typography>
                <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC" }}>10-Digit Mobile</Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Phone size={14} style={{ color: "#4E6E93" }} />
                  <Typography component="a" href={`tel:${institute.mobile}`} variant="body2" sx={{ fontWeight: 800, color: "#171A21", fontSize: "0.875rem", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{institute.mobile}</Typography>
                  <IconButton size="small" onClick={() => copyToClipboard(institute.mobile, "mobile")} sx={{ color: "#7E9BBC", width: 24, height: 24 }}>
                    {copiedField === "mobile" ? <Check size={13} style={{ color: "#059669" }} /> : <Copy size={13} />}
                  </IconButton>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" startIcon={<MessageSquare size={12} />} href={whatsappUrl} target="_blank" component="a" sx={{ borderRadius: "8px", bgcolor: "#059669", fontWeight: 700, fontSize: "11px", textTransform: "none", py: 0.5, px: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#047857" } }}>
                    WhatsApp Owner
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<Phone size={12} />} href={`tel:${institute.mobile}`} component="a" sx={{ borderRadius: "8px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontWeight: 700, fontSize: "11px", textTransform: "none", py: 0.5, px: 1.5 }}>
                    Call Phone
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Box>
        </Paper>

        {/* Section 2: Physical Branch Location & Entity Legitimacy */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1.25, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Building2 size={15} style={{ color: "#4E6E93" }} />
              Institute Entity & Physical Location
            </Typography>
            <Button size="small" startIcon={<ExternalLink size={11} />} href={googleMapsUrl} target="_blank" component="a" sx={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "none", p: 0, minWidth: 0 }}>
              Check on Google Maps
            </Button>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.5)", borderColor: "#D6E0EB", gridColumn: "1 / -1" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Physical Branch Address & City</Typography>
                {institute.address && (
                  <IconButton size="small" onClick={() => copyToClipboard(institute.address || "", "address")} sx={{ color: "#7E9BBC", width: 20, height: 20 }}>
                    {copiedField === "address" ? <Check size={13} style={{ color: "#059669" }} /> : <Copy size={13} />}
                  </IconButton>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <MapPin size={14} style={{ color: "#4E6E93", marginTop: 2, flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem" }}>
                    {institute.address || <Box component="span" sx={{ color: "#94A3B8", fontStyle: "italic", fontWeight: 400, fontSize: "0.75rem" }}>No address specified</Box>}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#475569", fontSize: "0.75rem" }}>{[institute.city, institute.state].filter(Boolean).join(", ") || (!institute.address ? "Location not specified" : "")}</Typography>
                </Box>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Tax PAN / GSTIN / Registration ID</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", mt: 0.5 }}>
                {taxNumber ? (
                  <Box component="span" sx={{ fontFamily: "monospace", bgcolor: "white", px: 1, py: 0.25, borderRadius: "6px", border: "1px solid #D6E0EB" }}>{taxNumber}</Box>
                ) : (
                  <Box component="span" sx={{ color: "#94A3B8", fontStyle: "italic", fontWeight: 400 }}>Not provided during signup</Box>
                )}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Inquiry / Helpline Phone</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", mt: 0.5 }}>{institute.guidePhone || institute.mobile}</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Academic Session</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", mt: 0.5 }}>{institute.academicYearLabel || "To be set in Setup Wizard"}</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Selected Plan & Billing</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Chip label={`${institute.billingCycle} · ${institute.platformSubscriptionStatus}`} size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 700, bgcolor: "#EEF2F7", border: "1px solid #D6E0EB" }} />
                {institute.currentPeriodAmount && (
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem" }}>{formatCurrency(institute.currentPeriodAmount)}</Typography>
                )}
              </Box>
            </Paper>
          </Box>
        </Paper>

        {/* Section 3: Branches Submitted on Signup */}
        {institute.branches && institute.branches.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1, mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
                <Building2 size={15} style={{ color: "#4E6E93" }} />
                Configured Branches ({institute.branches.length})
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ maxHeight: 160, overflowY: "auto", pr: 0.5 }}>
              {institute.branches.map((b) => (
                <Paper key={b.id} variant="outlined" sx={{ p: 1.25, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.name} {b.city ? `(${b.city})` : ""}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.address || "No street address"} {b.contact ? `• Tel: ${b.contact}` : ""}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, ml: 1 }}>
                    {b.isMainBranch && <Chip label="Main Branch" size="small" sx={{ height: 18, fontSize: "9px", fontWeight: 700, bgcolor: "#1E3A5F", color: "white" }} />}
                    <Chip label={b.status} size="small" sx={{ height: 18, fontSize: "9px", fontWeight: 700, bgcolor: b.status === "ACTIVE" ? "#ECFDF5" : "#FFFBEB", color: b.status === "ACTIVE" ? "#065f46" : "#92400e", border: b.status === "ACTIVE" ? "1px solid #A7F3D0" : "1px solid #FDE68A" }} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Platform Admin Action Controls — restyle-only, keep onImpersonate/onOpenFeatures exactly */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.4)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
            <ShieldCheck size={15} style={{ color: "#4E6E93" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b" }}>Platform Admin Access Controls</Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {institute.status === "PENDING_APPROVAL" ? (
              <Button
                fullWidth
                variant="contained"
                startIcon={actionLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" } as any} /> : <CheckCircle2 size={14} />}
                onClick={() => setConfirmActionTarget("GRANT")}
                disabled={actionLoading}
                sx={{ borderRadius: "12px", bgcolor: "#059669", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#047857" } }}
              >
                Verify & Grant Access (Send Welcome Email)
              </Button>
            ) : (
              <>
                {onImpersonate && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Eye size={13} />}
                    onClick={() => onImpersonate(institute)}
                    sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", py: 1, px: 1.75 }}
                  >
                    Impersonate Dashboard
                  </Button>
                )}

                {onOpenFeatures && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SlidersHorizontal size={13} />}
                    onClick={() => onOpenFeatures(institute)}
                    sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", py: 1, px: 1.75 }}
                  >
                    Feature Flags
                  </Button>
                )}

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={institute.status === "ACTIVE" ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                  onClick={() => setConfirmActionTarget(institute.status === "ACTIVE" ? "SUSPEND" : "REACTIVATE")}
                  disabled={actionLoading}
                  sx={{
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "none",
                    py: 1,
                    px: 1.75,
                    bgcolor: institute.status === "ACTIVE" ? "#FEF2F2" : "#ECFDF5",
                    color: institute.status === "ACTIVE" ? "#DC2626" : "#059669",
                    borderColor: institute.status === "ACTIVE" ? "#FECACA" : "#A7F3D0",
                    "&:hover": { bgcolor: institute.status === "ACTIVE" ? "#FEE2E2" : "#D1FAE5" },
                  }}
                >
                  {institute.status === "ACTIVE" ? "Suspend Account" : "Reactivate Account"}
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* Confirmation Dialog — keep executeStatusAction exactly */}
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
