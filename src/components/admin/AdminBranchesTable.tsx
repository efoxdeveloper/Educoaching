"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  CheckCircle2,
  Ban,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/utils";
import {
  BranchVerificationDrawer,
  type AdminBranchDetail,
} from "@/components/admin/BranchVerificationDrawer";
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
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";

export function AdminBranchesTable({
  initialBranches,
}: {
  initialBranches: AdminBranchDetail[];
}) {
  const router = useRouter();
  const [branches, setBranches] = useState<AdminBranchDetail[]>(initialBranches);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    branch: AdminBranchDetail;
    action: "DEACTIVATE" | "REACTIVATE" | "GRANT";
  } | null>(null);

  // Verification Drawer State
  const [selectedBranch, setSelectedBranch] = useState<AdminBranchDetail | null>(null);
  const [verificationDrawerOpen, setVerificationDrawerOpen] = useState(false);

  const openVerification = (branch: AdminBranchDetail) => {
    setSelectedBranch(branch);
    setVerificationDrawerOpen(true);
  };

  const filtered = useMemo(() => {
    return branches.filter((b) => {
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        b.institute.name.toLowerCase().includes(q) ||
        b.institute.ownerName.toLowerCase().includes(q) ||
        b.institute.email.toLowerCase().includes(q);

      const matchesStatus = !statusFilter || b.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [branches, query, statusFilter]);

  const executeStatusChange = async () => {
    if (!statusTarget) return;
    const { branch, action } = statusTarget;
    const nextStatus = action === "DEACTIVATE" ? "INACTIVE" : "ACTIVE";

    setBusyId(branch.id);
    try {
      const res = await fetch(`/api/admin/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setStatusTarget(null);
      if (res.ok) {
        setBranches((prev) =>
          prev.map((b) => (b.id === branch.id ? { ...b, status: nextStatus } : b))
        );
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = branches.filter((b) => b.status === "PENDING_APPROVAL").length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {pendingCount > 0 && (
        <Alert
          severity="warning"
          icon={<Clock size={18} />}
          action={
            <Button
              size="small"
              variant="contained"
              onClick={() => setStatusFilter("PENDING_APPROVAL")}
              sx={{ borderRadius: "8px", bgcolor: "#D97706", fontWeight: 700, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#B45309" } }}
            >
              Review Pending Sub-Branches
            </Button>
          }
          sx={{ borderRadius: "12px", border: "1px solid #FDE68A", bgcolor: "#FFFBEB", color: "#92400e", fontSize: "0.875rem", alignItems: "center" }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#92400e", fontSize: "0.875rem" }}>
            <Box component="span" sx={{ fontWeight: 800 }}>{pendingCount} sub-branch access request{pendingCount > 1 ? "s" : ""}</Box> awaiting platform admin verification and approval.
          </Typography>
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <TextField
          size="small"
          placeholder="Search branch, institute, city, address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={15} style={{ color: "#7E9BBC" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, maxWidth: { sm: 360 }, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem" } }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="admin-branches-status-label" sx={{ fontSize: "0.75rem" }}>Status</InputLabel>
          <Select
            labelId="admin-branches-status-label"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="PENDING_APPROVAL">Pending Review ({pendingCount})</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "16px", borderColor: "#D6E0EB", boxShadow: "none" }}>
        <Table sx={{ minWidth: 900 }} size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(238,242,247,0.6)", "& th": { fontSize: "0.70rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
              <TableCell>Sub-Branch</TableCell>
              <TableCell>Parent Institute</TableCell>
              <TableCell>Owner / Contact</TableCell>
              <TableCell>Location &amp; Maps</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Verification &amp; Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((b) => {
              const fullAddr = [b.address, b.city, b.state].filter(Boolean).join(", ");
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${b.name}, ${fullAddr || b.city || ""}`
              )}`;

              return (
                <TableRow key={b.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                  <TableCell>
                    <Box>
                      <Box
                        component="button"
                        onClick={() => openVerification(b)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          bgcolor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          p: 0,
                          textAlign: "left",
                          "&:hover .branch-name": { color: "#4E6E93", textDecoration: "underline" },
                        }}
                      >
                        <Typography variant="body2" className="branch-name" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem" }}>{b.name}</Typography>
                        {b.isMainBranch && (
                          <Chip label="Main Branch" size="small" sx={{ height: 16, fontSize: "9px", fontWeight: 700, bgcolor: "#F5F3FF", color: "#6D28D9", border: "1px solid #DDD6FE" }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC", fontFamily: "monospace", display: "block", mt: 0.25 }}>
                        ID: {b.id.slice(0, 12)}...
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>{b.institute.name}</Typography>
                    <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC" }}>
                      {b.institute._count?.branches ?? 1} total branch{(b.institute._count?.branches ?? 1) !== 1 ? "es" : ""}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "#334155", fontSize: "0.75rem" }}>{b.institute.ownerName}</Typography>
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{b.institute.email}</Typography>
                    {b.contact && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25, color: "#64748b", fontSize: "10px" }}>
                        <Phone size={10} style={{ color: "#94A3B8" }} /> {b.contact}
                      </Box>
                    )}
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500, color: "#334155", fontSize: "11px" }}>
                        <MapPin size={11} style={{ color: "#94A3B8", flexShrink: 0 }} />
                        {[b.city, b.state].filter(Boolean).join(", ") || "—"}
                      </Box>
                      <Box
                        component="a"
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, fontSize: "10px", fontWeight: 600, color: "#4E6E93", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                      >
                        Check Map <ExternalLink size={9} />
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Badge
                      tone={
                        b.status === "ACTIVE"
                          ? "success"
                          : b.status === "PENDING_APPROVAL"
                          ? "warn"
                          : "danger"
                      }
                    >
                      {b.status === "PENDING_APPROVAL" ? "Pending Review" : b.status}
                    </Badge>
                  </TableCell>

                  <TableCell align="right">
                    <Stack direction="row" spacing={0.75} sx={{ justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ShieldCheck size={13} />}
                        onClick={() => openVerification(b)}
                        sx={{ borderRadius: "8px", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.25, borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", "&:hover": { bgcolor: "#F8FAFC" } }}
                        title="Verify Sub-Branch Details"
                      >
                        Verify
                      </Button>

                      {b.status === "PENDING_APPROVAL" ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircle2 size={13} />}
                          onClick={() => setStatusTarget({ branch: b, action: "GRANT" })}
                          disabled={busyId === b.id}
                          sx={{ borderRadius: "8px", fontWeight: 700, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.5, bgcolor: "#059669", boxShadow: "none", "&:hover": { bgcolor: "#047857" } }}
                          title="Grant Sub-Branch Access"
                        >
                          {busyId === b.id ? "Granting..." : "Grant Access"}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={b.status === "ACTIVE" ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                          onClick={() =>
                            setStatusTarget({
                              branch: b,
                              action: b.status === "ACTIVE" ? "DEACTIVATE" : "REACTIVATE",
                            })
                          }
                          disabled={busyId === b.id || b.isMainBranch}
                          sx={{
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "0.70rem",
                            textTransform: "none",
                            py: 0.5,
                            px: 1.25,
                            bgcolor: b.status === "ACTIVE" ? "#FEF2F2" : "#ECFDF5",
                            color: b.status === "ACTIVE" ? "#DC2626" : "#059669",
                            borderColor: b.status === "ACTIVE" ? "#FECACA" : "#A7F3D0",
                            "&:hover": { bgcolor: b.status === "ACTIVE" ? "#FEE2E2" : "#D1FAE5" },
                            "&.Mui-disabled": { opacity: 0.5 },
                          }}
                        >
                          {busyId === b.id ? "Working..." : b.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filtered.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            borderRadius: "16px",
            borderColor: "#D6E0EB",
            borderStyle: "dashed",
            bgcolor: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            textAlign: "center",
          }}
        >
          <Building2 size={28} style={{ color: "#94A3B8" }} />
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>No sub-branches found matching criteria.</Typography>
        </Paper>
      )}

      {/* Verification Drawer — same endpoint PATCH /api/admin/branches/[id] with sendBranchApprovedEmail */}
      <BranchVerificationDrawer
        branch={selectedBranch}
        open={verificationDrawerOpen}
        onClose={() => {
          setVerificationDrawerOpen(false);
          setSelectedBranch(null);
        }}
        onAccessGranted={(updatedBranch) => {
          setBranches((prev) =>
            prev.map((b) => (b.id === updatedBranch.id ? { ...b, status: "ACTIVE" } : b))
          );
          router.refresh();
        }}
        onStatusChanged={(updatedBranch, newStatus) => {
          setBranches((prev) =>
            prev.map((b) => (b.id === updatedBranch.id ? { ...b, status: newStatus } : b))
          );
          router.refresh();
        }}
      />

      {/* Status Confirmation Dialog — Grant/Deactivate with same PATCH endpoint */}
      <ConfirmDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={executeStatusChange}
        title={
          statusTarget?.action === "GRANT"
            ? "Grant Sub-Branch Access"
            : statusTarget?.action === "DEACTIVATE"
            ? "Deactivate Sub-Branch"
            : "Re-activate Sub-Branch"
        }
        message={
          statusTarget ? (
            statusTarget.action === "GRANT" ? (
              <span>
                Grant access to sub-branch <strong>&ldquo;{statusTarget.branch.name}&rdquo;</strong> for{" "}
                <strong>{statusTarget.branch.institute.name}</strong>? An approval confirmation email will be sent to the institute owner and branch manager.
              </span>
            ) : statusTarget.action === "DEACTIVATE" ? (
              <span>
                Are you sure you want to deactivate sub-branch <strong>&ldquo;{statusTarget.branch.name}&rdquo;</strong>?
              </span>
            ) : (
              <span>
                Are you sure you want to reactivate sub-branch <strong>&ldquo;{statusTarget.branch.name}&rdquo;</strong>?
              </span>
            )
          ) : null
        }
        confirmLabel={
          statusTarget?.action === "GRANT"
            ? "Grant Access"
            : statusTarget?.action === "DEACTIVATE"
            ? "Deactivate Branch"
            : "Re-activate Branch"
        }
        cancelLabel="Cancel"
        tone={
          statusTarget?.action === "GRANT"
            ? "success"
            : statusTarget?.action === "DEACTIVATE"
            ? "danger"
            : "info"
        }
        loading={!!busyId}
      />
    </Box>
  );
}
