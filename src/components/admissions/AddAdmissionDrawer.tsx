"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/utils";

type Course = { id: string; name: string; fee: string };
type Batch = { id: string; name: string; courseId: string };
type Branch = { id: string; name: string };
type FacultyStaff = { id: string; name: string; roleType: string };

const LEAD_SOURCES = [
  { value: "WALK_IN", label: "Walk-in to Centre" },
  { value: "WEBSITE", label: "Website Form / Landing Page" },
  { value: "GOOGLE", label: "Google Search / Maps" },
  { value: "SOCIAL_MEDIA", label: "Social Media (Instagram / FB)" },
  { value: "REFERRAL", label: "Student / Teacher Referral" },
  { value: "HOARDING_BANNER", label: "Hoarding / Newspaper / Flyer" },
  { value: "OTHER", label: "Other / Direct Call" },
];

export function AddAdmissionDrawer({
  open,
  onClose,
  courses,
  branches,
  faculty = [],
  defaultCounsellorId,
}: {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  batches?: Batch[];
  branches: Branch[];
  faculty?: FacultyStaff[];
  defaultCounsellorId?: string;
}) {
  const router = useRouter();

  const counsellorList = useMemo(() => {
    const counsellorsOnly = faculty.filter((f) => f.roleType === "COUNSELLOR");
    return counsellorsOnly.length > 0 ? counsellorsOnly : faculty;
  }, [faculty]);

  const [form, setForm] = useState({
    applicantName: "",
    mobile: "",
    email: "",
    courseId: courses[0]?.id || "",
    branchId: "",
    source: "WALK_IN",
    priority: "WARM",
    assignedToId: defaultCounsellorId || "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && defaultCounsellorId) {
      setForm((prev) => ({ ...prev, assignedToId: prev.assignedToId || defaultCounsellorId }));
    }
  }, [open, defaultCounsellorId]);

  const selectedCourse = courses.find((c) => c.id === form.courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assignedToId: form.assignedToId || null,
          feePlan: Number(selectedCourse?.fee || 0),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add lead / admission");
      }
      setForm({
        applicantName: "",
        mobile: "",
        email: "",
        courseId: courses[0]?.id || "",
        branchId: "",
        source: "WALK_IN",
        priority: "WARM",
        assignedToId: defaultCounsellorId || "",
        note: "",
      });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add admission. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="New Lead / Admission Inquiry">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && <p className="rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600">{error}</p>}

        <Field label="Applicant Name *">
          <input
            required
            className={inputClass}
            value={form.applicantName}
            onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
            placeholder="Student / Candidate Name"
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
          <Field label="Email Address">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="applicant@example.com"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Lead Source">
            <select
              className={inputClass}
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Inquiry Priority">
            <select
              className={inputClass}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="HOT">🔥 Hot (High Interest)</option>
              <option value="WARM">⚡ Warm (Standard Follow-up)</option>
              <option value="COLD">❄️ Cold (Browsing / General)</option>
            </select>
          </Field>
        </div>

        {branches.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Course / Offering *">
              <select
                required
                className={inputClass}
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {formatCurrency(c.fee)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Branch / Campus">
              <select
                className={inputClass}
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              >
                <option value="">Main / Unassigned</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <Field label="Course / Offering *">
            <select
              required
              className={inputClass}
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatCurrency(c.fee)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Assigned Counsellor">
          <select
            className={inputClass}
            value={form.assignedToId}
            onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {counsellorList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.roleType === "COUNSELLOR" ? "(Counsellor)" : `(${c.roleType})`}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Inquiry Notes">
          <input
            className={inputClass}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Interests, previous coaching, parent notes..."
          />
        </Field>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-xs font-semibold text-scholar-600 hover:bg-scholar-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-60"
          >
            {loading ? "Adding Lead..." : "Save Lead"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}