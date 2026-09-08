"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { DurationPicker } from "./DurationPicker";
import { calculateCourseEndDate } from "@/lib/course-duration";
import { formatDate } from "@/lib/utils";
import type { CourseItem } from "./CoursesTable";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import FormGroup from "@mui/material/FormGroup";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import { Building2, Calendar } from "lucide-react";

type BranchOption = {
  id: string;
  name: string;
  city: string | null;
  isMainBranch?: boolean;
};

const COMMON_EXAMS = [
  "JEE Main + Advanced",
  "NEET-UG (Medical)",
  "Class 10 CBSE Board",
  "Class 12 CBSE Board",
  "Foundation (Class 8-10)",
  "Olympiad / NTSE",
  "UPSC / Govt Exams",
  "Spoken English",
];

export function EditCourseDrawer({
  open,
  onClose,
  course,
  availableBranches = [],
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  course: CourseItem | null;
  availableBranches?: BranchOption[];
  onUpdated?: () => void;
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    fee: "",
    feeType: "ONE_TIME" as "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL",
    targetExam: "",
    duration: "1 Year",
    startDate: "",
    eligibility: "",
    description: "",
    academicYear: "",
    isAllBranches: true,
    branchIds: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (course) {
      setForm({
        name: course.name,
        fee: course.fee.toString(),
        feeType: (course.feeType as "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL") || "ONE_TIME",
        targetExam: course.targetExam || "",
        academicYear: (course as { academicYear?: string | null }).academicYear || "",
        duration: course.duration || "1 Year",
        startDate: course.startDate ? course.startDate.slice(0, 10) : "",
        eligibility: course.eligibility || "",
        description: course.description || "",
        isAllBranches: course.isAllBranches !== false,
        branchIds: course.branches ? course.branches.map((b) => b.id) : [],
      });
      setError("");
    }
  }, [course, open]);

  const handleBranchToggle = (branchId: string) => {
    setForm((prev) => {
      const exists = prev.branchIds.includes(branchId);
      return {
        ...prev,
        branchIds: exists
          ? prev.branchIds.filter((id) => id !== branchId)
          : [...prev.branchIds, branchId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    setError("");

    if (!form.isAllBranches && form.branchIds.length === 0 && availableBranches.length > 0) {
      setError("Please select at least one branch or choose 'Available Across All Branches'.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          fee: Number(form.fee),
          feeType: form.feeType,
          targetExam: form.targetExam ? form.targetExam.trim() : null,
          academicYear: form.academicYear ? form.academicYear.trim() : null,
          duration: form.duration ? form.duration.trim() : null,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
          eligibility: form.eligibility ? form.eligibility.trim() : null,
          description: form.description ? form.description.trim() : null,
          isAllBranches: form.isAllBranches,
          branchIds: form.isAllBranches ? [] : form.branchIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update course");
      }

      onClose();
      if (onUpdated) onUpdated();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={course ? `Edit: ${course.name}` : "Edit Course"}>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.875rem" }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Course / Program Name"
          required
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. JEE Main + Advanced 2-Year Pinnacle"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <TextField
          label="Target Exam / Stream"
          fullWidth
          size="small"
          value={form.targetExam}
          onChange={(e) => setForm({ ...form, targetExam: e.target.value })}
          placeholder="e.g. NEET-UG or CBSE 10"
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          helperText={COMMON_EXAMS.slice(0, 4).join(" • ")}
          slotProps={{ inputLabel: { shrink: true }, formHelperText: { sx: { fontSize: "10px", color: "#7E9BBC" } } }}
        />

        <TextField
          label="Academic Session / Year (Optional)"
          fullWidth
          size="small"
          value={form.academicYear}
          onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
          placeholder="e.g. 2026-2027 or Session 2026-27"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <DurationPicker
          value={form.duration}
          onChange={(val) => setForm({ ...form, duration: val })}
          label="Course Duration (Days / Months / Years)"
        />

        <Box>
          <TextField
            label="Course Starting Date (Commencement Date)"
            type="date"
            fullWidth
            size="small"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          {form.startDate && (
            <Paper
              variant="outlined"
              sx={{
                mt: 1,
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
                Commences on <strong>{formatDate(form.startDate)}</strong> — Expected completion:{" "}
                <strong>{formatDate(calculateCourseEndDate(new Date(form.startDate), form.duration || "1 Year"))}</strong>
              </Typography>
            </Paper>
          )}
        </Box>

        <TextField
          label="Target Standard / Eligibility (Optional)"
          fullWidth
          size="small"
          value={form.eligibility}
          onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
          placeholder="e.g. Class 10 Passed / Moving to Class 11"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <Paper
          variant="outlined"
          sx={{
            borderRadius: "12px",
            borderColor: "#D6E0EB",
            bgcolor: "rgba(247,245,240,0.5)",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", fontSize: "0.75rem" }}>
            Fee & Billing Structure
          </Typography>

          <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}>
            <InputLabel id="edit-fee-type-label">Billing Frequency</InputLabel>
            <Select
              labelId="edit-fee-type-label"
              label="Billing Frequency"
              value={form.feeType}
              onChange={(e) => setForm({ ...form, feeType: e.target.value as typeof form.feeType })}
            >
              <MenuItem value="ONE_TIME">Full Course Fee (One-time / Total)</MenuItem>
              <MenuItem value="MONTHLY">Monthly Fee (Recurring / mo)</MenuItem>
              <MenuItem value="QUARTERLY">Quarterly Fee (Every 3 Months)</MenuItem>
              <MenuItem value="ANNUAL">Per Year Fee (Annual basis)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label={
              form.feeType === "ONE_TIME"
                ? "Fee Amount (₹) — Full Program Total"
                : form.feeType === "MONTHLY"
                  ? "Fee Amount (₹) — Per Month"
                  : form.feeType === "QUARTERLY"
                    ? "Fee Amount (₹) — Per Quarter"
                    : "Fee Amount (₹) — Per Year"
            }
            required
            fullWidth
            size="small"
            type="number"
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: e.target.value })}
            placeholder={form.feeType === "ONE_TIME" ? "85000" : form.feeType === "MONTHLY" ? "4500" : form.feeType === "QUARTERLY" ? "12000" : "50000"}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: 0, step: 1 },
              input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontWeight: 600 } }}
          />
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: "12px",
            borderColor: "#D6E0EB",
            bgcolor: "white",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Building2 size={15} style={{ color: "#475569" }} /> Branch Allocation
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
              Choose which campus branches offer this program
            </Typography>
          </Box>

          {availableBranches.filter((b) => !b.isMainBranch).length === 0 ? (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: "12px", fontSize: "0.75rem", bgcolor: "#EEF2F7", borderColor: "#D6E0EB" }}>
              This institute has only one branch (Main Branch) — no branch selection needed.
            </Alert>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <FormControl component="fieldset">
                <RadioGroup
                  value={form.isAllBranches ? "all" : "specific"}
                  onChange={(e) => {
                    const isAll = e.target.value === "all";
                    setForm({ ...form, isAllBranches: isAll, branchIds: isAll ? [] : form.branchIds });
                  }}
                  row
                  sx={{ gap: 2 }}
                >
                  <FormControlLabel
                    value="all"
                    control={<Radio size="small" sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }} />}
                    label={<Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>Available Across All Branches ({availableBranches.length})</Typography>}
                  />
                  <FormControlLabel
                    value="specific"
                    control={<Radio size="small" sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }} />}
                    label={<Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>Select Specific Branches</Typography>}
                  />
                </RadioGroup>
              </FormControl>

              {!form.isAllBranches && (
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: "12px",
                    borderColor: "#D6E0EB",
                    bgcolor: "#F8FAFC",
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    maxHeight: 144,
                    overflowY: "auto",
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600, color: "#4E6E93" }}>
                    Select branches where this course is taught:
                  </Typography>
                  <FormGroup sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
                    {availableBranches.map((branch) => {
                      const isSelected = form.branchIds.includes(branch.id);
                      return (
                        <Paper
                          key={branch.id}
                          variant="outlined"
                          onClick={() => handleBranchToggle(branch.id)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1,
                            borderRadius: "12px",
                            cursor: "pointer",
                            borderColor: isSelected ? "#1E3A5F" : "#D6E0EB",
                            bgcolor: isSelected ? "#EEF2F7" : "white",
                            transition: "all 0.15s",
                            "&:hover": { bgcolor: isSelected ? "#E2E8F0" : "#F8FAFC" },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                            <Checkbox
                              checked={isSelected}
                              size="small"
                              sx={{ p: 0.25, color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }}
                              onChange={() => handleBranchToggle(branch.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: isSelected ? 700 : 500, color: isSelected ? "#1E3A5F" : "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {branch.name} {branch.city ? `(${branch.city})` : ""}
                            </Typography>
                          </Box>
                          {isSelected && <Chip label="✓" size="small" sx={{ height: 18, minWidth: 18, fontSize: "10px", bgcolor: "#1E3A5F", color: "white", "& .MuiChip-label": { px: 0.5 } }} />}
                        </Paper>
                      );
                    })}
                  </FormGroup>
                </Paper>
              )}
            </Box>
          )}
        </Paper>

        <TextField
          label="Course Details, Syllabus & Inclusions (Optional)"
          fullWidth
          size="small"
          multiline
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Course syllabus description..."
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

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
            {loading ? "Saving Changes..." : "Update Course"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
