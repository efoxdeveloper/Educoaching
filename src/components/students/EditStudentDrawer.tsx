"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { DurationPicker } from "@/components/courses/DurationPicker";
import { FeeInstallment } from "@/lib/installments";
import { Camera, Upload } from "lucide-react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";

export interface EditableStudent {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  parentEmail?: string | null;
  photoUrl?: string | null;
  parentMobile?: string | null;
  courseId: string;
  batchId?: string | null;
  status: string;
  totalFee: number | string;
  dueDate?: string | null;
  plan?: string;
  courseDuration?: string | null;
  monthlyAmount?: number | string | null;
  installmentPlan?: any;
}

export function EditStudentDrawer({
  open,
  onClose,
  student,
  courses,
  batches,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  student: EditableStudent | null;
  courses: { id: string; name: string; fee: string; duration?: string | null }[];
  batches: { id: string; name: string; courseId: string }[];
  onUpdated?: () => void;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [totalFee, setTotalFee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [plan, setPlan] = useState("MONTHLY");
  const [courseDuration, setCourseDuration] = useState("1 Year");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Photograph size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  useEffect(() => {
    if (student) {
      setName(student.name || "");
      setMobile(student.mobile || "");
      setEmail(student.email || "");
      setParentEmail(student.parentEmail || "");
      setParentMobile(student.parentMobile || "");
      setCourseId(student.courseId || "");
      setBatchId(student.batchId || "");
      setStatus(student.status || "ACTIVE");
      setTotalFee(String(student.totalFee || ""));
      setDueDate(student.dueDate ? student.dueDate.split("T")[0] : "");
      setPlan(student.plan || "MONTHLY");
      setCourseDuration(student.courseDuration || "1 Year");
      setMonthlyAmount(student.monthlyAmount ? String(student.monthlyAmount) : "");
      setPhotoUrl(student.photoUrl || null);
      setError("");
    }
  }, [student, open]);

  const courseBatches = batches.filter((b) => b.courseId === courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    if (!name.trim() || !mobile.trim() || !courseId || totalFee === "") {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          email: email.trim() || null,
          parentMobile: parentMobile.trim() || null,
          parentEmail: parentEmail.trim() || null,
          photoUrl: photoUrl || null,
          courseId,
          batchId: batchId || null,
          status,
          totalFee: plan === "MONTHLY" && monthlyAmount ? Number(monthlyAmount) : Number(totalFee),
          dueDate: dueDate || null,
          plan,
          courseDuration: courseDuration || null,
          monthlyAmount: plan === "MONTHLY" && monthlyAmount ? Number(monthlyAmount) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update student profile");
      }

      onClose();
      if (onUpdated) onUpdated();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update student profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Edit Student Profile">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.875rem" }}>
            {error}
          </Alert>
        )}

        {/* Student Photograph */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Camera size={14} style={{ color: "#4E6E93" }} />
              Student Photograph
              <Box component="span" sx={{ ml: 0.5, px: 0.75, py: 0.25, borderRadius: "6px", bgcolor: "#EEF2F7", border: "1px solid #D6E0EB", fontSize: "10px", fontWeight: 600 }}>Optional</Box>
            </Typography>
            {photoUrl && (
              <Button size="small" onClick={handleRemovePhoto} sx={{ fontSize: "11px", fontWeight: 600, color: "#DC2626", textTransform: "none", p: 0, minWidth: 0 }}>
                Remove Photo
              </Button>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src={photoUrl || undefined}
              variant="rounded"
              sx={{ width: 64, height: 64, borderRadius: "12px", border: "2px dashed #AFC3D9", bgcolor: "white", color: "#7E9BBC" }}
            >
              {!photoUrl && <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}><Camera size={20} /><Typography variant="caption" sx={{ fontSize: "8px", fontWeight: 700, mt: 0.5 }}>Photo</Typography></Box>}
            </Avatar>

            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569", lineHeight: 1.4 }}>
                Student passport-size photo. Can also be uploaded directly by the student in the Student Portal.
              </Typography>
              <Box>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhotoSelect} />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Upload size={12} />}
                  onClick={() => photoInputRef.current?.click()}
                  sx={{ borderRadius: "8px", borderColor: "#D6E0EB", color: "#334155", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.5, px: 1.5, bgcolor: "white", "&:hover": { bgcolor: "#F8FAFC" } }}
                >
                  {photoUrl ? "Change Photo" : "Upload Passport Photo"}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>

        <TextField
          label="Full Name *"
          required
          fullWidth
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Student Name"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            label="Mobile *"
            required
            fullWidth
            size="small"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 10, inputMode: "numeric" } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Parent Mobile"
            fullWidth
            size="small"
            type="tel"
            value={parentMobile}
            onChange={(e) => setParentMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 10, inputMode: "numeric" } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <TextField
            label="Student Email Address"
            fullWidth
            size="small"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Parent Email (For Portal Access)"
            fullWidth
            size="small"
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@example.com"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <FormControl fullWidth size="small" required>
            <InputLabel id="edit-student-course-label">Course *</InputLabel>
            <Select
              labelId="edit-student-course-label"
              label="Course *"
              value={courseId}
              onChange={(e) => {
                const cid = e.target.value;
                setCourseId(cid);
                setBatchId("");
                const c = courses.find((x) => x.id === cid);
                if (c?.duration) setCourseDuration(c.duration);
              }}
              sx={{ borderRadius: "12px", bgcolor: "white" }}
            >
              <MenuItem value="">Select Course</MenuItem>
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.875rem" }}>
                  {c.name} {c.duration ? `(${c.duration})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="edit-student-batch-label">Batch</InputLabel>
            <Select
              labelId="edit-student-batch-label"
              label="Batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              disabled={!courseId}
              sx={{ borderRadius: "12px", bgcolor: "white" }}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {courseBatches.map((b) => (
                <MenuItem key={b.id} value={b.id} sx={{ fontSize: "0.875rem" }}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <DurationPicker value={courseDuration} onChange={(val) => setCourseDuration(val)} label="Course Duration (Days / Months / Years)" />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <FormControl fullWidth size="small" required>
            <InputLabel id="edit-student-status-label">Enrollment Status *</InputLabel>
            <Select labelId="edit-student-status-label" label="Enrollment Status *" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ borderRadius: "12px", bgcolor: "white" }}>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="ON_HOLD">On Hold</MenuItem>
              <MenuItem value="INACTIVE">Inactive / Archived</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="edit-student-plan-label">Fee Billing Plan</InputLabel>
            <Select labelId="edit-student-plan-label" label="Fee Billing Plan" value={plan} onChange={(e) => setPlan(e.target.value)} sx={{ borderRadius: "12px", bgcolor: "white" }}>
              <MenuItem value="ONE_TIME">Full Fee (One-Time)</MenuItem>
              <MenuItem value="INSTALLMENTS">Installment Plan</MenuItem>
              <MenuItem value="MONTHLY">Monthly Recurring</MenuItem>
              <MenuItem value="DEMO">Demo / 7-Day Trial</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {plan === "MONTHLY" && (
          <TextField
            label="Monthly Fee (₹) — Every Month"
            fullWidth
            size="small"
            type="number"
            value={monthlyAmount}
            onChange={(e) => {
              setMonthlyAmount(e.target.value);
              setTotalFee(e.target.value);
            }}
            placeholder="e.g. 4500"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            label="Total Agreed Fee (₹) *"
            required
            fullWidth
            size="small"
            type="number"
            value={totalFee}
            onChange={(e) => setTotalFee(e.target.value)}
            placeholder="Total Course Fee"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Next Fee Due Date"
            fullWidth
            size="small"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
          <Button type="button" variant="outlined" fullWidth onClick={onClose} sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#64748b", fontWeight: 600, textTransform: "none", py: 1.25 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
