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
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";

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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 2 }}>
        {/* Top Header Overview — MUI Paper */}
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", borderColor: "#D6E0EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar variant="rounded" sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "white", color: "#1E3A5F", border: "1px solid #D6E0EB" }}>
              <Building2 size={18} />
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem" }}>{branch.name}</Typography>
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
                  <Chip label="Main Branch" size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: "#E2E8F0", color: "#334155" }} />
                )}
              </Box>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
                Authenticity &amp; Physical Infrastructure Check
              </Typography>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" icon={<AlertTriangle size={15} />} sx={{ borderRadius: "12px", fontSize: "0.75rem" }}>
            {error}
          </Alert>
        )}

        {/* Verification Status Alert — MUI Alert */}
        {isPending ? (
          <Alert
            severity="warning"
            icon={<Clock size={18} />}
            sx={{ borderRadius: "12px", bgcolor: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400e", fontSize: "0.75rem" }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#92400e", fontSize: "0.75rem", display: "block" }}>
              Sub-Branch Access Request Under Verification
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#92400e", display: "block", mt: 0.5, lineHeight: 1.5 }}>
              Verify the physical address, branch phone number, and parent institute ownership to ensure this campus is genuine and operational before granting full access.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<MapPin size={12} />}
                endIcon={<ExternalLink size={11} />}
                href={googleMapsUrl}
                target="_blank"
                component="a"
                sx={{ borderRadius: "8px", borderColor: "#FDE68A", bgcolor: "white", color: "#92400e", fontWeight: 600, fontSize: "11px", textTransform: "none", py: 0.5, px: 1.5 }}
              >
                Check Physical Address on Google Maps
              </Button>
              {whatsappBranchUrl && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<MessageSquare size={12} />}
                  endIcon={<ExternalLink size={11} />}
                  href={whatsappBranchUrl}
                  target="_blank"
                  component="a"
                  sx={{ borderRadius: "8px", bgcolor: "#059669", fontWeight: 600, fontSize: "11px", textTransform: "none", py: 0.5, px: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#047857" } }}
                >
                  WhatsApp Branch Manager
                </Button>
              )}
            </Stack>
          </Alert>
        ) : (
          <Alert
            severity="success"
            icon={<CheckCircle2 size={16} />}
            sx={{ borderRadius: "12px", bgcolor: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065f46", fontSize: "0.75rem" }}
            action={
              <Button
                size="small"
                startIcon={<MapPin size={12} />}
                endIcon={<ExternalLink size={10} />}
                href={googleMapsUrl}
                target="_blank"
                component="a"
                sx={{ fontSize: "11px", fontWeight: 600, color: "#065f46", textTransform: "none", p: 0, minWidth: 0 }}
              >
                View on Maps
              </Button>
            }
          >
            Sub-branch access is <Box component="span" sx={{ fontWeight: 700 }}>Active</Box>. Campus is operating under parent institute.
          </Alert>
        )}

        {/* SECTION 1: Sub-Branch Physical Location & Maps */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1.25, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <MapPin size={14} style={{ color: "#4E6E93" }} />
              1. Physical Campus &amp; Location Check
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC", fontFamily: "monospace" }}>ID: {branch.id}</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.5)", borderColor: "#D6E0EB", gridColumn: "1 / -1" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", display: "block", mb: 0.5 }}>
                Full Physical Campus Address
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem" }}>
                {fullAddress || "No physical street address specified yet"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<MapPin size={12} />}
                  endIcon={<ExternalLink size={11} />}
                  href={googleMapsUrl}
                  target="_blank"
                  component="a"
                  sx={{ borderRadius: "8px", bgcolor: "#1E3A5F", fontSize: "0.70rem", fontWeight: 600, textTransform: "none", py: 0.5, px: 1.5, boxShadow: "none" }}
                >
                  Open in Google Maps
                </Button>
                {fullAddress && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={copiedField === "branch_address" ? <Check size={12} style={{ color: "#059669" }} /> : <Copy size={12} />}
                    onClick={() => copyToClipboard(fullAddress, "branch_address")}
                    sx={{ borderRadius: "8px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontSize: "0.70rem", fontWeight: 500, textTransform: "none", py: 0.5, px: 1.5 }}
                  >
                    {copiedField === "branch_address" ? "Copied Address" : "Copy Address"}
                  </Button>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>City / District</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", mt: 0.5 }}>{branch.city || "—"}</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>State / Region</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", mt: 0.5 }}>{branch.state || "—"}</Typography>
            </Paper>
          </Box>
        </Paper>

        {/* SECTION 2: Sub-Branch Direct Contact & Verification */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1.25, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Phone size={14} style={{ color: "#4E6E93" }} />
              2. Branch Direct Contact &amp; Helpline
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC" }}>Direct Incharge Line</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Branch Phone / Mobile</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem", mt: 0.5 }}>{branch.contact || "—"}</Typography>
              {branch.contact && (
                <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", alignItems: "center" }}>
                  <Button size="small" variant="outlined" startIcon={<Phone size={10} />} href={`tel:${branch.contact}`} component="a" sx={{ borderRadius: "8px", fontSize: "11px", fontWeight: 600, textTransform: "none", py: 0.25, px: 1, borderColor: "#D6E0EB", bgcolor: "white", color: "#334155" }}>
                    Call Direct
                  </Button>
                  {whatsappBranchUrl && (
                    <Button size="small" variant="outlined" startIcon={<MessageSquare size={10} />} href={whatsappBranchUrl} target="_blank" component="a" sx={{ borderRadius: "8px", fontSize: "11px", fontWeight: 600, textTransform: "none", py: 0.25, px: 1, borderColor: "#A7F3D0", bgcolor: "#ECFDF5", color: "#065f46" }}>
                      WhatsApp
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => copyToClipboard(branch.contact!, "branch_phone")} sx={{ ml: "auto", color: "#7E9BBC", width: 24, height: 24 }}>
                    {copiedField === "branch_phone" ? <Check size={12} style={{ color: "#059669" }} /> : <Copy size={12} />}
                  </IconButton>
                </Stack>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC" }}>Branch Student Helpline</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem", mt: 0.5 }}>{branch.guidePhone || "—"}</Typography>
              {branch.guidePhone && (
                <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<Phone size={10} />} href={`tel:${branch.guidePhone}`} component="a" sx={{ borderRadius: "8px", fontSize: "11px", fontWeight: 600, textTransform: "none", py: 0.25, px: 1, borderColor: "#D6E0EB", bgcolor: "white", color: "#334155" }}>
                    Call Helpline
                  </Button>
                  <IconButton size="small" onClick={() => copyToClipboard(branch.guidePhone!, "guide_phone")} sx={{ ml: "auto", color: "#7E9BBC", width: 24, height: 24 }}>
                    {copiedField === "guide_phone" ? <Check size={12} style={{ color: "#059669" }} /> : <Copy size={12} />}
                  </IconButton>
                </Stack>
              )}
            </Paper>
          </Box>
        </Paper>

        {/* SECTION 3: Parent Institute Ownership & Authority */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1.25, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <ShieldCheck size={14} style={{ color: "#4E6E93" }} />
              3. Parent Institute Authority Check
            </Typography>
            <Chip label={branch.institute.platformSubscriptionStatus || "ACTIVE"} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: "#F5F3FF", color: "#6D28D9", border: "1px solid #DDD6FE" }} />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>Parent Institute Legal Name</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", mt: 0.5 }}>{branch.institute.name}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>Institute Owner / Managing Trustee</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", mt: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                <User size={12} style={{ color: "#4E6E93" }} />
                {branch.institute.ownerName}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>Owner Verified Email</Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
                <Typography component="a" href={`mailto:${branch.institute.email}`} variant="caption" sx={{ fontWeight: 600, color: "#334155", fontSize: "0.75rem", textDecoration: "none", "&:hover": { textDecoration: "underline" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {branch.institute.email}
                </Typography>
                <IconButton size="small" onClick={() => copyToClipboard(branch.institute.email, "owner_email")} sx={{ color: "#7E9BBC", width: 24, height: 24, ml: 1 }}>
                  {copiedField === "owner_email" ? <Check size={12} style={{ color: "#059669" }} /> : <Copy size={12} />}
                </IconButton>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB" }}>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>Owner Verified Mobile</Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem" }}>{branch.institute.mobile}</Typography>
                <Stack direction="row" spacing={0.5}>
                  {whatsappOwnerUrl && (
                    <IconButton size="small" href={whatsappOwnerUrl} target="_blank" component="a" sx={{ bgcolor: "#ECFDF5", color: "#059669", width: 24, height: 24, "&:hover": { bgcolor: "#D1FAE5" } }} title="WhatsApp Institute Owner">
                      <MessageSquare size={12} />
                    </IconButton>
                  )}
                  <IconButton size="small" href={`tel:${branch.institute.mobile}`} component="a" sx={{ bgcolor: "#EEF2F7", color: "#334155", width: 24, height: 24, "&:hover": { bgcolor: "#D6E0EB" } }} title="Call Institute Owner">
                    <Phone size={12} />
                  </IconButton>
                </Stack>
              </Box>
            </Paper>
          </Box>
        </Paper>

        {/* SECTION 4: Sub-Branch Credentials & Access Accounts */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1.25, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <KeyRound size={14} style={{ color: "#4E6E93" }} />
              4. Branch Staff &amp; Dedicated Credentials
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC" }}>{branch.users?.length || 0} user{(branch.users?.length || 0) !== 1 ? "s" : ""} registered</Typography>
          </Box>

          {branch.users && branch.users.length > 0 ? (
            <Stack spacing={1}>
              {branch.users.map((u) => (
                <Paper key={u.id} variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem" }}>{u.name || "Branch Incharge"}</Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "11px", color: "#475569" }}>{u.email}</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Chip label={u.role} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: "#E2E8F0", color: "#334155" }} />
                    <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC", display: "block", mt: 0.5 }}>Added {formatDate(u.createdAt)}</Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Alert severity="info" sx={{ borderRadius: "12px", fontSize: "0.75rem", bgcolor: "rgba(238,242,247,0.5)", border: "1px dashed #D6E0EB" }}>
              No dedicated sub-branch login created yet. Main branch administrators will manage this branch via branch impersonation.
            </Alert>
          )}
        </Paper>

        {/* SECTION 5: Operational Scope & Activity */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1.25, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Layers size={14} style={{ color: "#4E6E93" }} />
              5. Operations &amp; Resource Scope
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC" }}>Created {formatDate(branch.createdAt)}</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, textAlign: "center" }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)" }}>
              <Users size={16} style={{ color: "#4E6E93", margin: "0 auto" }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#171A21", fontSize: "1.125rem", mt: 0.5 }}>{branch._count.students}</Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>Students Enrolled</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)" }}>
              <Layers size={16} style={{ color: "#4E6E93", margin: "0 auto" }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#171A21", fontSize: "1.125rem", mt: 0.5 }}>{branch._count.batches}</Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>Assigned Batches</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)" }}>
              <GraduationCap size={16} style={{ color: "#4E6E93", margin: "0 auto" }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#171A21", fontSize: "1.125rem", mt: 0.5 }}>{branch._count.faculty}</Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC" }}>Faculty Allocated</Typography>
            </Paper>
          </Box>
        </Paper>

        {/* Action Controls — restyle-only */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderWidth: 2, borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.4)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b" }}>
              Platform Verification Actions
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={copiedField === "full_summary" ? <Check size={12} style={{ color: "#059669" }} /> : <Copy size={12} />}
              onClick={handleCopySummary}
              sx={{ borderRadius: "8px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontWeight: 600, fontSize: "11px", textTransform: "none", py: 0.5, px: 1.5 }}
            >
              {copiedField === "full_summary" ? "Dossier Copied" : "Copy Verification Dossier"}
            </Button>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {isPending ? (
              <Button
                fullWidth
                variant="contained"
                startIcon={actionLoading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" } as any} /> : <CheckCircle2 size={15} />}
                onClick={handleGrantAccess}
                disabled={actionLoading}
                sx={{ borderRadius: "12px", bgcolor: "#059669", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#047857" } }}
              >
                Verify &amp; Grant Sub-Branch Access
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={actionLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" } as any} /> : branch.status === "ACTIVE" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                onClick={handleToggleStatus}
                disabled={actionLoading}
                sx={{
                  borderRadius: "12px",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  py: 1.25,
                  px: 2,
                  bgcolor: branch.status === "ACTIVE" ? "#FEF2F2" : "#059669",
                  color: branch.status === "ACTIVE" ? "#DC2626" : "white",
                  borderColor: branch.status === "ACTIVE" ? "#FECACA" : "#059669",
                  "&:hover": { bgcolor: branch.status === "ACTIVE" ? "#FEE2E2" : "#047857" },
                }}
              >
                {branch.status === "ACTIVE" ? "Deactivate Sub-Branch" : "Reactivate Sub-Branch"}
              </Button>
            )}

            <Button variant="outlined" onClick={onClose} sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#475569", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1.25, px: 2, bgcolor: "white" }}>
              Close
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Drawer>
  );
}
