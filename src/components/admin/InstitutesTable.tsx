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
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FeatureFlagsDrawer } from "./FeatureFlagsDrawer";
import {
  InstituteVerificationDrawer,
  type AdminInstituteDetail,
} from "./InstituteVerificationDrawer";
import { formatDate, initials } from "@/lib/utils";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";

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
  const [renewTarget, setRenewTarget] = useState<AdminInstituteDetail | null>(null);
  const [renewPlan, setRenewPlan] = useState<"MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [renewNote, setRenewNote] = useState("");
  const [renewLoading, setRenewLoading] = useState(false);

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

  const executeRenew = async () => {
    if (!renewTarget) return;
    setRenewLoading(true);
    try {
      const res = await fetch(`/api/admin/institutes/${renewTarget.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: renewPlan, note: renewNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to renew subscription");
      setRenewTarget(null);
      setRenewNote("");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to renew");
    } finally {
      setRenewLoading(false);
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ mb: 2.5, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", flex: 1, flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" } }}>
          <TextField
            size="small"
            placeholder="Search by name, owner, email, phone or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} style={{ color: "#7E9BBC" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, maxWidth: { sm: 360 }, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.875rem" } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="admin-status-label" sx={{ fontSize: "0.75rem" }}>Status</InputLabel>
            <Select
              labelId="admin-status-label"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 500 }}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="PENDING_APPROVAL">Pending Approval</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="SUSPENDED">Suspended</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "12px", borderColor: "#D6E0EB", boxShadow: "none" }}>
        <Table sx={{ minWidth: 850 }} size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(238,242,247,0.5)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
              <TableCell>Institute & Owner</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Plan & Status</TableCell>
              <TableCell>Renews / Expires</TableCell>
              <TableCell>Stats</TableCell>
              <TableCell align="right">Verification & Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94A3B8", fontSize: "0.875rem" }}>
                  No institutes match your filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((i) => (
              <TableRow key={i.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.75, pr: 2 } }}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      onClick={() => setVerificationTarget(i)}
                      sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93", fontSize: "0.70rem", fontWeight: 700, cursor: "pointer", "&:hover": { bgcolor: "#D6E0EB" } }}
                      variant="rounded"
                    >
                      {initials(i.name)}
                    </Avatar>
                    <Box>
                      <Typography
                        component="button"
                        onClick={() => setVerificationTarget(i)}
                        sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem", textAlign: "left", bgcolor: "transparent", border: "none", cursor: "pointer", p: 0, "&:hover": { color: "#4E6E93", textDecoration: "underline" } }}
                      >
                        {i.name}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.75rem", color: "#64748b" }}>
                        {i.ownerName} <Box component="span" sx={{ color: "#94A3B8" }}>·</Box> <Box component="span" sx={{ color: "#94A3B8" }}>{i.mobile}</Box>
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                <TableCell>
                  {i.city || i.state || i.address ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, maxWidth: 220 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500, color: "#171A21", fontSize: "0.75rem" }}>
                        <MapPin size={12} style={{ color: "#94A3B8", flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#171A21" }}>{[i.city, i.state].filter(Boolean).join(", ") || "Location set"}</Typography>
                      </Box>
                      {i.address && (
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={i.address}>
                          {i.address}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ fontStyle: "italic", color: "#94A3B8" }}>Not set</Typography>
                  )}
                </TableCell>

                <TableCell>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
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
                    <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC", fontWeight: 500 }}>
                      {i.billingCycle} · {i.platformSubscriptionStatus}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell sx={{ fontSize: "0.75rem", color: "#64748b" }}>{formatDate(i.currentPeriodEnd ?? i.trialEndsAt)}</TableCell>

                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.75rem", color: "#475569" }}>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569" }}>{i._count.students} St.</Typography>
                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>·</Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569" }}>{i._count.batches} Bat.</Typography>
                  </Box>
                </TableCell>

                <TableCell align="right">
                  <Stack direction="row" spacing={0.75} sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ShieldCheck size={13} />}
                      onClick={() => setVerificationTarget(i)}
                      sx={{
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "0.70rem",
                        textTransform: "none",
                        py: 0.5,
                        px: 1.25,
                        borderColor: i.status === "PENDING_APPROVAL" ? "#FDE68A" : "#D6E0EB",
                        bgcolor: i.status === "PENDING_APPROVAL" ? "#FFFBEB" : "white",
                        color: i.status === "PENDING_APPROVAL" ? "#92400e" : "#334155",
                        "&:hover": { bgcolor: i.status === "PENDING_APPROVAL" ? "#FEF3C7" : "#F8FAFC" },
                      }}
                      title="Inspect full owner details, phone, address, and verification profile"
                    >
                      {i.status === "PENDING_APPROVAL" ? "Review Details" : "Verify"}
                    </Button>

                    {i.status === "PENDING_APPROVAL" ? (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CheckCircle2 size={13} />}
                        onClick={() => setStatusTarget({ institute: i, action: "GRANT" })}
                        disabled={busyId === i.id}
                        sx={{ borderRadius: "8px", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.5, bgcolor: "#059669", boxShadow: "none", "&:hover": { bgcolor: "#047857" } }}
                        title="Grant Access and send Welcome Email"
                      >
                        {busyId === i.id ? "Granting..." : "Grant Access"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={impersonatingId === i.id ? <CircularProgress size={13} color="inherit" /> : <Eye size={13} />}
                          onClick={() => handleImpersonate(i)}
                          disabled={impersonatingId === i.id}
                          sx={{ borderRadius: "8px", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.25, borderColor: "#D6E0EB", bgcolor: "#F8FAFC", color: "#334155", "&:hover": { bgcolor: "#EEF2F7" } }}
                          title="Impersonate Institute & Access Dashboard"
                        >
                          Impersonate
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SlidersHorizontal size={13} />}
                          onClick={() => setFeatureTarget(i)}
                          sx={{ borderRadius: "8px", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.25, borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", "&:hover": { bgcolor: "#F8FAFC" } }}
                          title="Control Feature Flags"
                        >
                          Features
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CreditCard size={13} />}
                          onClick={() => {
                            setRenewTarget(i);
                            setRenewPlan("MONTHLY");
                            setRenewNote("");
                          }}
                          sx={{ borderRadius: "8px", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.25, borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", "&:hover": { bgcolor: "#F8FAFC" } }}
                          title="Renew subscription manually (offline) — e.g. cash payment"
                        >
                          Renew manually
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={i.status === "ACTIVE" ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                          onClick={() =>
                            setStatusTarget({
                              institute: i,
                              action: i.status === "ACTIVE" ? "SUSPEND" : "REACTIVATE",
                            })
                          }
                          disabled={busyId === i.id}
                          sx={{
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "0.70rem",
                            textTransform: "none",
                            py: 0.5,
                            px: 1.25,
                            bgcolor: i.status === "ACTIVE" ? "#FEF2F2" : "#ECFDF5",
                            color: i.status === "ACTIVE" ? "#DC2626" : "#059669",
                            borderColor: i.status === "ACTIVE" ? "#FECACA" : "#A7F3D0",
                            "&:hover": { bgcolor: i.status === "ACTIVE" ? "#FEE2E2" : "#D1FAE5" },
                          }}
                        >
                          {busyId === i.id ? "..." : i.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </Button>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {institutes.length === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, py: 5, textAlign: "center" }}>
          <Building2 size={28} style={{ color: "#94A3B8" }} />
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>No institutes have signed up yet.</Typography>
        </Box>
      )}

      {/* Feature Flags Drawer — restyle-only, logic preserved */}
      <FeatureFlagsDrawer
        institute={featureTarget}
        open={!!featureTarget}
        onClose={() => setFeatureTarget(null)}
        onUpdated={() => router.refresh()}
      />

      {/* Institute & Owner Verification Profile Drawer — restyle-only */}
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

      {/* Manual Renewal Dialog (offline fallback when Razorpay not configured) */}
      {renewTarget && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1400,
            p: 2,
          }}
          onClick={() => !renewLoading && setRenewTarget(null)}
        >
          <Paper
            onClick={(e) => e.stopPropagation()}
            sx={{ p: 2.5, borderRadius: "16px", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                <RefreshCw size={16} /> Renew manually — {renewTarget.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.5 }}>
                Current: {renewTarget.billingCycle} · {renewTarget.platformSubscriptionStatus} · renews {formatDate(renewTarget.currentPeriodEnd ?? renewTarget.trialEndsAt)}
              </Typography>
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel id="renew-plan-label">Plan</InputLabel>
              <Select
                labelId="renew-plan-label"
                label="Plan"
                value={renewPlan}
                onChange={(e) => setRenewPlan(e.target.value as any)}
                sx={{ borderRadius: "12px", bgcolor: "white" }}
              >
                <MenuItem value="MONTHLY">Monthly — ₹1,999 / month</MenuItem>
                <MenuItem value="QUARTERLY">Quarterly — ₹5,397 / 3 months</MenuItem>
                <MenuItem value="YEARLY">Yearly — ₹19,190 / year</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Note (optional)"
              placeholder="e.g. cash received, UPI ref, offline payment"
              value={renewNote}
              onChange={(e) => setRenewNote(e.target.value)}
              multiline
              minRows={2}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "11px" }}>
              This will set status to ACTIVE and extend the period using addMonths() (1/3/12 months). Mirrors the student Renewal cash flow.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={() => setRenewTarget(null)}
                disabled={renewLoading}
                sx={{ borderRadius: "12px", textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={executeRenew}
                disabled={renewLoading}
                startIcon={renewLoading ? <CircularProgress size={14} color="inherit" /> : <CreditCard size={14} />}
                sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", boxShadow: "none" }}
              >
                {renewLoading ? "Renewing..." : "Confirm Renewal"}
              </Button>
            </Stack>
          </Paper>
        </Box>
      )}
    </Card>
  );
}
