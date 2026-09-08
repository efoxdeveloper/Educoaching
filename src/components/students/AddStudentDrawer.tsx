"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DurationPicker } from "@/components/courses/DurationPicker";
import { calculateCourseEndDate, getDurationInMonths } from "@/lib/course-duration";
import {
  generateInstallmentSchedule,
  type FeeInstallment,
} from "@/lib/installments";
import { Calendar, Building2, Split, CheckCircle, AlertTriangle, Ticket, Percent, CreditCard, Camera, Upload } from "lucide-react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Slider from "@mui/material/Slider";
import CircularProgress from "@mui/material/CircularProgress";

type Course = {
  id: string;
  name: string;
  fee: string;
  duration?: string | null;
  feeType?: string;
};

type Batch = {
  id: string;
  name: string;
  courseId: string;
  branchId?: string | null;
  isAllBranches?: boolean;
  timing?: string;
  status?: string;
  endDate?: string | null;
  branch?: { id: string; name: string; city?: string | null } | null;
  branches?: { id: string; name: string; city?: string | null }[];
};

type Branch = { id: string; name: string; city?: string | null; isMainBranch?: boolean };

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50];

export function AddStudentDrawer({
  open,
  onClose,
  courses,
  batches,
  branches = [],
}: {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  batches: Batch[];
  branches?: Branch[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    parentMobile: "",
    parentEmail: "",
    courseId: "",
    branchId: "",
    batchId: "",
  });

  const selectedCourse = courses.find((c) => c.id === form.courseId);

  // Course Duration (can be customized per student: 15 Days, 1 Year 6 Months, etc.)
  const [studentDuration, setStudentDuration] = useState("1 Year");

  // Fee Mode: ONE_TIME, INSTALLMENTS, MONTHLY, DEMO
  const [feeMode, setFeeMode] = useState<"ONE_TIME" | "INSTALLMENTS" | "MONTHLY" | "DEMO">("ONE_TIME");

  // Installment count: 2 (relaxation), 3, 4
  const [installmentCount, setInstallmentCount] = useState<number>(2);
  const [installments, setInstallments] = useState<FeeInstallment[]>([]);

  // Registration Fee / Seat Booking Option
  const [enableSeatBooking, setEnableSeatBooking] = useState(false);
  const [registrationFee, setRegistrationFee] = useState("2000");

  // Discount Option Bar (Up to 30% faculty self-service, >30% owner approval)
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState("");
  const [totalFee, setTotalFee] = useState("");
  const [initialPayment, setInitialPayment] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");

  // Payment Collection Options on Student Enrollment
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Net Banking" | "Debit / Credit Card" | "Cheque">("UPI");
  const [paymentType, setPaymentType] = useState<"FIRST_INSTALLMENT" | "SEAT_BOOKING" | "FULL_FEE" | "CUSTOM" | "PAY_LATER">("FIRST_INSTALLMENT");
  const [paymentReference, setPaymentReference] = useState("");

  const handleSelectPaymentType = (type: "FIRST_INSTALLMENT" | "SEAT_BOOKING" | "FULL_FEE" | "CUSTOM" | "PAY_LATER") => {
    setPaymentType(type);
    if (type === "PAY_LATER") {
      setInitialPayment("0");
    } else if (type === "SEAT_BOOKING") {
      setEnableSeatBooking(true);
      setInitialPayment(registrationFee || "2000");
    } else if (type === "FIRST_INSTALLMENT") {
      if (feeMode === "INSTALLMENTS" && installments.length > 0) {
        setInitialPayment(String(installments[0]?.amount || 0));
      } else if (feeMode === "MONTHLY") {
        setInitialPayment(String(monthlyAmount || 0));
      } else {
        setInitialPayment(String(Math.round(Number(totalFee || 0) / 2)));
      }
    } else if (type === "FULL_FEE") {
      setInitialPayment(String(totalFee || 0));
    } else if (type === "CUSTOM") {
      if (!initialPayment || initialPayment === "0") {
        setInitialPayment(
          String(
            feeMode === "MONTHLY"
              ? monthlyAmount || ""
              : installments[0]?.amount || Math.round(Number(totalFee || 0) / 2) || ""
          )
        );
      }
    }
  };

  // Student Photograph (Passport size) - optional at admission, can be uploaded in portal later
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Photograph size should be less than 5MB");
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter batches by selected course AND selected branch
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Completed or expired batches are excluded from active enrollment per branch
      const isExpired =
        b.status === "Completed" ||
        b.status === "Expired" ||
        b.status === "Closed" ||
        (b.endDate && new Date() > new Date(b.endDate));
      if (isExpired) return false;

      const matchCourse = b.courseId === form.courseId;
      const matchBranch =
        !form.branchId ||
        b.isAllBranches ||
        !b.branchId ||
        b.branchId === form.branchId ||
        (b.branches && b.branches.some((br) => br.id === form.branchId));
      return matchCourse && matchBranch;
    });
  }, [batches, form.courseId, form.branchId]);

  // Auto-fill duration and default fee mode when course selection changes
  useEffect(() => {
    if (selectedCourse) {
      const dur = selectedCourse.duration || "1 Year";
      setStudentDuration(dur);

      if (selectedCourse.feeType === "MONTHLY") {
        setFeeMode("MONTHLY");
      }
    }
  }, [form.courseId, selectedCourse]);

  // Calculate duration in whole months for monthly fee division
  const durationMonths = useMemo(() => {
    return getDurationInMonths(studentDuration || selectedCourse?.duration || "1 Year");
  }, [studentDuration, selectedCourse?.duration]);

  // Auto-calculate fee from course + discount percent + duration
  useEffect(() => {
    if (feeMode === "DEMO") {
      setTotalFee("0");
      setMonthlyAmount("0");
      return;
    }
    if (!selectedCourse) return;
    const base = Number(selectedCourse.fee);
    const discounted = Math.max(0, Math.round(base * (1 - discountPercent / 100)));

    if (feeMode === "MONTHLY") {
      if (selectedCourse.feeType === "MONTHLY") {
        setMonthlyAmount(discounted.toString());
        setTotalFee((discounted * durationMonths).toString());
      } else {
        setTotalFee(discounted.toString());
        const perMonth = Math.max(1, Math.round(discounted / durationMonths));
        setMonthlyAmount(perMonth.toString());
      }
    } else {
      setTotalFee(discounted.toString());
      const perMonth = Math.max(1, Math.round(discounted / durationMonths));
      setMonthlyAmount(perMonth.toString());
    }
  }, [form.courseId, discountPercent, feeMode, selectedCourse?.fee, selectedCourse?.feeType, durationMonths]);

  // Auto-generate installments when in INSTALLMENTS mode
  useEffect(() => {
    if (feeMode === "INSTALLMENTS" && Number(totalFee) > 0) {
      const schedule = generateInstallmentSchedule({
        totalFee: Number(totalFee),
        numberOfInstallments: installmentCount,
        startDate: new Date(),
      });
      setInstallments(schedule);
    }
  }, [feeMode, installmentCount, totalFee]);

  // Keep initialPayment synchronized with preset paymentType
  useEffect(() => {
    if (paymentType === "PAY_LATER") {
      setInitialPayment("0");
    } else if (paymentType === "SEAT_BOOKING") {
      setInitialPayment(registrationFee || "2000");
    } else if (paymentType === "FIRST_INSTALLMENT") {
      if (feeMode === "INSTALLMENTS" && installments.length > 0) {
        setInitialPayment(String(installments[0]?.amount || 0));
      } else if (feeMode === "MONTHLY") {
        setInitialPayment(String(monthlyAmount || 0));
      } else {
        setInitialPayment(String(Math.round(Number(totalFee || 0) / 2)));
      }
    } else if (paymentType === "FULL_FEE") {
      setInitialPayment(String(totalFee || 0));
    }
  }, [paymentType, feeMode, installments, totalFee, monthlyAmount, registrationFee]);

  const baseFee = selectedCourse ? Number(selectedCourse.fee) : 0;
  const discountSavings = Math.max(0, Math.round(baseFee * (discountPercent / 100)));
  const requiresOwnerApproval = discountPercent > 30;

  // Calculate estimated course end date
  const estimatedEndDate = useMemo(() => {
    return calculateCourseEndDate(new Date(), studentDuration || "1 Year");
  }, [studentDuration]);

  // Handle custom installment editing
  const handleInstallmentDateChange = (idx: number, newDate: string) => {
    setInstallments((prev) =>
      prev.map((inst, i) => (i === idx ? { ...inst, dueDate: newDate } : inst))
    );
  };

  const handleInstallmentAmountChange = (idx: number, newAmount: number) => {
    setInstallments((prev) => {
      const updated = prev.map((inst, i) =>
        i === idx ? { ...inst, amount: Math.max(0, newAmount) } : inst
      );
      const newSum = updated.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
      setTotalFee(newSum.toString());
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.email?.trim()) {
      setError("Email address is mandatory for student account creation.");
      return;
    }

    setLoading(true);

    try {
      const finalPlan = feeMode === "DEMO" ? "DEMO" : feeMode;
      const initialPaid = Number(initialPayment) || 0;

      let processedInstallments = null;
      let dueDateVal: string | null = null;

      if (feeMode === "INSTALLMENTS" && installments.length > 0) {
        processedInstallments = installments;
        const firstPending = installments.find((i) => i.status !== "PAID");
        dueDateVal = firstPending ? firstPending.dueDate : null;
      }

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          branchId: form.branchId || null,
          totalFee: feeMode === "MONTHLY" ? Number(monthlyAmount || 0) * durationMonths : Number(totalFee),
          paidFee: initialPaid,
          dueDate: dueDateVal,
          isDemo: feeMode === "DEMO",
          plan: finalPlan,
          monthlyAmount: feeMode === "MONTHLY" ? Number(monthlyAmount || 0) : null,
          courseDuration: studentDuration,
          installmentPlan: feeMode === "INSTALLMENTS" ? processedInstallments : null,
          registrationFee: enableSeatBooking ? Number(registrationFee) : null,
          isSeatBooked: enableSeatBooking,
          discountPercent: discountPercent > 0 ? discountPercent : null,
          discountReason: requiresOwnerApproval ? discountReason : null,
          paymentMethod: initialPaid > 0 ? paymentMode : null,
          paymentType: initialPaid > 0 ? paymentType : null,
          paymentReference: initialPaid > 0 && paymentReference.trim() ? paymentReference.trim() : null,
          photoUrl: photoUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add student");
      }

      setForm({
        name: "",
        mobile: "",
        email: "",
        parentMobile: "",
        parentEmail: "",
        courseId: "",
        branchId: "",
        batchId: "",
      });
      setPhotoUrl(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      setDiscountPercent(0);
      setDiscountReason("");
      setFeeMode("ONE_TIME");
      setEnableSeatBooking(false);
      setRegistrationFee("2000");
      setInitialPayment("");
      setMonthlyAmount("");
      setPaymentMode("UPI");
      setPaymentType("FIRST_INSTALLMENT");
      setPaymentReference("");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add student. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Enroll New Student">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.875rem" }}>
            {error}
          </Alert>
        )}

        {/* Student Photograph Upload (Optional at admission) */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Camera size={14} style={{ color: "#4E6E93" }} />
              Student Photograph
              <Chip label="Optional" size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 600, bgcolor: "#EEF2F7", border: "1px solid #D6E0EB" }} />
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
              sx={{
                width: 64,
                height: 64,
                borderRadius: "12px",
                border: "2px dashed #AFC3D9",
                bgcolor: "white",
                color: "#7E9BBC",
                fontSize: "10px",
                flexShrink: 0,
              }}
            >
              {!photoUrl && <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}><Camera size={20} /><Typography variant="caption" sx={{ fontSize: "8px", fontWeight: 700, mt: 0.5 }}>Photo</Typography></Box>}
            </Avatar>

            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569", lineHeight: 1.4 }}>
                Ask for a passport-size photo. <em>If not available right now, that&apos;s okay—the student can upload it directly from their <Box component="span" sx={{ fontWeight: 700 }}>Student Portal</Box>.</em>
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
          label="Student Full Name *"
          required
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Student Name"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            label="Mobile Number *"
            required
            fullWidth
            size="small"
            type="tel"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="10-digit mobile"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 10, inputMode: "numeric" } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Parent's Mobile / WhatsApp"
            fullWidth
            size="small"
            type="tel"
            value={form.parentMobile}
            onChange={(e) => setForm({ ...form, parentMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="10-digit mobile"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 10, inputMode: "numeric" } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <TextField
            label="Student Email Address *"
            required
            fullWidth
            size="small"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="student@example.com"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Parent Email (For Portal Access)"
            fullWidth
            size="small"
            type="email"
            value={form.parentEmail}
            onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
            placeholder="parent@example.com"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        {/* Branch & Batch Allocation */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Building2 size={14} style={{ color: "#4E6E93" }} />
              Campus & Batch Allocation
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC" }}>Batches & timings vary by branch</Typography>
          </Box>

          {branches.filter((b) => !b.isMainBranch).length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel shrink id="add-student-course-label-single">Course Program *</InputLabel>
                <Select notched displayEmpty labelId="add-student-course-label-single" label="Course Program *" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, batchId: "" })} sx={{ borderRadius: "12px", bgcolor: "white" }}>
                  <MenuItem value="" disabled>
                    <em>Select course</em>
                  </MenuItem>
                  {courses.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.875rem" }}>
                      {c.name} — {formatCurrency(c.fee)} {c.duration ? `(${c.duration})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info" variant="outlined" sx={{ borderRadius: "12px", fontSize: "0.75rem", bgcolor: "#EEF2F7", borderColor: "#D6E0EB" }}>
                This institute has only one branch (Main Branch) — no branch selection needed.
              </Alert>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel shrink id="add-student-course-label">Course Program *</InputLabel>
                <Select notched displayEmpty labelId="add-student-course-label" label="Course Program *" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, batchId: "" })} sx={{ borderRadius: "12px", bgcolor: "white" }}>
                  <MenuItem value="" disabled>
                    <em>Select course</em>
                  </MenuItem>
                  {courses.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.875rem" }}>
                      {c.name} — {formatCurrency(c.fee)} {c.duration ? `(${c.duration})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="add-student-branch-label">Branch / Campus Location</InputLabel>
                <Select labelId="add-student-branch-label" label="Branch / Campus Location" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value, batchId: "" })} sx={{ borderRadius: "12px", bgcolor: "white" }}>
                  <MenuItem value="">All Branches / Main Branch</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id} sx={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <span>
                          {b.name} {b.city ? `(${b.city})` : ""}
                        </span>
                        {b.isMainBranch && <Chip label="Main" size="small" sx={{ height: 16, fontSize: "9px", fontWeight: 700, bgcolor: "#F5F3FF", color: "#4C1D95", border: "1px solid #DDD6FE" }} />}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          <FormControl fullWidth size="small" disabled={!form.courseId}>
            <InputLabel id="add-student-batch-label">Assigned Batch & Timing</InputLabel>
            <Select labelId="add-student-batch-label" label="Assigned Batch & Timing" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} sx={{ borderRadius: "12px", bgcolor: "white" }} disabled={!form.courseId}>
              <MenuItem value="">Unassigned Batch</MenuItem>
              {filteredBatches.map((b) => {
                const branchLabel = b.isAllBranches
                  ? "All Campuses"
                  : b.branches && b.branches.length > 0
                  ? b.branches.map((br) => br.name).join(", ")
                  : b.branch
                  ? b.branch.name
                  : "";
                return (
                  <MenuItem key={b.id} value={b.id} sx={{ fontSize: "0.875rem" }}>
                    {b.name} {b.timing ? `(${b.timing})` : ""} {branchLabel ? `• ${branchLabel}` : ""}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          {filteredBatches.length === 0 && (
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#D97706" }}>
              No active batches found for this course at the selected campus. You can create a batch under Batches.
            </Typography>
          )}
        </Paper>

        {/* Course Duration for Student (Days, Months, Years) */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <DurationPicker value={studentDuration} onChange={(val) => setStudentDuration(val)} label="Student's Course Duration (Days / Months / Years)" />
          <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: 0.5, pl: 0.5 }}>
            <Calendar size={12} style={{ color: "#94A3B8" }} />
            Enrolling today means student completes on <Box component="span" sx={{ fontWeight: 700 }}>{formatDate(estimatedEndDate)}</Box> (~{studentDuration})
          </Typography>
        </Box>

        {/* Registration Fees Option to Book Student Seat */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#A7F3D0", bgcolor: "#ECFDF5", display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <FormControlLabel
              control={<Checkbox checked={enableSeatBooking} onChange={(e) => setEnableSeatBooking(e.target.checked)} size="small" sx={{ color: "#059669", "&.Mui-checked": { color: "#059669" } }} />}
              label={
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#065f46", display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Ticket size={14} style={{ color: "#059669" }} />
                  Book Student Seat with Registration Fee
                </Typography>
              }
            />
            <Chip label="Seat Reservation" size="small" sx={{ height: 20, fontSize: "10px", fontWeight: 600, bgcolor: "#D1FAE5", color: "#065f46", border: "1px solid #A7F3D0" }} />
          </Box>

          {enableSeatBooking && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, pt: 0.5 }}>
              <TextField
                label="Registration / Booking Fee (₹)"
                fullWidth
                size="small"
                type="number"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
                placeholder="2000"
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } as any }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", "& input": { fontWeight: 700, color: "#065f46" } } }}
              />
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: "12px", bgcolor: "white", borderColor: "#A7F3D0", display: "flex", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569" }}>
                  Reserves the student&apos;s seat in the batch. Counted as an advance booking deposit towards tuition fees.
                </Typography>
              </Paper>
            </Box>
          )}
        </Paper>

        {/* Discount Option Bar: Faculty up to 30%, Owner Approval > 30% */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Percent size={14} style={{ color: "#4E6E93" }} />
              Discount & Concession Option Bar
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b" }}>
              {discountPercent}% Off {discountSavings > 0 && `(Save ₹${discountSavings.toLocaleString("en-IN")})`}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {DISCOUNT_PRESETS.map((pct) => (
              <Chip
                key={pct}
                label={pct === 0 ? "No Discount" : `${pct}%${pct > 30 ? " (Owner)" : ""}`}
                clickable
                onClick={() => setDiscountPercent(pct)}
                size="small"
                sx={{
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.70rem",
                  height: 26,
                  bgcolor: discountPercent === pct ? (pct > 30 ? "#D97706" : "#1E3A5F") : pct > 30 ? "#FFFBEB" : "#F8FAFC",
                  color: discountPercent === pct ? "white" : pct > 30 ? "#92400e" : "#334155",
                  border: discountPercent === pct ? "1px solid transparent" : pct > 30 ? "1px solid #FDE68A" : "1px solid #D6E0EB",
                  "&:hover": { bgcolor: discountPercent === pct ? (pct > 30 ? "#B45309" : "#182F4C") : pct > 30 ? "#FEF3C7" : "#EEF2F7" },
                }}
              />
            ))}
          </Box>

          <Box sx={{ px: 0.5 }}>
            <Slider
              value={discountPercent}
              onChange={(_, v) => setDiscountPercent(v as number)}
              min={0}
              max={60}
              step={1}
              valueLabelDisplay="auto"
              sx={{ color: "#1E3A5F", height: 6, "& .MuiSlider-thumb": { width: 16, height: 16 }, "& .MuiSlider-track": { height: 6, borderRadius: 999 }, "& .MuiSlider-rail": { height: 6, borderRadius: 999, bgcolor: "#E2E8F0" } }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: "10px", color: "#64748b" }}>0% (Standard)</Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#059669" }}>30% (Faculty Max Limit)</Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#D97706" }}>50%+ (Owner Approval)</Typography>
            </Box>
          </Box>

          {!requiresOwnerApproval && discountPercent > 0 && (
            <Alert severity="success" icon={<CheckCircle size={15} />} sx={{ borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #A7F3D0", bgcolor: "#ECFDF5" }}>
              <strong>Faculty Pre-approved Discount:</strong> {discountPercent}% discount is within the standard faculty limit (≤ 30%) and applied immediately.
            </Alert>
          )}

          {requiresOwnerApproval && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#FDE68A", bgcolor: "#FFFBEB", display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#92400e", fontWeight: 700, fontSize: "0.75rem" }}>
                <AlertTriangle size={16} style={{ color: "#D97706" }} />
                Special Discount ({discountPercent}%): Exceeds Faculty 30% Cap
              </Box>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#92400e" }}>
                Parents requested <Box component="span" sx={{ fontWeight: 700 }}>{discountPercent}% discount</Box>. A formal approval request and notification will be dispatched to the <Box component="span" sx={{ fontWeight: 700 }}>Institute Owner&apos;s Dashboard</Box> for allowance.
              </Typography>
              <TextField
                label="Justification / Reason for Owner *"
                required
                fullWidth
                size="small"
                multiline
                rows={2}
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="e.g. Sibling studying in Class 12, top ranker merit concession, or parent financial relaxation requested."
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
              />
            </Paper>
          )}
        </Paper>

        {/* Fee Billing Mode / Process */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", textTransform: "uppercase", letterSpacing: 0.5 }}>Fee Structure & Payment Schedule</Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC" }}>Choose parent payment preference</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {[
              { id: "ONE_TIME", label: "One-Time (100%)", sub: "Full Upfront" },
              { id: "INSTALLMENTS", label: "Installments", sub: "2 or more split" },
              { id: "MONTHLY", label: "Monthly", sub: "Per Month" },
            ].map((opt) => (
              <Paper
                key={opt.id}
                variant="outlined"
                onClick={() => setFeeMode(opt.id as any)}
                sx={{
                  py: 1.25,
                  px: 1,
                  borderRadius: "12px",
                  textAlign: "center",
                  cursor: "pointer",
                  borderColor: feeMode === opt.id ? "#1E3A5F" : "#D6E0EB",
                  bgcolor: feeMode === opt.id ? "#1E3A5F" : "white",
                  color: feeMode === opt.id ? "white" : "#334155",
                  transition: "all 0.15s",
                  "&:hover": { bgcolor: feeMode === opt.id ? "#182F4C" : "#F8FAFC" },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: feeMode === opt.id ? "white" : "#1E293b", display: "block" }}>{opt.label}</Typography>
                <Typography variant="caption" sx={{ fontSize: "10px", color: feeMode === opt.id ? "rgba(255,255,255,0.7)" : "#7E9BBC" }}>{opt.sub}</Typography>
              </Paper>
            ))}
          </Box>

          {feeMode === "INSTALLMENTS" && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Split size={14} style={{ color: "#4E6E93" }} />
                  Installment Relaxation for Parent:
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {[2, 3, 4].map((cnt) => (
                    <Chip
                      key={cnt}
                      label={`${cnt} Installments ${cnt === 2 ? "(50/50)" : ""}`}
                      clickable
                      onClick={() => setInstallmentCount(cnt)}
                      size="small"
                      sx={{
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "0.70rem",
                        height: 24,
                        bgcolor: installmentCount === cnt ? "#1E3A5F" : "#F8FAFC",
                        color: installmentCount === cnt ? "white" : "#334155",
                        border: installmentCount === cnt ? "1px solid #1E3A5F" : "1px solid #D6E0EB",
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 192, overflowY: "auto", pr: 0.5 }}>
                {installments.map((inst, idx) => (
                  <Paper key={inst.id || idx} variant="outlined" sx={{ p: 1.25, borderRadius: "12px", borderColor: "#EEF2F7", bgcolor: "#F8FAFC", display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar sx={{ width: 20, height: 20, fontSize: "10px", fontWeight: 700, bgcolor: "#D6E0EB", color: "#1E3A5F" }}>{idx + 1}</Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#1E293b" }}>{inst.title}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={inst.amount}
                        onChange={(e) => handleInstallmentAmountChange(idx, Number(e.target.value))}
                        slotProps={{ htmlInput: { min: 0 } as any, input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } as any }}
                        sx={{ width: 110, "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 700 } }}
                      />
                      <TextField
                        size="small"
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => handleInstallmentDateChange(idx, e.target.value)}
                        sx={{ width: 150, "& .MuiOutlinedInput-root": { borderRadius: "8px", bgcolor: "white", fontSize: "0.75rem" } }}
                      />
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Paper>
          )}

          {feeMode === "MONTHLY" && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Calendar size={14} style={{ color: "#4E6E93" }} />
                  Monthly Fee Calculation ({durationMonths} {durationMonths === 1 ? "Month" : "Months"} Course)
                </Typography>
                <Chip label={`₹${Number(monthlyAmount || 0).toLocaleString("en-IN")}/mo × ${durationMonths} mo = ₹${(Number(monthlyAmount || 0) * durationMonths).toLocaleString("en-IN")}`} size="small" sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#EEF2F7", border: "1px solid #D6E0EB" }} />
              </Box>

              <TextField
                label="Monthly Fee Amount (₹) — Billed every Month *"
                fullWidth
                size="small"
                type="number"
                value={monthlyAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setMonthlyAmount(val);
                  const num = Number(val) || 0;
                  setTotalFee(String(num * durationMonths));
                }}
                placeholder="e.g. 5000"
                slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } as any }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontWeight: 700 } }}
              />

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "8px", bgcolor: "#F8FAFC", borderColor: "#EEF2F7", display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569" }}>
                  Auto-calculated: <Box component="span" sx={{ fontWeight: 700 }}>₹{Math.max(0, Math.round(baseFee * (1 - discountPercent / 100))).toLocaleString("en-IN")}</Box> total ÷ <Box component="span" sx={{ fontWeight: 700 }}>{durationMonths} months</Box> = <Box component="span" sx={{ fontWeight: 700 }}>₹{Math.max(1, Math.round(Math.max(0, Math.round(baseFee * (1 - discountPercent / 100))) / durationMonths)).toLocaleString("en-IN")}/month</Box>
                </Typography>
                {Number(monthlyAmount) !== Math.max(1, Math.round(Math.max(0, Math.round(baseFee * (1 - discountPercent / 100))) / durationMonths)) && (
                  <Button size="small" onClick={() => {
                    const standardMonthly = Math.max(1, Math.round(Math.max(0, Math.round(baseFee * (1 - discountPercent / 100))) / durationMonths));
                    setMonthlyAmount(String(standardMonthly));
                    setTotalFee(String(standardMonthly * durationMonths));
                  }} sx={{ fontSize: "11px", fontWeight: 700, textTransform: "none", whiteSpace: "nowrap" }}>
                    Reset to Default Rate
                  </Button>
                )}
              </Paper>
            </Paper>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <TextField
              label="Net Agreed Course Fee (₹) *"
              required
              fullWidth
              size="small"
              value={
                feeMode === "MONTHLY"
                  ? `₹${Number(monthlyAmount || 0).toLocaleString("en-IN")} / month  (Total ₹${(Number(monthlyAmount || 0) * durationMonths).toLocaleString("en-IN")} for ${durationMonths} Months)`
                  : totalFee
                  ? `₹${Number(totalFee).toLocaleString("en-IN")}`
                  : "₹0"
              }
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { readOnly: true } as any }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F8FAFC", fontWeight: 700 } }}
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", px: 0.5, gap: 1 }}>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>
                Base Fee: <Box component="span" sx={{ fontWeight: 700 }}>₹{baseFee.toLocaleString("en-IN")}</Box>
                {discountPercent > 0 && (
                  <Box component="span" sx={{ color: "#059669", fontWeight: 600 }}> · {discountPercent}% discount applied (-₹{discountSavings.toLocaleString("en-IN")})</Box>
                )}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", color: "#94A3B8" }}>
                {feeMode === "MONTHLY" ? `(Billed ₹${Number(monthlyAmount || 0).toLocaleString("en-IN")}/month across ${durationMonths} months)` : "(Configured via Discount & Installments)"}
              </Typography>
            </Box>
          </Box>

          {/* Payment Collection on Enrollment */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)", display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21", display: "flex", alignItems: "center", gap: 0.75 }}>
                <CreditCard size={14} style={{ color: "#4E6E93" }} />
                Initial Fee Collection & Payment Options:
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>Official Receipt will be generated</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1 }}>
              {[
                { id: "FIRST_INSTALLMENT", label: feeMode === "MONTHLY" ? "1st Month Fee" : "1st Installment" },
                { id: "SEAT_BOOKING", label: "Seat Booking Deposit" },
                { id: "FULL_FEE", label: "Full Course Fee" },
                { id: "CUSTOM", label: "Custom Amount" },
                { id: "PAY_LATER", label: "Pay Later / Demo" },
              ].map((pt) => (
                <Chip
                  key={pt.id}
                  label={pt.label}
                  clickable
                  onClick={() => handleSelectPaymentType(pt.id as any)}
                  sx={{
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.70rem",
                    height: 28,
                    justifyContent: "center",
                    bgcolor: paymentType === pt.id ? "#ECFDF5" : "white",
                    color: paymentType === pt.id ? "#065f46" : "#334155",
                    border: paymentType === pt.id ? "1px solid #059669" : "1px solid #D6E0EB",
                    "&:hover": { bgcolor: paymentType === pt.id ? "#D1FAE5" : "#F8FAFC" },
                  }}
                />
              ))}
            </Box>

            {paymentType !== "PAY_LATER" ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1, borderTop: "1px solid rgba(214,224,235,0.5)" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  <TextField
                    label="Amount Paid Today (₹) *"
                    fullWidth
                    size="small"
                    type={paymentType === "CUSTOM" ? "number" : "text"}
                    value={paymentType === "CUSTOM" ? initialPayment : initialPayment ? `₹${Number(initialPayment).toLocaleString("en-IN")}` : "₹0"}
                    onChange={(e) => setInitialPayment(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { readOnly: paymentType !== "CUSTOM" } as any }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: paymentType === "CUSTOM" ? "white" : "#F8FAFC", fontWeight: 700, color: "#065f46" } }}
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel id="add-student-payment-mode-label">Payment Mode *</InputLabel>
                    <Select labelId="add-student-payment-mode-label" label="Payment Mode *" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as any)} sx={{ borderRadius: "12px", bgcolor: "white" }}>
                      <MenuItem value="UPI">UPI (Google Pay / PhonePe / QR)</MenuItem>
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Net Banking">Net Banking / NEFT</MenuItem>
                      <MenuItem value="Debit / Credit Card">Debit / Credit Card</MenuItem>
                      <MenuItem value="Cheque">Cheque / Demand Draft</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  label="Receipt / UTR Reference Number (Optional)"
                  fullWidth
                  size="small"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UPI Ref #123456789 or Cash Receipt #104"
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
                />
              </Box>
            ) : (
              <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                Student enrolled with ₹0 initial deposit. Fees will remain pending according to the schedule.
              </Typography>
            )}
          </Paper>
        </Paper>

        <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
          <Button type="button" variant="outlined" fullWidth onClick={onClose} sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#64748b", fontWeight: 600, textTransform: "none", py: 1.25 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" fullWidth disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}>
            {loading ? "Enrolling Student..." : requiresOwnerApproval ? "Enroll & Request Owner Approval" : "Confirm Enrollment"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
