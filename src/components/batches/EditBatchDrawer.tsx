"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { formatDate } from "@/lib/utils";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import { Building2, Clock, Calendar, Users } from "lucide-react";

type Branch = { id: string; name: string; city?: string | null; isMainBranch?: boolean };

function formatTime12h(time24: string): string {
  if (!time24) return "";
  const parts = time24.split(":");
  if (parts.length < 2) return time24;
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return time24;
  const m = parts[1] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
}

function parseTime12to24(time12: string): string {
  if (!time12) return "";
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return "";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${m}`;
}

function parseStartAndEndTime(timingStr: string): { start: string; end: string } {
  if (!timingStr) return { start: "08:00", end: "10:00" };
  const parts = timingStr.split("-");
  if (parts.length === 2) {
    const s = parseTime12to24(parts[0].trim());
    const e = parseTime12to24(parts[1].trim());
    return {
      start: s || "08:00",
      end: e || "10:00",
    };
  }
  return { start: "08:00", end: "10:00" };
}

export type EditableBatch = {
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
  branch?: { id: string; name: string; city: string | null } | null;
  branches?: { id: string; name: string; city: string | null }[];
};

export function EditBatchDrawer({
  open,
  onClose,
  batch,
  branches,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  batch: EditableBatch | null;
  branches: Branch[];
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    timing: "",
    capacity: "40",
    status: "Active",
    startDate: "",
    endDate: "",
  });

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");

  const [isAllBranches, setIsAllBranches] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [branchCapacities, setBranchCapacities] = useState<Record<string, string>>({});
  const [branchTimings, setBranchTimings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (batch) {
      setForm({
        name: batch.name,
        timing: batch.timing,
        capacity: String(batch.capacity),
        status: batch.status,
        startDate: batch.startDate ? batch.startDate.slice(0, 10) : "",
        endDate: batch.endDate ? batch.endDate.slice(0, 10) : "",
      });

      const parsedTimes = parseStartAndEndTime(batch.timing);
      setStartTime(parsedTimes.start);
      setEndTime(parsedTimes.end);

      setIsAllBranches(Boolean(batch.isAllBranches));
      const allocatedIds =
        batch.branches && batch.branches.length > 0
          ? batch.branches.map((b) => b.id)
          : batch.branchId
            ? [batch.branchId]
            : [];
      setSelectedBranchIds(allocatedIds);

      if (batch.branchCapacities && typeof batch.branchCapacities === "object") {
        const strMap: Record<string, string> = {};
        Object.entries(batch.branchCapacities).forEach(([k, v]) => {
          strMap[k] = String(v);
        });
        setBranchCapacities(strMap);
      } else {
        setBranchCapacities({});
      }

      if (batch.branchTimings && typeof batch.branchTimings === "object") {
        const timeMap: Record<string, string> = {};
        Object.entries(batch.branchTimings).forEach(([k, v]) => {
          timeMap[k] = String(v);
        });
        setBranchTimings(timeMap);
      } else {
        setBranchTimings({});
      }

      setError("");
    }
  }, [batch, open]);

  const updateTimingFromClocks = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    if (newStart && newEnd) {
      const formatted = `${formatTime12h(newStart)} - ${formatTime12h(newEnd)}`;
      setForm((prev) => ({ ...prev, timing: formatted }));
    }
  };

  const activeBranchList = useMemo(() => {
    if (isAllBranches) return branches;
    return branches.filter((b) => selectedBranchIds.includes(b.id));
  }, [branches, isAllBranches, selectedBranchIds]);

  const totalCapacity = useMemo(() => {
    if (activeBranchList.length <= 1) {
      return Number(form.capacity) || 40;
    }
    return activeBranchList.reduce((sum, b) => {
      const cap = Number(branchCapacities[b.id]) || Number(form.capacity) || 40;
      return sum + cap;
    }, 0);
  }, [activeBranchList, branchCapacities, form.capacity]);

  const toggleBranch = (id: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const selectAllBranches = () => {
    setSelectedBranchIds(branches.map((b) => b.id));
  };

  const clearAllBranches = () => {
    setSelectedBranchIds([]);
  };

  const handleBranchCapacityChange = (branchId: string, value: string) => {
    setBranchCapacities((prev) => ({ ...prev, [branchId]: value }));
  };

  const handleBranchTimingChange = (branchId: string, value: string) => {
    setBranchTimings((prev) => ({ ...prev, [branchId]: value }));
  };

  const applyDefaultCapacityToAll = () => {
    const base = form.capacity || "40";
    const newMap: Record<string, string> = {};
    activeBranchList.forEach((b) => {
      newMap[b.id] = base;
    });
    setBranchCapacities(newMap);
  };

  const applyBaseTimingToAll = () => {
    const baseTiming = form.timing || "08:00 AM - 10:00 AM";
    const newMap: Record<string, string> = {};
    activeBranchList.forEach((b) => {
      newMap[b.id] = baseTiming;
    });
    setBranchTimings(newMap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    setError("");

    if (!isAllBranches && selectedBranchIds.length === 0 && branches.length > 0) {
      setError("Please select at least one branch campus or check 'All Branches'.");
      return;
    }

    setLoading(true);
    try {
      const finalBranchCapacities: Record<string, number> = {};
      const finalBranchTimings: Record<string, string> = {};

      if (activeBranchList.length > 1) {
        activeBranchList.forEach((b) => {
          finalBranchCapacities[b.id] = Number(branchCapacities[b.id]) || Number(form.capacity) || 40;
          finalBranchTimings[b.id] = branchTimings[b.id] || form.timing;
        });
      }

      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          timing: form.timing.trim(),
          capacity: totalCapacity,
          branchCapacities: Object.keys(finalBranchCapacities).length > 0 ? finalBranchCapacities : null,
          branchTimings: Object.keys(finalBranchTimings).length > 0 ? finalBranchTimings : null,
          status: form.status,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          branchIds: isAllBranches ? [] : selectedBranchIds,
          isAllBranches,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update batch");
      }

      onClose();
      if (onUpdated) onUpdated();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update batch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={batch ? `Edit Batch: ${batch.name}` : "Edit Batch"}>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.75rem" }}>
            {error}
          </Alert>
        )}

        {batch && (
          <Alert
            severity="info"
            variant="outlined"
            sx={{ borderRadius: "12px", fontSize: "0.75rem", bgcolor: "#EEF2F7", borderColor: "#D6E0EB", color: "#334155" }}
          >
            Course: <strong>{batch.course.name}</strong> {batch.course.duration ? `(${batch.course.duration})` : ""}
          </Alert>
        )}

        <TextField
          label="Batch Name *"
          required
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Morning Batch A"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <Paper
          variant="outlined"
          sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Clock size={14} style={{ color: "#475569" }} />
              Batch Timing (Clock Time Setter) *
            </Typography>
            <Chip label={form.timing || "Set Time"} size="small" sx={{ bgcolor: "#1E3A5F", color: "white", fontWeight: 700, fontSize: "11px", height: 22, borderRadius: "6px" }} />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField
              label="Start Time (Clock)"
              type="time"
              required
              fullWidth
              size="small"
              value={startTime}
              onChange={(e) => updateTimingFromClocks(e.target.value, endTime)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } } as any}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontWeight: 600 } }}
            />
            <TextField
              label="End Time (Clock)"
              type="time"
              required
              fullWidth
              size="small"
              value={endTime}
              onChange={(e) => updateTimingFromClocks(startTime, e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } } as any}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontWeight: 600 } }}
            />
          </Box>

          <TextField
            label="Formatted Schedule Label"
            required
            fullWidth
            size="small"
            value={form.timing}
            onChange={(e) => setForm({ ...form, timing: e.target.value })}
            placeholder="e.g. 08:30 AM - 10:30 AM"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Paper>

        <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}>
          <InputLabel id="edit-batch-status-label">Batch Status</InputLabel>
          <Select labelId="edit-batch-status-label" label="Batch Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <MenuItem value="Active">Active (Ongoing Classes)</MenuItem>
            <MenuItem value="Upcoming">Upcoming (Admissions Open)</MenuItem>
            <MenuItem value="Completed">Completed / Expired (Course Finished)</MenuItem>
            <MenuItem value="Closed">Closed (Archived)</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            label="Batch Start Date"
            type="date"
            fullWidth
            size="small"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Expected Completion Date"
            type="date"
            fullWidth
            size="small"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        {form.endDate && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.25,
              borderRadius: "12px",
              bgcolor: "#EEF2F7",
              borderColor: "#D6E0EB",
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: "11px",
              color: "#4E6E93",
            }}
          >
            <Calendar size={13} style={{ color: "#7E9BBC", flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#4E6E93" }}>
              Course completion date: <strong>{formatDate(form.endDate)}</strong>.
              {new Date() > new Date(form.endDate) && (
                <Box component="span" sx={{ color: "#D64545", fontWeight: 700, ml: 0.75 }}>
                  Expired — Completed according to schedule.
                </Box>
              )}
            </Typography>
          </Paper>
        )}

        <Paper
          variant="outlined"
          sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Building2 size={14} style={{ color: "#475569" }} />
              Campus Branch Allocation
            </Typography>
            {branches.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button variant="text" size="small" onClick={selectAllBranches} sx={{ fontSize: "10px", fontWeight: 600, textTransform: "none", p: 0, minWidth: "auto" }}>
                  Select All
                </Button>
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  •
                </Typography>
                <Button variant="text" size="small" onClick={clearAllBranches} sx={{ fontSize: "10px", fontWeight: 600, textTransform: "none", p: 0, minWidth: "auto" }}>
                  Clear
                </Button>
              </Box>
            )}
          </Box>

          {branches.filter((b) => !b.isMainBranch).length === 0 ? (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: "12px", fontSize: "0.75rem", bgcolor: "white", borderColor: "#D6E0EB" }}>
              This institute has only one branch (Main Branch) — no branch selection needed.
            </Alert>
          ) : (
            <>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: "12px",
                  borderColor: isAllBranches ? "#1E3A5F" : "#D6E0EB",
                  bgcolor: isAllBranches ? "#EEF2F7" : "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isAllBranches}
                      onChange={(e) => setIsAllBranches(e.target.checked)}
                      size="small"
                      sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#334155" }}>
                      All Branches / Central Hybrid Program (Shared across campuses)
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Paper>

              {!isAllBranches && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>
                    Allocate to branches conducting this batch:
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, maxHeight: 144, overflowY: "auto" }}>
                    {branches.map((b) => {
                      const isSelected = selectedBranchIds.includes(b.id);
                      return (
                        <Paper
                          key={b.id}
                          variant="outlined"
                          onClick={() => toggleBranch(b.id)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1.25,
                            borderRadius: "12px",
                            cursor: "pointer",
                            borderColor: isSelected ? "#1E3A5F" : "#D6E0EB",
                            bgcolor: isSelected ? "#1E3A5F" : "white",
                            color: isSelected ? "white" : "#334155",
                            transition: "all 0.15s",
                            "&:hover": { bgcolor: isSelected ? "#182F4C" : "#F8FAFC" },
                          }}
                        >
                          <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: isSelected ? 600 : 500, color: isSelected ? "white" : "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {b.name} {b.city ? `(${b.city})` : ""}
                          </Typography>
                          {isSelected && (
                            <Box sx={{ width: 16, height: 16, borderRadius: "9999px", bgcolor: "white", color: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, flexShrink: 0, ml: 1 }}>
                              ✓
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Paper>

        {activeBranchList.length > 1 ? (
          <Paper
            variant="outlined"
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Building2 size={14} style={{ color: "#475569" }} />
                  Branch-Specific Timings & Capacities
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>
                  Custom schedule & seat capacity for each branch center:
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button variant="text" size="small" onClick={applyBaseTimingToAll} sx={{ fontSize: "10px", fontWeight: 600, textTransform: "none", p: 0, minWidth: "auto" }}>
                  Sync Timings
                </Button>
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  •
                </Typography>
                <Button variant="text" size="small" onClick={applyDefaultCapacityToAll} sx={{ fontSize: "10px", fontWeight: 600, textTransform: "none", p: 0, minWidth: "auto" }}>
                  Sync Capacities
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, maxHeight: 224, overflowY: "auto", pr: 0.5 }}>
              {activeBranchList.map((b) => {
                const branchCap = branchCapacities[b.id] !== undefined ? branchCapacities[b.id] : form.capacity || "40";
                const branchTime = branchTimings[b.id] !== undefined ? branchTimings[b.id] : form.timing;
                return (
                  <Paper
                    key={b.id}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", display: "flex", flexDirection: "column", gap: 1.25 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📍 {b.name} {b.city ? `(${b.city})` : ""}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                          Seats:
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={branchCap}
                          onChange={(e) => handleBranchCapacityChange(b.id, e.target.value)}
                          slotProps={{ htmlInput: { min: 1 } } as any}
                          sx={{ width: 72, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F8FAFC", "& input": { textAlign: "center", fontWeight: 700, fontSize: "0.75rem", py: 0.75 } } }}
                        />
                      </Box>
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      value={branchTime}
                      onChange={(e) => handleBranchTimingChange(b.id, e.target.value)}
                      placeholder="e.g. 08:00 AM - 10:00 AM"
                      slotProps={{ input: { startAdornment: <InputAdornment position="start"><Clock size={12} style={{ color: "#94A3B8" }} /></InputAdornment> } } as any}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F8FAFC", fontSize: "0.75rem", fontWeight: 600 } }}
                    />
                  </Paper>
                );
              })}
            </Box>

            <Paper
              variant="outlined"
              sx={{ p: 1.25, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#334155" }}>
                Total Combined Batch Capacity:
              </Typography>
              <Chip label={`${totalCapacity} Seats Across ${activeBranchList.length} Branches`} size="small" sx={{ bgcolor: "#1E3A5F", color: "white", fontWeight: 700, fontSize: "0.75rem", height: 26, borderRadius: "12px" }} />
            </Paper>
          </Paper>
        ) : (
          <TextField
            label="Batch Capacity (Max Seats) *"
            type="number"
            required
            fullWidth
            size="small"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1 } as any, input: { startAdornment: <InputAdornment position="start"><Users size={14} style={{ color: "#94A3B8" }} /></InputAdornment> } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        )}

        <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
          <Button
            type="button"
            variant="outlined"
            fullWidth
            onClick={onClose}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#64748b", fontWeight: 600, textTransform: "none", py: 1.25 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
