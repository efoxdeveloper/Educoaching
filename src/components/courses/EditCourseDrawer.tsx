"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { Building2, Check, Calendar } from "lucide-react";
import { DurationPicker } from "./DurationPicker";
import { calculateCourseEndDate } from "@/lib/course-duration";
import { formatDate } from "@/lib/utils";
import type { CourseItem } from "./CoursesTable";

type BranchOption = {
  id: string;
  name: string;
  city: string | null;
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
      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        {error && (
          <p className="rounded-xl bg-danger-50 px-3 py-2.5 text-xs text-danger-600 font-medium">
            {error}
          </p>
        )}

        {/* Course Basic Information */}
        <Field label="Course / Program Name">
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. JEE Main + Advanced 2-Year Pinnacle"
          />
        </Field>

        {/* Target Exam */}
        <Field label="Target Exam / Stream">
          <input
            className={inputClass}
            value={form.targetExam}
            onChange={(e) => setForm({ ...form, targetExam: e.target.value })}
            placeholder="e.g. NEET-UG or CBSE 10"
            list="edit-exam-suggestions"
          />
          <datalist id="edit-exam-suggestions">
            {COMMON_EXAMS.map((ex) => (
              <option key={ex} value={ex} />
            ))}
          </datalist>
        </Field>

        {/* Academic Session / Year */}
        <Field label="Academic Session / Year (Optional)">
          <input
            className={inputClass}
            value={form.academicYear}
            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
            placeholder="e.g. 2026-2027 or Session 2026-27"
          />
        </Field>

        {/* Course Duration with Days, Months, Years */}
        <DurationPicker
          value={form.duration}
          onChange={(val) => setForm({ ...form, duration: val })}
          label="Course Duration (Days / Months / Years)"
        />

        {/* Course Starting Date */}
        <Field label="Course Starting Date (Commencement Date)">
          <input
            type="date"
            className={inputClass}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          {form.startDate && (
            <p className="mt-1 text-[11px] text-scholar-600 flex items-center gap-1.5 bg-scholar-50 p-2 rounded-lg border border-scholar-200">
              <Calendar size={13} className="text-scholar-500 shrink-0" />
              <span>
                Commences on <strong>{formatDate(form.startDate)}</strong> — Expected completion:{" "}
                <strong>{formatDate(calculateCourseEndDate(new Date(form.startDate), form.duration || "1 Year"))}</strong>
              </span>
            </p>
          )}
        </Field>

        {/* Eligibility */}
        <Field label="Target Standard / Eligibility (Optional)">
          <input
            className={inputClass}
            value={form.eligibility}
            onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
            placeholder="e.g. Class 10 Passed / Moving to Class 11"
          />
        </Field>

        {/* Detailed Fee Structure & Billing Model */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-scholar-800">
            Fee & Billing Structure
          </label>

          {/* Billing Frequency Selector: ONE_TIME, MONTHLY, QUARTERLY, ANNUAL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, feeType: "ONE_TIME" })}
              className={`rounded-lg py-2 px-2 text-xs font-semibold transition-all text-center border ${
                form.feeType === "ONE_TIME"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Full Course Fee
              <span className="block text-[10px] opacity-80">(One-time / Total)</span>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, feeType: "MONTHLY" })}
              className={`rounded-lg py-2 px-2 text-xs font-semibold transition-all text-center border ${
                form.feeType === "MONTHLY"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Monthly Fee
              <span className="block text-[10px] opacity-80">(Recurring / mo)</span>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, feeType: "QUARTERLY" })}
              className={`rounded-lg py-2 px-2 text-xs font-semibold transition-all text-center border ${
                form.feeType === "QUARTERLY"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Quarterly Fee
              <span className="block text-[10px] opacity-80">(Every 3 Months)</span>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, feeType: "ANNUAL" })}
              className={`rounded-lg py-2 px-2 text-xs font-semibold transition-all text-center border ${
                form.feeType === "ANNUAL"
                  ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                  : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
              }`}
            >
              Per Year Fee
              <span className="block text-[10px] opacity-80">(Annual basis)</span>
            </button>
          </div>

          <Field
            label={`Fee Amount (₹) ${
              form.feeType === "ONE_TIME"
                ? "— Full Program Total (Can be split into Installments for parents)"
                : form.feeType === "MONTHLY"
                ? "— Per Month"
                : form.feeType === "QUARTERLY"
                ? "— Per Quarter (Every 3 Months)"
                : "— Per Year"
            }`}
          >
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-scholar-400 font-bold text-sm">₹</span>
              <input
                required
                type="number"
                min="0"
                step="1"
                className={`${inputClass} pl-7 font-semibold text-ink`}
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                placeholder={form.feeType === "ONE_TIME" ? "85000" : form.feeType === "MONTHLY" ? "4500" : form.feeType === "QUARTERLY" ? "12000" : "50000"}
              />
            </div>
          </Field>
        </div>

        {/* Branch Allocation */}
        <div className="rounded-xl border border-scholar-200 bg-white p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
                <Building2 size={15} className="text-scholar-600" /> Branch Allocation
              </label>
              <p className="text-[11px] text-scholar-500">
                Choose which campus branches offer this program
              </p>
            </div>
          </div>

          {availableBranches.length === 0 ? (
            <p className="text-xs text-scholar-500 bg-scholar-50 p-2.5 rounded-lg border border-scholar-100">
              This institute has only one branch (Main Branch) — no branch selection needed.
            </p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex gap-4 text-xs font-medium">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editBranchOption"
                    checked={form.isAllBranches}
                    onChange={() => setForm({ ...form, isAllBranches: true, branchIds: [] })}
                    className="accent-scholar-600"
                  />
                  <span>Available Across All Branches ({availableBranches.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editBranchOption"
                    checked={!form.isAllBranches}
                    onChange={() => setForm({ ...form, isAllBranches: false })}
                    className="accent-scholar-600"
                  />
                  <span>Select Specific Branches</span>
                </label>
              </div>

              {!form.isAllBranches && (
                <div className="rounded-lg border border-scholar-200 bg-scholar-50/70 p-3 space-y-2 max-h-36 overflow-y-auto">
                  <p className="text-[11px] font-semibold text-scholar-600">
                    Select branches where this course is taught:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableBranches.map((branch) => {
                      const isSelected = form.branchIds.includes(branch.id);
                      return (
                        <button
                          type="button"
                          key={branch.id}
                          onClick={() => handleBranchToggle(branch.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-all ${
                            isSelected
                              ? "border-scholar-600 bg-scholar-100 text-scholar-900 font-bold"
                              : "border-scholar-200 bg-white text-scholar-700 hover:bg-scholar-50"
                          }`}
                        >
                          <span className="truncate">{branch.name} {branch.city ? `(${branch.city})` : ""}</span>
                          {isSelected && <Check size={14} className="text-scholar-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed Course Syllabus & Inclusions */}
        <Field label="Course Details, Syllabus & Inclusions (Optional)">
          <textarea
            rows={3}
            className={`${inputClass} resize-none`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Course syllabus description..."
          />
        </Field>

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
            {loading ? "Saving Changes..." : "Update Course"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
