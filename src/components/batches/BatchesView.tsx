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
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";

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
      {/* Read-Only Notice for Faculty and Non-Admin Staff */}
      {!canEdit && (
        <div className="mb-4 rounded-xl border border-scholar-200 bg-scholar-50/70 p-3 text-xs text-scholar-700 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-scholar-500 shrink-0" />
            <span>
              <strong>Allocated Batch Schedule (Read-Only)</strong>: You are viewing batches allocated to your branch credentials.
              Batch timings, campus allocations, and capacities can only be configured by institute administrators.
            </span>
          </div>
          <Badge tone="neutral">Read-Only Mode</Badge>
        </div>
      )}

      {/* Top Filter Tabs: Active vs Completed/Expired */}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Card key={b.id} className={`p-5 hover:shadow-md transition-shadow ${expired ? "bg-scholar-50/40 border-scholar-200 opacity-90" : ""}`}>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-display text-base font-semibold text-ink">{b.name}</p>
                  <p className="text-xs font-medium text-scholar-500">{b.course.name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {expired ? (
                    <Badge tone="danger">Completed / Expired</Badge>
                  ) : (
                    <Badge tone={b.status === "Active" ? "success" : b.status === "Upcoming" ? "warn" : "neutral"}>
                      {b.status}
                    </Badge>
                  )}
                  {canEdit && (
                    <button
                      title="Edit Batch & Timing"
                      onClick={() => setEditingBatch(b)}
                      className="p-1 text-scholar-400 hover:text-scholar-700 hover:bg-scholar-100 rounded-md transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs text-scholar-600">
                {/* Branch Allocation Display */}
                <div className="rounded-lg bg-scholar-50/70 p-2 border border-scholar-100/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-scholar-700 font-semibold">
                    <Building2 size={13} className="text-scholar-500 shrink-0" />
                    <span>Campus Allocation:</span>
                  </div>

                  {b.isAllBranches ? (
                    <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                      🌐 All Campuses (Joint / Shared Program)
                    </span>
                  ) : allocatedBranchesList.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {allocatedBranchesList.map((br) => (
                        <span
                          key={br.id}
                          className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-scholar-800 border border-scholar-200 shadow-xs"
                        >
                          {br.name} {br.city ? `(${br.city})` : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-scholar-500 italic">
                      Main Branch / Unallocated
                    </span>
                  )}
                </div>

                {/* Batch Timing with Clock icon */}
                <div className="flex items-center justify-between rounded-lg bg-scholar-50/80 px-2.5 py-1.5 border border-scholar-100">
                  <p className="flex items-center gap-1.5 font-bold text-xs text-ink">
                    <Clock size={14} className="text-scholar-600 shrink-0" />
                    <span>{b.timing}</span>
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setEditingBatch(b)}
                      className="text-[10px] font-semibold text-scholar-600 hover:text-scholar-900 hover:underline cursor-pointer"
                    >
                      Change Timing
                    </button>
                  )}
                </div>

                {/* Start & End dates / Expiry */}
                {(b.startDate || b.endDate) && (
                  <div className="text-[11px] text-scholar-500 space-y-0.5 pt-0.5 border-t border-scholar-100/60">
                    {b.startDate && (
                      <p className="flex items-center gap-1">
                        <Calendar size={11} className="text-scholar-400" />
                        <span>Started: {formatDate(b.startDate)}</span>
                      </p>
                    )}
                    {b.endDate && (
                      <p className={`flex items-center gap-1 font-medium ${expired ? "text-danger-600 font-semibold" : "text-scholar-600"}`}>
                        <Calendar size={11} className={expired ? "text-danger-500" : "text-scholar-400"} />
                        <span>{expired ? "Expired on: " : "Completes: "}{formatDate(b.endDate)}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Branch Breakdown (Timings & Capacities) if multi-branch */}
                {allocatedBranchesList.length > 1 && (b.branchCapacities || b.branchTimings) ? (
                  <div className="rounded-lg bg-scholar-50/50 p-2 border border-scholar-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-scholar-700 flex items-center gap-1">
                        <Building2 size={12} className="text-scholar-500" /> Branch Schedules & Seats:
                      </span>
                      <span className="font-bold text-scholar-800">{b.students.length} / {b.capacity} enrolled</span>
                    </div>
                    <div className="space-y-1 pt-0.5 max-h-28 overflow-y-auto pr-0.5">
                      {allocatedBranchesList.map((br) => {
                        const brCap = b.branchCapacities?.[br.id] ?? "—";
                        const brTime = b.branchTimings?.[br.id] || b.timing;
                        return (
                          <div key={br.id} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-scholar-100 text-[10px]">
                            <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                              <span className="font-semibold text-scholar-800 truncate">{br.name}</span>
                              <span className="text-scholar-500 text-[9px] flex items-center gap-0.5 truncate">
                                <Clock size={10} className="text-scholar-400 shrink-0" /> {brTime}
                              </span>
                            </div>
                            <span className="font-bold text-ink shrink-0 ml-1">{brCap} seats</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 font-medium">
                    <Users size={14} className="text-scholar-400 shrink-0" />
                    <span>{b.students.length} / {b.capacity} students enrolled</span>
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-scholar-50 pt-3">
                <div className="flex items-center gap-2.5">
                  <ProgressRing value={fillPercent} size={32} stroke={3.5} />
                  <p className="text-xs text-scholar-500">
                    <strong className="text-ink">{fillPercent}%</strong> capacity filled
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-scholar-400 font-medium">
                    {b.capacity - b.students.length} seats left
                  </span>
                  {canEdit ? (
                    <button
                      onClick={() => setEditingBatch(b)}
                      className="rounded-lg border border-scholar-200 bg-white px-2 py-1 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors"
                    >
                      Edit Batch
                    </button>
                  ) : (
                    <span className="rounded-lg border border-scholar-200 bg-scholar-50 px-2 py-1 text-[11px] font-semibold text-scholar-500">
                      Allocated Batch
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {filteredBatches.length === 0 && (
          <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-scholar-200 bg-paper/50">
            <Building2 size={32} className="mx-auto text-scholar-300 mb-2" />
            <p className="text-sm font-medium text-scholar-600">No batches match this filter</p>
            <p className="text-xs text-scholar-400 mt-1">
              Switch branch filter or click &quot;Add Batch&quot; to create a new batch.
            </p>
          </div>
        )}
      </div>

      <AddBatchDrawer
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        courses={courses}
        branches={branches}
      />

      <EditBatchDrawer
        open={!!editingBatch}
        onClose={() => setEditingBatch(null)}
        batch={editingBatch}
        branches={branches}
      />
    </>
  );
}