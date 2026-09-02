"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { DurationPicker } from "@/components/courses/DurationPicker";
import { FeeInstallment } from "@/lib/installments";
import { Camera, Upload } from "lucide-react";

export interface EditableStudent {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
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
      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        {error && (
          <div className="rounded-xl bg-danger-50 p-3 text-xs font-medium text-danger-700">
            {error}
          </div>
        )}

        {/* Student Photograph */}
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
                Student passport-size photo. Can also be uploaded directly by the student in the Student Portal.
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

        <Field label="Full Name *">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student Name"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile *">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className={inputClass}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile"
              required
            />
          </Field>
          <Field label="Parent Mobile">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className={inputClass}
              value={parentMobile}
              onChange={(e) => setParentMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile"
            />
          </Field>
        </div>

        <Field label="Email Address">
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Course *">
            <select
              className={inputClass}
              value={courseId}
              onChange={(e) => {
                const cid = e.target.value;
                setCourseId(cid);
                setBatchId("");
                const c = courses.find((x) => x.id === cid);
                if (c?.duration) setCourseDuration(c.duration);
              }}
              required
            >
              <option value="">Select Course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.duration ? `(${c.duration})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Batch">
            <select
              className={inputClass}
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              disabled={!courseId}
            >
              <option value="">Unassigned</option>
              {courseBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Student Course Duration (Days, Months, Years) */}
        <DurationPicker
          value={courseDuration}
          onChange={(val) => setCourseDuration(val)}
          label="Course Duration (Days / Months / Years)"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Enrollment Status *">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="INACTIVE">Inactive / Archived</option>
            </select>
          </Field>

          <Field label="Fee Billing Plan">
            <select
              className={inputClass}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="ONE_TIME">Full Fee (One-Time)</option>
              <option value="INSTALLMENTS">Installment Plan</option>
              <option value="MONTHLY">Monthly Recurring</option>
              <option value="DEMO">Demo / 7-Day Trial</option>
            </select>
          </Field>
        </div>

        {plan === "MONTHLY" && (
          <Field label="Monthly Fee (₹) — Every Month">
            <input
              type="number"
              min="0"
              className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              value={monthlyAmount}
              onChange={(e) => {
                setMonthlyAmount(e.target.value);
                setTotalFee(e.target.value);
              }}
              placeholder="e.g. 4500"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Agreed Fee (₹) *">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={totalFee}
              onChange={(e) => setTotalFee(e.target.value)}
              placeholder="Total Course Fee"
              required
            />
          </Field>

          <Field label="Next Fee Due Date">
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex gap-2.5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-xs font-semibold text-scholar-600 hover:bg-paper"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50 shadow-xs"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
