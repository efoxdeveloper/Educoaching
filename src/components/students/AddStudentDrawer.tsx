"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DurationPicker } from "@/components/courses/DurationPicker";
import { calculateCourseEndDate, getDurationInMonths } from "@/lib/course-duration";
import {
  generateInstallmentSchedule,
  type FeeInstallment,
} from "@/lib/installments";
import { Calendar, Building2, Split, CheckCircle, AlertTriangle, Ticket, Percent, CreditCard, Camera, Upload } from "lucide-react";

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

type Branch = { id: string; name: string; city?: string | null };

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
    courseId: courses[0]?.id || "",
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
        courseId: courses[0]?.id || "",
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
      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        {error && <p className="rounded-xl bg-danger-50 px-3 py-2.5 text-xs text-danger-600 font-medium">{error}</p>}

        {/* Student Photograph Upload (Optional at admission) */}
        <div className="rounded-2xl border border-scholar-200 bg-scholar-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Camera size={14} className="text-scholar-600" />
              <span>Student Photograph</span>
              <span className="rounded bg-scholar-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-scholar-700">Optional</span>
            </span>
            {photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                Remove Photo
              </button>
            )}
          </div>

          <div className="flex items-center gap-3.5">
            {/* Passport preview / avatar */}
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-scholar-300 bg-white shadow-2xs">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Passport photo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-1 text-scholar-400">
                  <Camera size={20} className="text-scholar-400" />
                  <span className="text-[8px] font-bold uppercase mt-0.5">Photo</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1">
              <p className="text-[11px] text-scholar-600 leading-snug">
                Ask for a passport-size photo. <em>If not available right now, that&apos;s okay—the student can upload it directly from their <strong>Student Portal</strong>.</em>
              </p>
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload size={12} />
                  <span>{photoUrl ? "Change Photo" : "Upload Passport Photo"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <Field label="Student Full Name *">
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Student Name"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile Number *">
            <input
              required
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className={inputClass}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              placeholder="10-digit mobile"
            />
          </Field>

          <Field label="Parent's Mobile / WhatsApp">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className={inputClass}
              value={form.parentMobile}
              onChange={(e) => setForm({ ...form, parentMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              placeholder="10-digit mobile"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Student Email Address *">
            <input
              type="email"
              required
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="student@example.com"
            />
          </Field>

          <Field label="Parent Email (For Portal Access)">
            <input
              type="email"
              className={inputClass}
              value={form.parentEmail}
              onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
              placeholder="parent@example.com"
            />
          </Field>
        </div>

        {/* Branch & Batch Allocation */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
              <Building2 size={14} className="text-scholar-600" />
              <span>Campus & Batch Allocation</span>
            </label>
            <span className="text-[10px] text-scholar-500">Batches & timings vary by branch</span>
          </div>

          {branches.length === 0 ? (
            <div className="space-y-3">
              <Field label="Course Program *">
                <select
                  required
                  className={inputClass}
                  value={form.courseId}
                  onChange={(e) => {
                    setForm({ ...form, courseId: e.target.value, batchId: "" });
                  }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {formatCurrency(c.fee)} {c.duration ? `(${c.duration})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-scholar-500 bg-scholar-50 p-2.5 rounded-lg border border-scholar-100">
                This institute has only one branch (Main Branch) — no branch selection needed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Course Program *">
                <select
                  required
                  className={inputClass}
                  value={form.courseId}
                  onChange={(e) => {
                    setForm({ ...form, courseId: e.target.value, batchId: "" });
                  }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {formatCurrency(c.fee)} {c.duration ? `(${c.duration})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Branch / Campus Location">
                <select
                  className={inputClass}
                  value={form.branchId}
                  onChange={(e) => {
                    setForm({ ...form, branchId: e.target.value, batchId: "" });
                  }}
                >
                  <option value="">All Branches / Main Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.city ? `(${b.city})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          <Field label="Assigned Batch & Timing">
            <select
              className={inputClass}
              value={form.batchId}
              onChange={(e) => setForm({ ...form, batchId: e.target.value })}
            >
              <option value="">Unassigned Batch</option>
              {filteredBatches.map((b) => {
                const branchLabel = b.isAllBranches
                  ? "All Campuses"
                  : b.branches && b.branches.length > 0
                  ? b.branches.map((br) => br.name).join(", ")
                  : b.branch
                  ? b.branch.name
                  : "";
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.timing ? `(${b.timing})` : ""} {branchLabel ? `• ${branchLabel}` : ""}
                  </option>
                );
              })}
            </select>
            {filteredBatches.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600">
                No active batches found for this course at the selected campus. You can create a batch under Batches.
              </p>
            )}
          </Field>
        </div>

        {/* Course Duration for Student (Days, Months, Years) */}
        <div className="space-y-1.5">
          <DurationPicker
            value={studentDuration}
            onChange={(val) => setStudentDuration(val)}
            label="Student's Course Duration (Days / Months / Years)"
          />
          <p className="text-[11px] text-scholar-500 flex items-center gap-1 pl-1">
            <Calendar size={12} className="text-scholar-400" />
            <span>
              Enrolling today means student completes on <strong>{formatDate(estimatedEndDate)}</strong> (~{studentDuration})
            </span>
          </p>
        </div>

        {/* Registration Fees Option to Book Student Seat */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableSeatBooking}
                onChange={(e) => setEnableSeatBooking(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Ticket size={14} className="text-emerald-700" />
                Book Student Seat with Registration Fee
              </span>
            </label>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Seat Reservation
            </span>
          </div>

          {enableSeatBooking && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Field label="Registration / Booking Fee (₹)">
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} border-emerald-300 font-bold text-emerald-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  value={registrationFee}
                  onChange={(e) => setRegistrationFee(e.target.value)}
                  placeholder="2000"
                />
              </Field>

              <div className="rounded-lg bg-white p-2 text-[11px] text-scholar-600 border border-emerald-100 flex items-center">
                <span>
                  Reserves the student&apos;s seat in the batch. Counted as an advance booking deposit towards tuition fees.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Discount Option Bar: Faculty up to 30%, Owner Approval > 30% */}
        <div className="rounded-xl border border-scholar-200 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
              <Percent size={14} className="text-scholar-600" />
              <span>Discount & Concession Option Bar</span>
            </label>
            <span className="text-xs font-bold text-scholar-700">
              {discountPercent}% Off {discountSavings > 0 && `(Save ₹${discountSavings.toLocaleString("en-IN")})`}
            </span>
          </div>

          {/* Quick Option Bar Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {DISCOUNT_PRESETS.map((pct) => (
              <button
                type="button"
                key={pct}
                onClick={() => {
                  setDiscountPercent(pct);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  discountPercent === pct
                    ? pct > 30
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                    : pct > 30
                    ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    : "bg-scholar-50 text-scholar-700 border-scholar-200 hover:bg-scholar-100"
                }`}
              >
                {pct === 0 ? "No Discount" : `${pct}%`}
                {pct > 30 && <span className="ml-1 text-[9px] opacity-80">(Owner)</span>}
              </button>
            ))}
          </div>

          {/* Interactive Range Slider */}
          <div className="pt-1">
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={discountPercent}
              onChange={(e) => {
                setDiscountPercent(Number(e.target.value));
              }}
              className="w-full h-1.5 bg-scholar-100 rounded-lg appearance-none cursor-pointer accent-scholar-600"
            />
            <div className="flex justify-between text-[10px] text-scholar-400 mt-1">
              <span>0% (Standard)</span>
              <span className="font-semibold text-emerald-600">30% (Faculty Max Limit)</span>
              <span className="font-semibold text-amber-600">50%+ (Owner Approval)</span>
            </div>
          </div>

          {/* Dynamic Status / Owner Approval Notice */}
          {!requiresOwnerApproval && discountPercent > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200">
              <CheckCircle size={15} className="text-emerald-600 shrink-0" />
              <span>
                <strong>Faculty Pre-approved Discount:</strong> {discountPercent}% discount is within the standard faculty limit (≤ 30%) and applied immediately.
              </span>
            </div>
          )}

          {requiresOwnerApproval && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>Special Discount ({discountPercent}%): Exceeds Faculty 30% Cap</span>
              </div>
              <p className="text-amber-800 text-[11px]">
                Parents requested <strong>{discountPercent}% discount</strong>. A formal approval request and notification will be dispatched to the <strong>Institute Owner&apos;s Dashboard</strong> for allowance.
              </p>

              <Field label="Justification / Reason for Owner *">
                <textarea
                  required
                  rows={2}
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g. Sibling studying in Class 12, top ranker merit concession, or parent financial relaxation requested."
                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-ink outline-none focus:border-amber-500"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Fee Billing Mode / Process */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center justify-between">
            <span>Fee Structure & Payment Schedule</span>
            <span className="text-[10px] text-scholar-500 font-normal">Choose parent payment preference</span>
          </label>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setFeeMode("ONE_TIME");
              }}
              className={`rounded-lg py-2 px-2 text-xs font-semibold transition-all text-center border ${
                feeMode === "ONE_TIME"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              One-Time (100%)
              <span className="block text-[10px] opacity-80">Full Upfront</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFeeMode("INSTALLMENTS");
              }}
              className={`rounded-lg py-2 px-2 text-xs font-semibold transition-all text-center border ${
                feeMode === "INSTALLMENTS"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Installments
              <span className="block text-[10px] opacity-80">2 or more split</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFeeMode("MONTHLY");
              }}
              className={`rounded-lg py-2 px-2 text-xs font-semibold transition-all text-center border ${
                feeMode === "MONTHLY"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Monthly
              <span className="block text-[10px] opacity-80">Per Month</span>
            </button>
          </div>

          {/* Sub-section: Installments Configuration */}
          {feeMode === "INSTALLMENTS" && (
            <div className="rounded-xl border border-scholar-200 bg-white p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
                  <Split size={14} className="text-scholar-600" />
                  Installment Relaxation for Parent:
                </span>

                {/* Installment count buttons */}
                <div className="flex gap-2">
                  {[2, 3, 4].map((cnt) => (
                    <button
                      type="button"
                      key={cnt}
                      onClick={() => setInstallmentCount(cnt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        installmentCount === cnt
                          ? "bg-scholar-600 text-white border-scholar-600"
                          : "bg-scholar-50 text-scholar-700 border-scholar-200 hover:bg-scholar-100"
                      }`}
                    >
                      {cnt} Installments {cnt === 2 ? "(50/50)" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Installments Table / Breakdown */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {installments.map((inst, idx) => (
                  <div
                    key={inst.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg border border-scholar-100 bg-scholar-50/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-scholar-200 font-bold text-[10px] text-scholar-800">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-scholar-800">{inst.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-scholar-500">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={inst.amount}
                          onChange={(e) => handleInstallmentAmountChange(idx, Number(e.target.value))}
                          className="w-24 rounded-md border border-scholar-200 bg-white px-2 py-1 text-xs font-bold text-ink [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-scholar-500">Due:</span>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => handleInstallmentDateChange(idx, e.target.value)}
                          className="rounded-md border border-scholar-200 bg-white px-2 py-1 text-xs text-ink"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly specifics */}
          {feeMode === "MONTHLY" && (
            <div className="rounded-xl border border-scholar-200 bg-white p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-scholar-600" />
                  <span>Monthly Fee Calculation ({durationMonths} {durationMonths === 1 ? "Month" : "Months"} Course)</span>
                </label>
                <span className="text-[11px] font-bold text-scholar-700 bg-scholar-100 border border-scholar-200 px-2 py-0.5 rounded-full">
                  ₹{Number(monthlyAmount || 0).toLocaleString("en-IN")}/mo &times; {durationMonths} mo = ₹{(Number(monthlyAmount || 0) * durationMonths).toLocaleString("en-IN")}
                </span>
              </div>

              <Field label="Monthly Fee Amount (₹) — Billed every Month *">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-scholar-400">₹</span>
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} pl-7 font-bold text-ink [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    value={monthlyAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMonthlyAmount(val);
                      const num = Number(val) || 0;
                      setTotalFee(String(num * durationMonths));
                    }}
                    placeholder="e.g. 5000"
                  />
                </div>
              </Field>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-scholar-600 bg-scholar-50 rounded-lg p-2.5 border border-scholar-100">
                <span>
                  Auto-calculated: <strong>₹{Math.max(0, Math.round(baseFee * (1 - discountPercent / 100))).toLocaleString("en-IN")}</strong> total &divide; <strong>{durationMonths} months</strong> = <strong>₹{Math.max(1, Math.round(Math.max(0, Math.round(baseFee * (1 - discountPercent / 100))) / durationMonths)).toLocaleString("en-IN")}/month</strong>
                </span>
                {Number(monthlyAmount) !== Math.max(1, Math.round(Math.max(0, Math.round(baseFee * (1 - discountPercent / 100))) / durationMonths)) && (
                  <button
                    type="button"
                    onClick={() => {
                      const standardMonthly = Math.max(1, Math.round(Math.max(0, Math.round(baseFee * (1 - discountPercent / 100))) / durationMonths));
                      setMonthlyAmount(String(standardMonthly));
                      setTotalFee(String(standardMonthly * durationMonths));
                    }}
                    className="text-[11px] font-bold text-scholar-600 hover:text-scholar-800 underline self-end sm:self-auto cursor-pointer"
                  >
                    Reset to Default Rate
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Net Course Fee */}
          <div className="space-y-1.5">
            <Field label="Net Agreed Course Fee (₹) *">
              <input
                required
                readOnly
                type="text"
                className={`${inputClass} font-bold text-ink bg-scholar-50/70 border-scholar-200 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                value={
                  feeMode === "MONTHLY"
                    ? `₹${Number(monthlyAmount || 0).toLocaleString("en-IN")} / month  (Total ₹${(Number(monthlyAmount || 0) * durationMonths).toLocaleString("en-IN")} for ${durationMonths} Months)`
                    : totalFee
                    ? `₹${Number(totalFee).toLocaleString("en-IN")}`
                    : "₹0"
                }
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-scholar-500 px-1">
              <span>
                Base Fee: <strong>₹{baseFee.toLocaleString("en-IN")}</strong>
                {discountPercent > 0 && (
                  <span className="text-emerald-700 font-semibold">
                    {" "}&middot; {discountPercent}% discount applied (-₹{discountSavings.toLocaleString("en-IN")})
                  </span>
                )}
              </span>
              <span className="text-[10px] text-scholar-400">
                {feeMode === "MONTHLY"
                  ? `(Billed ₹${Number(monthlyAmount || 0).toLocaleString("en-IN")}/month across ${durationMonths} months)`
                  : "(Configured via Discount & Installments)"}
              </span>
            </div>
          </div>

          {/* Payment Collection on Enrollment */}
          <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <CreditCard size={14} className="text-scholar-600" />
                Initial Fee Collection & Payment Options:
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Official Receipt will be generated
              </span>
            </div>

            {/* Quick Payment Type Shortcuts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "FIRST_INSTALLMENT", label: feeMode === "MONTHLY" ? "1st Month Fee" : "1st Installment" },
                { id: "SEAT_BOOKING", label: "Seat Booking Deposit" },
                { id: "FULL_FEE", label: "Full Course Fee" },
                { id: "CUSTOM", label: "Custom Amount" },
                { id: "PAY_LATER", label: "Pay Later / Demo" },
              ].map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => handleSelectPaymentType(pt.id as any)}
                  className={`rounded-lg py-1.5 px-2 text-xs font-semibold border transition-all text-center ${
                    paymentType === pt.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs"
                      : "border-scholar-200 bg-white text-scholar-700 hover:bg-scholar-50"
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>

            {/* Amount input & Payment Mode */}
            {paymentType !== "PAY_LATER" ? (
              <div className="space-y-3 pt-1 border-t border-scholar-200/60">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount Paid Today (₹) *">
                    {paymentType === "CUSTOM" ? (
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} font-bold text-emerald-700 border-emerald-400`}
                        value={initialPayment}
                        onChange={(e) => setInitialPayment(e.target.value)}
                        placeholder="Enter custom amount"
                      />
                    ) : (
                      <input
                        readOnly
                        type="text"
                        className={`${inputClass} font-bold text-emerald-700 bg-scholar-50/70 border-scholar-200 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        value={initialPayment ? `₹${Number(initialPayment).toLocaleString("en-IN")}` : "₹0"}
                      />
                    )}
                  </Field>

                  <Field label="Payment Mode *">
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className={inputClass}
                    >
                      <option value="UPI">UPI (Google Pay / PhonePe / QR)</option>
                      <option value="Cash">Cash</option>
                      <option value="Net Banking">Net Banking / NEFT</option>
                      <option value="Debit / Credit Card">Debit / Credit Card</option>
                      <option value="Cheque">Cheque / Demand Draft</option>
                    </select>
                  </Field>
                </div>

                <Field label="Receipt / UTR Reference Number (Optional)">
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. UPI Ref #123456789 or Cash Receipt #104"
                    className={inputClass}
                  />
                </Field>
              </div>
            ) : (
              <p className="text-xs text-scholar-500 italic pt-1">
                Student enrolled with ₹0 initial deposit. Fees will remain pending according to the schedule.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-sm font-semibold text-scholar-600 hover:bg-scholar-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-60 shadow-xs"
          >
            {loading
              ? "Enrolling Student..."
              : requiresOwnerApproval
              ? "Enroll & Request Owner Approval"
              : "Confirm Enrollment"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
