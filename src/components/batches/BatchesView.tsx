"use client";

import { useState, useMemo } from "react";
import { Plus, Users, Clock, Building2, Search, Filter, Pencil, Calendar, AlertCircle, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AddBatchDrawer } from "./AddBatchDrawer";
import { EditBatchDrawer, type EditableBatch } from "./EditBatchDrawer";
import { formatDate } from "@/lib/utils";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";

type Batch = {
  id: string;
  name: string;
  timing: string;
  capacity: number;
  branchCapacities?: Record<string, number> | any;
  branchTimings?: Record<string, string> | any;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  isAllBranches?: boolean;
  branchId?: string | null;
  course: { name: string; duration?: string | null };
  branch: { id: string; name: string; city: string | null } | null;
  branches?: { id: string; name: string; city: string | null }[];
  students: { id: string }[];
};

type Branch = { id: string; name: string; city?: string | null };

function isBatchExpired(b: Batch): boolean {
  if (b.status === "Completed" || b.status === "Expired") return true;
  if (b.endDate && new Date() > new Date(b.endDate)) return true;
  return false;
}

export function BatchesView({
  batches,
  courses,
  branches,
  canEdit = true,
  userRole = "OWNER",
}: {
  batches: Batch[];
  courses: { id: string; name: string }[];
  branches: Branch[];
  canEdit?: boolean;
  userRole?: string;
}) {
  const [openAdd, setOpenAdd] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        b.name.toLowerCase().includes(q) ||
        b.course.name.toLowerCase().includes(q) ||
        (b.branch?.name && b.branch.name.toLowerCase().includes(q)) ||
        (b.branches && b.branches.some((br) => br.name.toLowerCase().includes(q)));

      const matchesBranch =
        selectedBranch === "ALL" ||
        b.isAllBranches ||
        (selectedBranch === "MAIN" && !b.branch && (!b.branches || b.branches.length === 0)) ||
        (b.branch && b.branch.id === selectedBranch) ||
        (b.branches && b.branches.some((br) => br.id === selectedBranch));

      const expired = isBatchExpired(b);
      let matchesStatus = true;
      if (statusFilter === "ACTIVE") {
        matchesStatus = !expired && b.status === "Active";
      } else if (statusFilter === "UPCOMING") {
        matchesStatus = b.status === "Upcoming";
      } else if (statusFilter === "EXPIRED_COMPLETED") {
        matchesStatus = expired;
      }

      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [batches, search, selectedBranch, statusFilter]);

  const counts = useMemo(() => {
    const total = batches.length;
    const active = batches.filter((b) => !isBatchExpired(b) && b.status === "Active").length;
    const expired = batches.filter((b) => isBatchExpired(b)).length;
    const upcoming = batches.filter((b) => b.status === "Upcoming").length;
    return { total, active, expired, upcoming };
  }, [batches]);

  return (
    <>
      {!canEdit && (
        <Alert
          severity="info"
          icon={<Lock size={15} />}
          sx={{
            mb: 2,
            borderRadius: "12px",
            border: "1px solid #D6E0EB",
            bgcolor: "#EEF2F7",
            color: "#4E6E93",
            fontSize: "0.75rem",
            "& .MuiAlert-message": { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1.5 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b" }}>
              Allocated Batch Schedule (Read-Only):
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#4E6E93" }}>
              You are viewing batches allocated to your branch. Timings and capacities can only be configured by institute administrators.
            </Typography>
          </Box>
          <Badge tone="neutral">Read-Only Mode</Badge>
        </Alert>
      )}

      <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1, borderBottom: "1px solid #D6E0EB", pb: 1.5 }}>
        {[
          { id: "ALL", label: `All Batches (${counts.total})` },
          { id: "ACTIVE", label: `Active Batches (${counts.active})` },
          { id: "UPCOMING", label: `Upcoming (${counts.upcoming})` },
          { id: "EXPIRED_COMPLETED", label: `Completed / Expired (${counts.expired})` },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={statusFilter === tab.id ? "contained" : "text"}
            onClick={() => setStatusFilter(tab.id)}
            size="small"
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.75rem",
              px: 1.5,
              py: 0.75,
              bgcolor: statusFilter === tab.id ? "#1E3A5F" : "transparent",
              color: statusFilter === tab.id ? "white" : "#4E6E93",
              "&:hover": { bgcolor: statusFilter === tab.id ? "#182F4C" : "#EEF2F7" },
              boxShadow: statusFilter === tab.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            {tab.label}
          </Button>
        ))}
      </Box>

      <Box sx={{ mb: 2.5, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", flex: 1, flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" } }}>
          <TextField
            size="small"
            placeholder="Search batches, course, campus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} style={{ color: "#7E9BBC" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, maxWidth: { sm: 320 }, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.875rem" } }}
          />
          {branches.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Filter size={14} style={{ color: "#94A3B8" }} />
              <Select
                size="small"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 600, minWidth: 160, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D6E0EB" } }}
              >
                <MenuItem value="ALL">All Branches ({batches.length})</MenuItem>
                <MenuItem value="MAIN">Main Branch / Unallocated</MenuItem>
                {branches.map((br) => (
                  <MenuItem key={br.id} value={br.id}>
                    {br.name} {br.city ? `(${br.city})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}
        </Box>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Plus size={15} />}
            onClick={() => setOpenAdd(true)}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, fontSize: "0.75rem", px: 2, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
          >
            Add Batch
          </Button>
        )}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
        {filteredBatches.map((b) => {
          const fillPercent = Math.min(Math.round((b.students.length / b.capacity) * 100), 100);
          const allocatedBranchesList =
            b.branches && b.branches.length > 0
              ? b.branches
              : b.branch
                ? [b.branch]
                : [];

          const expired = isBatchExpired(b);

          return (
            <Card key={b.id} sx={{ p: 2.5, opacity: expired ? 0.9 : 1, bgcolor: expired ? "rgba(238,242,247,0.4)" : "white", transition: "box-shadow 0.15s", "&:hover": { boxShadow: "0 4px 12px rgba(13,26,42,0.08)" } }}>
              <Box sx={{ mb: 1.5, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body1" sx={{ fontFamily: "var(--font-sora)", fontSize: "1rem", fontWeight: 600, color: "#171A21" }}>
                    {b.name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#7E9BBC" }}>
                    {b.course.name}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {expired ? (
                    <Badge tone="danger">Completed / Expired</Badge>
                  ) : (
                    <Badge tone={b.status === "Active" ? "success" : b.status === "Upcoming" ? "warn" : "neutral"}>{b.status}</Badge>
                  )}
                  {canEdit && (
                    <IconButton
                      size="small"
                      onClick={() => setEditingBatch(b)}
                      aria-label="Edit Batch"
                      sx={{ color: "#94A3B8", "&:hover": { color: "#1E3A5F", bgcolor: "#EEF2F7" }, width: 28, height: 28 }}
                    >
                      <Pencil size={14} />
                    </IconButton>
                  )}
                </Box>
              </Box>

              <Stack spacing={1.25} sx={{ fontSize: "0.75rem" }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.25, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.7)", borderColor: "#D6E0EB", display: "flex", flexDirection: "column", gap: 0.75 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "#334155", fontWeight: 600, fontSize: "0.75rem" }}>
                    <Building2 size={13} style={{ color: "#64748b", flexShrink: 0 }} />
                    Campus Allocation:
                  </Box>
                  {b.isAllBranches ? (
                    <Chip
                      label="🌐 All Campuses (Joint / Shared Program)"
                      size="small"
                      sx={{ bgcolor: "#f3e8ff", color: "#6b21a8", border: "1px solid #e9d5ff", fontWeight: 700, fontSize: "10px", height: 22, borderRadius: "6px", width: "fit-content" }}
                    />
                  ) : allocatedBranchesList.length > 0 ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, pt: 0.25 }}>
                      {allocatedBranchesList.map((br) => (
                        <Chip
                          key={br.id}
                          label={`${br.name} ${br.city ? `(${br.city})` : ""}`}
                          size="small"
                          variant="outlined"
                          sx={{ bgcolor: "white", borderColor: "#D6E0EB", color: "#1E293b", fontWeight: 600, fontSize: "10px", height: 22, borderRadius: "6px" }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8", fontStyle: "italic" }}>
                      Main Branch / Unallocated
                    </Typography>
                  )}
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1.5,
                    py: 1,
                    borderRadius: "12px",
                    bgcolor: "#F8FAFC",
                    borderColor: "#D6E0EB",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontWeight: 700, fontSize: "0.75rem", color: "#171A21" }}>
                    <Clock size={14} style={{ color: "#475569", flexShrink: 0 }} />
                    {b.timing}
                  </Box>
                  {canEdit && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setEditingBatch(b)}
                      sx={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "none", p: 0, minWidth: "auto", "&:hover": { color: "#1E3A5F", bgcolor: "transparent", textDecoration: "underline" } }}
                    >
                      Change Timing
                    </Button>
                  )}
                </Paper>

                {(b.startDate || b.endDate) && (
                  <Box sx={{ fontSize: "11px", color: "#7E9BBC", display: "flex", flexDirection: "column", gap: 0.5, pt: 0.5, borderTop: "1px solid rgba(214,224,235,0.6)" }}>
                    {b.startDate && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Calendar size={11} style={{ color: "#94A3B8" }} />
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>
                          Started: {formatDate(b.startDate)}
                        </Typography>
                      </Box>
                    )}
                    {b.endDate && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontWeight: 500, color: expired ? "#D64545" : "#475569" }}>
                        <Calendar size={11} style={{ color: expired ? "#D64545" : "#94A3B8" }} />
                        <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: expired ? 700 : 500, color: expired ? "#D64545" : "#475569" }}>
                          {expired ? "Expired on: " : "Completes: "}
                          {formatDate(b.endDate)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {allocatedBranchesList.length > 1 && (b.branchCapacities || b.branchTimings) ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: 1.25, borderRadius: "12px", bgcolor: "rgba(247,245,240,0.5)", borderColor: "#D6E0EB", display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontWeight: 600, color: "#334155" }}>
                        <Building2 size={12} style={{ color: "#64748b" }} />
                        Branch Schedules & Seats:
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "11px", color: "#1E293b" }}>
                        {b.students.length} / {b.capacity} enrolled
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, maxHeight: 112, overflowY: "auto", pr: 0.5, pt: 0.25 }}>
                      {allocatedBranchesList.map((br) => {
                        const brCap = b.branchCapacities?.[br.id] ?? "—";
                        const brTime = b.branchTimings?.[br.id] || b.timing;
                        return (
                          <Paper
                            key={br.id}
                            variant="outlined"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              px: 1.25,
                              py: 0.75,
                              borderRadius: "12px",
                              borderColor: "#D6E0EB",
                              bgcolor: "white",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, overflow: "hidden", maxWidth: 150 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "10px", color: "#1E293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {br.name}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, color: "#94A3B8", fontSize: "9px", whiteSpace: "nowrap" }}>
                                <Clock size={10} style={{ color: "#94A3B8", flexShrink: 0 }} />
                                {brTime}
                              </Box>
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "10px", color: "#171A21", flexShrink: 0, ml: 1 }}>
                              {brCap} seats
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                  </Paper>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 500, color: "#475569", fontSize: "0.75rem" }}>
                    <Users size={14} style={{ color: "#94A3B8", flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500 }}>
                      {b.students.length} / {b.capacity} students enrolled
                    </Typography>
                  </Box>
                )}
              </Stack>

              <Box sx={{ mt: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #F1F5F9", pt: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <ProgressRing value={fillPercent} size={32} stroke={3.5} />
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                    <Box component="span" sx={{ fontWeight: 700, color: "#171A21" }}>
                      {fillPercent}%
                    </Box>{" "}
                    capacity filled
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                    {b.capacity - b.students.length} seats left
                  </Typography>
                  {canEdit ? (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setEditingBatch(b)}
                      sx={{
                        borderRadius: "12px",
                        borderColor: "#D6E0EB",
                        bgcolor: "white",
                        color: "#334155",
                        fontWeight: 600,
                        fontSize: "11px",
                        textTransform: "none",
                        px: 1.5,
                        py: 0.5,
                        "&:hover": { bgcolor: "#F8FAFC", borderColor: "#D6E0EB" },
                      }}
                    >
                      Edit Batch
                    </Button>
                  ) : (
                    <Chip label="Allocated Batch" size="small" sx={{ bgcolor: "#EEF2F7", border: "1px solid #D6E0EB", color: "#64748b", fontWeight: 600, fontSize: "11px", height: 26, borderRadius: "12px" }} />
                  )}
                </Box>
              </Box>
            </Card>
          );
        })}

        {filteredBatches.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              gridColumn: "1 / -1",
              py: 6,
              textAlign: "center",
              borderRadius: "18px",
              borderStyle: "dashed",
              borderColor: "#D6E0EB",
              bgcolor: "rgba(255,255,255,0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Building2 size={32} style={{ color: "#CBD5E1", marginBottom: 4 }} />
            <Typography variant="body2" sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}>
              No batches match this filter
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#94A3B8", mt: 0.5 }}>
              Switch branch filter or click &quot;Add Batch&quot; to create a new batch.
            </Typography>
          </Paper>
        )}
      </Box>

      <AddBatchDrawer open={openAdd} onClose={() => setOpenAdd(false)} courses={courses} branches={branches} />

      <EditBatchDrawer open={!!editingBatch} onClose={() => setEditingBatch(null)} batch={editingBatch} branches={branches} />
    </>
  );
}
