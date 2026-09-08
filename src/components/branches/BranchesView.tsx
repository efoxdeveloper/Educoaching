"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  Plus,
  Search,
  Users,
  MapPin,
  Phone,
  Building,
  Zap,
  LogOut,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateBranchDrawer, type BranchItem } from "./CreateBranchDrawer";
import { formatCurrency } from "@/lib/utils";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";

export function BranchesView({
  initialBranches,
}: {
  initialBranches: BranchItem[];
}) {
  const [branches, setBranches] = useState<BranchItem[]>(initialBranches);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<BranchItem | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<BranchItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [mainBranchNotice, setMainBranchNotice] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [activeImpersonationBranchId, setActiveImpersonationBranchId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const { update } = useSession();

  useEffect(() => {
    fetch("/api/branches/impersonate")
      .then((r) => r.json())
      .then((data) => {
        if (data.isImpersonating && data.branchId && !data.branch?.isMainBranch) {
          setActiveImpersonationBranchId(data.branchId);
        } else {
          setActiveImpersonationBranchId(null);
        }
      })
      .catch(() => {
        setActiveImpersonationBranchId(null);
      });
  }, []);

  const handleStartImpersonation = async (branch: BranchItem) => {
    setImpersonatingId(branch.id);
    try {
      const res = await fetch("/api/branches/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: branch.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error || "Failed to start branch impersonation");
        return;
      }
      try {
        await update({
          impersonatingBranchId: body.impersonatingBranchId || branch.id,
          impersonationStartedAt: Date.now(),
        });
      } catch {}
      window.location.reload();
    } catch {
      alert("Error initiating branch impersonation");
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleExitImpersonation = async () => {
    try {
      const res = await fetch("/api/branches/impersonate/exit", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      try {
        await update({ impersonatingBranchId: null, impersonationStartedAt: null });
      } catch {}
      window.location.reload();
    } catch {
      alert("Error exiting branch impersonation");
    }
  };

  const refreshBranches = async () => {
    try {
      const res = await fetch("/api/branches/stats");
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch {
      console.error("Failed to refresh branch stats");
    }
  };

  const onDeleteClick = (branch: BranchItem) => {
    if (branch.isMainBranch) {
      setMainBranchNotice("Cannot delete the Main Branch / Head Office. Reassign another branch as Main Branch first.");
      return;
    }
    setBranchToDelete(branch);
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/branches/${branchToDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBranches((prev) => prev.filter((b) => b.id !== branchToDelete.id));
        setNotification(`Branch "${branchToDelete.name}" deleted successfully.`);
        setBranchToDelete(null);
      } else {
        setNotification(data.error || "Failed to delete branch");
      }
    } catch {
      setNotification("Failed to delete branch. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = branches.filter((b) => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchName = b.name.toLowerCase().includes(term);
      const matchCity = b.city?.toLowerCase().includes(term) ?? false;
      const matchState = b.state?.toLowerCase().includes(term) ?? false;
      if (!matchName && !matchCity && !matchState) return false;
    }
    return true;
  });

  const totalStudents = branches.reduce((sum, b) => sum + (b.studentCount || 0), 0);
  const totalCollections = branches.reduce((sum, b) => sum + (b.totalCollected || 0), 0);
  const totalExpenses = branches.reduce((sum, b) => sum + (b.totalExpenses || 0), 0);
  const totalProfit = totalCollections - totalExpenses;
  const activeCount = branches.filter((b) => b.status === "ACTIVE").length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, color: "#171A21", fontSize: "1.25rem" }}>Multi-Branch Center Management</Typography>
          <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem", display: "block", mt: 0.5 }}>
            Manage your physical campus centers, track branch-level student enrollment, collections, and profitability.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={15} />}
          onClick={() => {
            setBranchToEdit(null);
            setDrawerOpen(true);
          }}
          sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, fontSize: "0.75rem", px: 2, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
        >
          Add Campus Branch
        </Button>
      </Box>

      {notification && (
        <Alert
          severity="warning"
          onClose={() => setNotification(null)}
          sx={{ borderRadius: "16px", border: "1px solid #FDE68A", bgcolor: "#FFFBEB", color: "#92400e", fontSize: "0.75rem", "& .MuiAlert-message": { width: "100%" } }}
        >
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#78350f", fontSize: "0.75rem", display: "block" }}>Sub-Branch Request in Processing</Typography>
            <Typography variant="caption" sx={{ color: "#92400e", fontSize: "0.75rem" }}>{notification}</Typography>
          </Box>
        </Alert>
      )}

      {/* Main Branch Master Control Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: "16px",
          borderColor: "#DDD6FE",
          background: "linear-gradient(90deg, #faf5ff 0%, #eef2ff 50%, #ffffff 100%)",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "#6D28D9", color: "white", flexShrink: 0 }}>
            <Building2 size={20} />
          </Avatar>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#3B0764", fontSize: "0.875rem" }}>Main Branch Master Control Active</Typography>
              <Chip label="Centralized Administration" size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: "#DDD6FE", color: "#4C1D95", border: "1px solid #C4B5FD", textTransform: "uppercase" }} />
            </Box>
            <Typography variant="caption" sx={{ color: "#6D28D9", fontSize: "0.75rem", display: "block", mt: 0.5 }}>
              The Main Branch (Head Office) has full access to view, switch between, and make changes to all {branches.length} campus branches, including student enrollments, batch schedules, and fee collections.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* KPI Cards — reuse KpiCard with lazy iconName */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiCard label="Active Campuses" value={`${activeCount.toLocaleString("en-IN")} / ${branches.length.toLocaleString("en-IN")}`} iconName="Building2" accent="scholar" trend="Operational branch centers" trendTone="neutral" />
        <KpiCard label="Total Enrolled Students" value={totalStudents.toLocaleString("en-IN")} iconName="Users" accent="scholar" trend="Across all branch campuses" trendTone="neutral" />
        <KpiCard label="Total Fee Collections" value={formatCurrency(totalCollections)} iconName="Wallet" accent="marigold" trend="Total cash inflow collected" trendTone="neutral" />
        <KpiCard label="Net Campus Profit" value={formatCurrency(totalProfit)} iconName={totalProfit >= 0 ? "TrendingUp" : "TrendingDown"} accent={totalProfit >= 0 ? "scholar" : "marigold"} trend="After deducting campus expenses" trendTone={totalProfit >= 0 ? "success" : "danger"} />
      </Box>

      {/* Filter and Search */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, flex: 1 }}>
          <TextField
            size="small"
            placeholder="Search by branch name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={14} style={{ color: "#7E9BBC" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 220, flex: 1, maxWidth: 320, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem" } }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="branch-status-label" sx={{ fontSize: "0.75rem" }}>Status</InputLabel>
            <Select
              labelId="branch-status-label"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="ACTIVE">Active Centers Only</MenuItem>
              <MenuItem value="INACTIVE">Inactive Centers</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#7E9BBC", whiteSpace: "nowrap" }}>
          Showing {filtered.length} branches
        </Typography>
      </Box>

      {/* Branches Grid — keep as Card grid, not Table */}
      {filtered.length === 0 ? (
        <Card sx={{ p: 6, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <Building2 size={28} style={{ color: "#94A3B8" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21" }}>No Branches Found</Typography>
          <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem", maxWidth: 320 }}>
            {search || statusFilter !== "ALL" ? "No branches match your current filter." : "Expand your coaching institute by creating multiple branch centers."}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={14} />}
            onClick={() => {
              setBranchToEdit(null);
              setDrawerOpen(true);
            }}
            sx={{ mt: 1, borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, fontSize: "0.75rem", px: 2, py: 1, boxShadow: "none" }}
          >
            Add First Branch
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
          {filtered.map((b) => {
            const margin =
              b.totalCollected && b.totalCollected > 0
                ? Math.round(((b.netProfit || 0) / b.totalCollected) * 100)
                : 0;

            return (
              <Card
                key={b.id}
                sx={{ p: 2.5, display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "box-shadow 0.15s", "&:hover": { boxShadow: "0 4px 12px rgba(13,26,42,0.08)" } }}
              >
                <Box>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar variant="rounded" sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#EEF2F7", color: "#4E6E93" }}>
                        <Building size={18} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.875rem" }}>{b.name}</Typography>
                        <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "11px", color: "#7E9BBC" }}>
                          <MapPin size={11} /> {b.city || "Primary City"}{b.state ? `, ${b.state}` : ""}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                      {b.isMainBranch && (
                        <Chip icon={<Box component="span" sx={{ fontSize: "11px" }}>🏛️</Box>} label="Main Branch" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 700, bgcolor: "#F5F3FF", color: "#4C1D95", border: "1px solid #DDD6FE" }} />
                      )}
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
                    </Box>
                  </Box>

                  {b.address && (
                    <Paper variant="outlined" sx={{ mt: 1.5, p: 1, borderRadius: "8px", bgcolor: "rgba(238,242,247,0.5)", borderColor: "#D6E0EB" }}>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {b.address}
                      </Typography>
                    </Paper>
                  )}

                  {b.contact && (
                    <Typography variant="caption" sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.75rem", color: "#334155", fontWeight: 500 }}>
                      <Phone size={12} style={{ color: "#94A3B8" }} /> {b.contact}
                    </Typography>
                  )}

                  {b.guidePhone && (
                    <Typography variant="caption" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.75rem", color: "#6D28D9", fontWeight: 500 }}>
                      <Box component="span" sx={{ fontSize: "11px", fontWeight: 700, color: "#6D28D9" }}>🧭 Guide Helpline:</Box> {b.guidePhone}
                    </Typography>
                  )}

                  {b.inChargeName && (
                    <Typography variant="caption" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.75rem", color: "#171A21" }}>
                      <Box component="span" sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>👤 Owner:</Box> <Box component="span" sx={{ fontWeight: 600 }}>{b.inChargeName}</Box>
                    </Typography>
                  )}

                  {b.isMainBranch ? (
                    <Alert severity="info" icon={<Building2 size={13} />} sx={{ mt: 1.25, borderRadius: "8px", bgcolor: "#F5F3FF", border: "1px solid #DDD6FE", color: "#4C1D95", fontSize: "11px", py: 0.5, "& .MuiAlert-message": { fontWeight: 600 } }}>
                      Head Office: Full administrative access to manage all {branches.length - 1} other branch locations.
                    </Alert>
                  ) : b.status === "PENDING_APPROVAL" ? (
                    <Alert severity="warning" sx={{ mt: 1.25, borderRadius: "8px", bgcolor: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400e", fontSize: "11px", py: 0.5 }}>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "11px", color: "#92400e" }}>Request in Processing:</Typography>
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#92400e" }}>Platform admin approval is pending. Access will unlock once granted.</Typography>
                      </Box>
                    </Alert>
                  ) : (
                    <Paper variant="outlined" sx={{ mt: 1.25, p: 1, borderRadius: "8px", bgcolor: "rgba(238,242,247,0.5)", borderColor: "#D6E0EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "11px", color: "#64748b" }}>
                        <Building2 size={12} style={{ color: "#94A3B8" }} />
                        Governed by Main Branch
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setBranchToEdit(b);
                          setDrawerOpen(true);
                        }}
                        sx={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "none", p: 0, minWidth: 0, "&:hover": { textDecoration: "underline", bgcolor: "transparent" } }}
                      >
                        Configure from Main Branch →
                      </Button>
                    </Paper>
                  )}

                  {/* Operational stats */}
                  <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9", py: 1.25, textAlign: "center" }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#94A3B8", display: "block" }}>Students</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", mt: 0.5, fontSize: "0.875rem" }}>{b.studentCount || 0}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#94A3B8", display: "block" }}>Batches</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", mt: 0.5, fontSize: "0.875rem" }}>{b.batchCount || 0}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#94A3B8", display: "block" }}>CRM Leads</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#475569", mt: 0.5, fontSize: "0.875rem" }}>{b.leadCount || 0}</Typography>
                    </Box>
                  </Box>

                  {/* Financial Breakdown */}
                  <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.5)", borderColor: "#D6E0EB", display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>Collections:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#059669", fontSize: "0.75rem" }}>{formatCurrency(b.totalCollected || 0)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>Expenses:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "#DC2626", fontSize: "0.75rem" }}>-{formatCurrency(b.totalExpenses || 0)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(214,224,235,0.5)", pt: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>Net Margin:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: (b.netProfit || 0) >= 0 ? "#1E3A5F" : "#DC2626" }}>
                        {formatCurrency(b.netProfit || 0)} ({margin}%)
                      </Typography>
                    </Box>
                  </Paper>
                </Box>

                <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1, borderTop: "1px solid #D6E0EB", pt: 1.5 }}>
                  {!b.isMainBranch && (
                    b.status === "PENDING_APPROVAL" ? (
                      <Paper variant="outlined" sx={{ p: 1, borderRadius: "12px", borderColor: "#FDE68A", bgcolor: "#FFFBEB", textAlign: "center", fontSize: "11px", fontWeight: 600, color: "#92400e" }}>
                        🔒 Sub-Branch Locked • Awaiting Admin Access Grant
                      </Paper>
                    ) : activeImpersonationBranchId === b.id ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<LogOut size={12} />}
                        onClick={handleExitImpersonation}
                        sx={{ borderRadius: "12px", borderColor: "#FDE68A", bgcolor: "#FFFBEB", color: "#92400e", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", py: 1, "&:hover": { bgcolor: "#FEF3C7", borderColor: "#FCD34D" } }}
                      >
                        Active Impersonation • Exit to Main Branch
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={impersonatingId === b.id ? undefined : <Zap size={13} />}
                        onClick={() => handleStartImpersonation(b)}
                        disabled={impersonatingId === b.id}
                        sx={{ borderRadius: "12px", borderColor: "#DDD6FE", bgcolor: "#F5F3FF", color: "#4C1D95", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", py: 1, "&:hover": { bgcolor: "#EDE9FE", borderColor: "#C4B5FD" } }}
                      >
                        {impersonatingId === b.id ? "Impersonating..." : "⚡ Impersonate & Manage Branch View"}
                      </Button>
                    )
                  )}

                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Building size={12} />}
                      onClick={() => {
                        setBranchToEdit(b);
                        setDrawerOpen(true);
                      }}
                      sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1, "&:hover": { bgcolor: "#F8FAFC" } }}
                    >
                      Edit Details
                    </Button>

                    {!b.isMainBranch && (
                      <IconButton
                        size="small"
                        onClick={() => onDeleteClick(b)}
                        title="Delete Branch"
                        sx={{ border: "1px solid #D6E0EB", borderRadius: "12px", color: "#94A3B8", width: 36, height: 36, "&:hover": { bgcolor: "#FFF1F2", color: "#DC2626", borderColor: "#FECACA" } }}
                      >
                        <Box component="span" sx={{ fontSize: "14px" }}>🗑️</Box>
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Create / Edit Drawer */}
      <CreateBranchDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setBranchToEdit(null);
        }}
        branchToEdit={branchToEdit}
        onSaved={(msg) => {
          refreshBranches();
          if (msg) setNotification(msg);
        }}
      />

      {/* Main Branch Deletion Restriction Modal */}
      <ConfirmDialog
        open={!!mainBranchNotice}
        onClose={() => setMainBranchNotice(null)}
        onConfirm={() => setMainBranchNotice(null)}
        title="Cannot Delete Main Branch"
        message={mainBranchNotice}
        confirmLabel="Understood"
        cancelLabel="Close"
        tone="warn"
      />

      {/* Branch Deletion Confirm Dialog */}
      <ConfirmDialog
        open={!!branchToDelete}
        onClose={() => setBranchToDelete(null)}
        onConfirm={confirmDeleteBranch}
        title="Delete Branch"
        message={
          branchToDelete ? (
            <span>
              Are you sure you want to delete sub-branch <strong>&ldquo;{branchToDelete.name}&rdquo;</strong>?
              {branchToDelete.studentCount && branchToDelete.studentCount > 0 ? (
                <span className="block mt-1 text-rose-600 font-semibold">
                  ⚠️ This branch currently has {branchToDelete.studentCount} students and {branchToDelete.batchCount || 0} batches.
                </span>
              ) : null}
            </span>
          ) : null
        }
        confirmLabel="Delete Branch"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </Box>
  );
}
