"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
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
import FormGroup from "@mui/material/FormGroup";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import { Building2, Clock, Users } from "lucide-react";

type Course = { id: string; name: string };
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

export function AddBatchDrawer({
  open,
  onClose,
  courses,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    courseId: "",
    timing: "",
    capacity: "",
    status: "Active",
  });

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [isAllBranches, setIsAllBranches] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  const [branchCapacities, setBranchCapacities] = useState<Record<string, string>>({});
  const [branchTimings, setBranchTimings] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      return Number(form.capacity) || 0;
    }
    return activeBranchList.reduce((sum, b) => {
      const cap = Number(branchCapacities[b.id]) || Number(form.capacity) || 0;
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
    const base = form.capacity || "";
    const newMap: Record<string, string> = {};
    activeBranchList.forEach((b) => {
      newMap[b.id] = base;
    });
    setBranchCapacities(newMap);
  };

  const applyBaseTimingToAll = () => {
    const baseTiming = form.timing || "";
    const newMap: Record<string, string> = {};
    activeBranchList.forEach((b) => {
      newMap[b.id] = baseTiming;
    });
    setBranchTimings(newMap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.courseId) {
      setError("Please select a course for this batch.");
      return;
    }
    if (!form.name.trim()) {
      setError("Batch name is required.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Please select both start and end time for the batch.");
      return;
    }
    if (!form.capacity || Number(form.capacity) <= 0) {
      setError("Please enter a valid batch capacity (number of seats).");
      return;
    }
    if (!isAllBranches && selectedBranchIds.length === 0 && branches.length > 0) {
      setError("Please select at least one campus branch or check 'All Branches'.");
      return;
    }

    setLoading(true);
    try {
      const finalBranchCapacities: Record<string, number> = {};
      const finalBranchTimings: Record<string, string> = {};

      if (activeBranchList.length > 1) {
        activeBranchList.forEach((b) => {
          finalBranchCapacities[b.id] = Number(branchCapacities[b.id]) || Number(form.capacity) || 0;
          finalBranchTimings[b.id] = branchTimings[b.id] || form.timing;
        });
      }

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: totalCapacity,
          branchCapacities: Object.keys(finalBranchCapacities).length > 0 ? finalBranchCapacities : undefined,
          branchTimings: Object.keys(finalBranchTimings).length > 0 ? finalBranchTimings : undefined,
          branchIds: isAllBranches ? [] : selectedBranchIds,
          isAllBranches,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not add batch");
      }

      setForm({
        name: "",
        courseId: "",
        timing: "",
        capacity: "",
        status: "Active",
      });
      setIsAllBranches(false);
      setSelectedBranchIds([]);
      setStartTime("");
      setEndTime("");
      setBranchCapacities({});
      setBranchTimings({});
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add batch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add Batch (Multi-Branch Allocation)">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.75rem" }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Batch Name *"
          required
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Morning Batch A / JEE Droppers"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <FormControl fullWidth size="small" required sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}>
          <InputLabel id="add-batch-course-label">Course Program *</InputLabel>
          <Select
            displayEmpty
            labelId="add-batch-course-label"
            label="Course Program *"
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          >
            <MenuItem value="" disabled>
              <em>Select course</em>
            </MenuItem>
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Paper
          variant="outlined"
          sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", p: 2, display: "flex", flexDirection: "column", gap: 1.5, opacity: !form.courseId ? 0.6 : 1, pointerEvents: !form.courseId ? "none" : "auto" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Building2 size={14} style={{ color: "#475569" }} />
              Campus Branch Allocation
            </Typography>
            {branches.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button variant="text" size="small" onClick={selectAllBranches} sx={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "none", p: 0, minWidth: "auto" }}>
                  Select All
                </Button>
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  •
                </Typography>
                <Button variant="text" size="small" onClick={clearAllBranches} sx={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "none", p: 0, minWidth: "auto" }}>
                  Clear
                </Button>
              </Box>
            )}
          </Box>
          {!form.courseId && (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: "12px", fontSize: "0.75rem", bgcolor: "white", borderColor: "#D6E0EB" }}>
              Please select a course first to configure branches.
            </Alert>
          )}

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
                      All Branches / Central Hybrid Program (Conduct in all campuses)
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Paper>

              {!isAllBranches && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>
                    Select the branches conducting this batch:
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
                          <Typography
                            variant="caption"
                            sx={{ fontSize: "0.75rem", fontWeight: isSelected ? 600 : 500, color: isSelected ? "white" : "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
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

        <Paper
          variant="outlined"
          sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", p: 2, display: "flex", flexDirection: "column", gap: 1.5, opacity: !form.courseId ? 0.6 : 1, pointerEvents: !form.courseId ? "none" : "auto" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Clock size={14} style={{ color: "#475569" }} />
              Batch Timing (Clock Time Setter) *
            </Typography>
            <Chip
              label={form.timing || "Set Time"}
              size="small"
              sx={{ bgcolor: "#1E3A5F", color: "white", fontWeight: 700, fontSize: "11px", height: 22, borderRadius: "6px" }}
            />
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
              disabled={!form.courseId}
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
              disabled={!form.courseId}
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
            placeholder="e.g. 08:00 AM - 10:00 AM"
            slotProps={{ inputLabel: { shrink: true }, formHelperText: { sx: { fontSize: "10px", color: "#94A3B8" } } } as any}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            helperText="Fine-tune text"
          />
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
              <Chip
                label={`${totalCapacity} Seats Across ${activeBranchList.length} Branches`}
                size="small"
                sx={{ bgcolor: "#1E3A5F", color: "white", fontWeight: 700, fontSize: "0.75rem", height: 26, borderRadius: "12px" }}
              />
            </Paper>
          </Paper>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField
              label="Batch Capacity (Seats) *"
              type="number"
              required
              fullWidth
              size="small"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="Enter number of seats"
              disabled={!form.courseId}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1 } as any, input: { startAdornment: <InputAdornment position="start"><Users size={14} style={{ color: "#94A3B8" }} /></InputAdornment> } as any }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
            <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}>
              <InputLabel id="add-batch-status-label">Batch Status</InputLabel>
              <Select labelId="add-batch-status-label" label="Batch Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="Active">Active (Ongoing)</MenuItem>
                <MenuItem value="Upcoming">Upcoming (Admissions Open)</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {activeBranchList.length > 1 && (
          <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}>
            <InputLabel id="add-batch-status-multi-label">Batch Status</InputLabel>
            <Select labelId="add-batch-status-multi-label" label="Batch Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="Active">Active (Admissions Open)</MenuItem>
              <MenuItem value="Upcoming">Upcoming (Schedule Announced)</MenuItem>
              <MenuItem value="Closed">Closed (Archived)</MenuItem>
            </Select>
          </FormControl>
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
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
          >
            {loading ? "Adding Batch..." : "Add Batch"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
