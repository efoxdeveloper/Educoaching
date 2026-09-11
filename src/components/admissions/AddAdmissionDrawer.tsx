"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/utils";
import { User, Phone, Mail, GraduationCap, MapPin, Users, StickyNote, Check, ChevronRight, ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { showLeadToast } from "./ui/Toast";

type Course = { id: string; name: string; fee: string };
type Batch = { id: string; name: string; courseId: string };
type Branch = { id: string; name: string; isMainBranch?: boolean };
type FacultyStaff = { id: string; name: string; roleType: string };

const LEAD_SOURCES = [
  { value: "WALK_IN", label: "Walk-in to Centre", hint: "Student visited your centre" },
  { value: "WEBSITE", label: "Website Form", hint: "Submitted via your public enquiry link" },
  { value: "GOOGLE", label: "Google Search / Maps", hint: "Found you on Google" },
  { value: "SOCIAL_MEDIA", label: "Social Media", hint: "Instagram, Facebook, YouTube" },
  { value: "REFERRAL", label: "Referral", hint: "Referred by student/teacher/parent" },
  { value: "HOARDING_BANNER", label: "Banner / Newspaper", hint: "Hoarding, pamphlet, newspaper ad" },
  { value: "OTHER", label: "Other / Phone Call", hint: "Direct phone enquiry" },
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setStep(1);
      setError("");
      setFieldErrors({});
      if (defaultCounsellorId) {
        setForm((prev) => ({ ...prev, assignedToId: prev.assignedToId || defaultCounsellorId }));
      }
    }
  }, [open, defaultCounsellorId]);

  // Keep courseId in sync if courses load async
  useEffect(() => {
    if (!form.courseId && courses[0]?.id) setForm((p) => ({ ...p, courseId: courses[0].id }));
  }, [courses, form.courseId]);

  const selectedCourse = courses.find((c) => c.id === form.courseId);
  const hasMultipleBranches = branches.filter((b) => !b.isMainBranch).length > 0;

  const validateStep = (s: number) => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.applicantName.trim()) errs.applicantName = "Please enter the student's full name — e.g., Aarav Sharma";
      else if (form.applicantName.trim().length < 2) errs.applicantName = "Name looks too short — please check";
      if (!form.mobile.trim()) errs.mobile = "Phone number is required so you can call the student";
      else if (!/^\d{10}$/.test(form.mobile)) errs.mobile = "Please enter a valid 10-digit phone number (only numbers, no spaces)";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Please check the email — it should look like name@example.com";
    }
    if (s === 2) {
      if (!form.courseId) errs.courseId = "Please select which course the student is interested in";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setError(Object.values(errs)[0]);
      return false;
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((p) => Math.min(3, p + 1));
  };

  const handleBack = () => {
    setError("");
    setStep((p) => Math.max(1, p - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      setStep(1);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          applicantName: form.applicantName.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          assignedToId: form.assignedToId || null,
          feePlan: Number(selectedCourse?.fee || 0),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save lead. Please try again.");
      }
      showLeadToast(`Lead for ${form.applicantName.trim()} added! You can now log the first call.`, "success");
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
      setStep(1);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add lead. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepMeta = [
    { n: 1, title: "Student Details", desc: "Who is enquiring?", icon: User },
    { n: 2, title: "Course & Source", desc: "What do they want?", icon: GraduationCap },
    { n: 3, title: "Assign & Notes", desc: "Who will follow up?", icon: Users },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Add New Lead">
      <div className="space-y-4 text-xs">
        {/* Stepper — 21st.dev style */}
        <div className="flex items-center gap-1.5 rounded-xl border border-scholar-100 bg-scholar-50/50 p-1.5">
          {stepMeta.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.n;
            const isDone = step > s.n;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => {
                  if (s.n < step) setStep(s.n);
                  // allow forward only if current step valid
                  if (s.n > step && validateStep(step)) setStep(s.n);
                }}
                className={`flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all ${
                  isActive ? "bg-white shadow-sm border border-scholar-200" : isDone ? "bg-emerald-50 border border-emerald-200" : "bg-transparent"
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isActive ? "bg-scholar-800 text-white" : isDone ? "bg-emerald-600 text-white" : "bg-scholar-100 text-scholar-500"}`}>
                  {isDone ? <Check size={12} /> : s.n}
                </span>
                <span className="hidden sm:block min-w-0">
                  <span className={`block text-xs font-bold leading-none ${isActive ? "text-ink" : "text-scholar-600"}`}>{s.title}</span>
                  <span className="block text-[10px] font-medium text-scholar-400 leading-none mt-0.5">{s.desc}</span>
                </span>
                <Icon size={13} className={`ml-auto hidden sm:block ${isActive ? "text-scholar-600" : "text-scholar-300"}`} />
              </button>
            );
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="rounded-xl border border-scholar-100 bg-white p-3.5 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <User size={13} className="text-scholar-500" /> Student Details
                </h4>

                <div>
                  <Field label="Student Full Name *">
                    <input
                      required
                      className={inputClass + (fieldErrors.applicantName ? " border-rose-300 focus:border-rose-400" : "")}
                      value={form.applicantName}
                      onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                      placeholder="e.g., Aarav Sharma"
                      aria-invalid={!!fieldErrors.applicantName}
                    />
                  </Field>
                  {fieldErrors.applicantName ? (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.applicantName}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-scholar-400">As it appears on school records — you can edit later</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Field label="Phone Number *">
                      <input
                        required
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        className={inputClass + (fieldErrors.mobile ? " border-rose-300 focus:border-rose-400" : "")}
                        value={form.mobile}
                        onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        placeholder="98765 43210"
                        aria-invalid={!!fieldErrors.mobile}
                      />
                    </Field>
                    {fieldErrors.mobile ? (
                      <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.mobile}</p>
                    ) : (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-scholar-400">
                        <Phone size={10} /> 10 digits, we’ll use it for WhatsApp & calls
                      </p>
                    )}
                  </div>
                  <div>
                    <Field label="Email Address (optional)">
                      <input
                        type="email"
                        className={inputClass + (fieldErrors.email ? " border-rose-300 focus:border-rose-400" : "")}
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="aarav@example.com"
                      />
                    </Field>
                    <p className="mt-1 text-[11px] text-scholar-400 flex items-center gap-1">
                      <Mail size={10} /> Optional — for receipts & updates
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-scholar-800 py-3 text-xs font-bold text-white hover:bg-scholar-900"
              >
                Continue to Course <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="rounded-xl border border-scholar-100 bg-white p-3.5 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-scholar-500" /> Course & Source
                </h4>

                <div>
                  <Field label="Which course are they interested in? *">
                    <select
                      required
                      className={inputClass + (fieldErrors.courseId ? " border-rose-300" : "")}
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
                  <p className="mt-1 text-[11px] text-scholar-400">Fee shown is the standard plan — you can adjust on conversion</p>
                </div>

                {hasMultipleBranches ? (
                  <Field label="Preferred Branch">
                    <select className={inputClass} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                      <option value="">Main centre (default)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                          {b.isMainBranch ? " (Main)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div className="rounded-lg border border-scholar-100 bg-scholar-50 p-2.5 text-[11px] text-scholar-500 flex items-center gap-1.5">
                    <MapPin size={12} className="text-scholar-400" /> Single centre — no branch selection needed
                  </div>
                )}
                <p className="text-[11px] text-scholar-400">If unsure, leave as Main — you can move it later</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Field label="How did they find you?">
                      <select className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                        {LEAD_SOURCES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <p className="mt-1 text-[11px] text-scholar-400">{LEAD_SOURCES.find((s) => s.value === form.source)?.hint}</p>
                  </div>

                  <Field label="How interested are they?">
                    <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      <option value="HOT">🔥 Hot — Wants to join soon</option>
                      <option value="WARM">⚡ Warm — Needs follow-up</option>
                      <option value="COLD">❄️ Cold — Just looking</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={handleBack} className="flex items-center gap-1 rounded-xl border border-scholar-200 bg-white px-4 py-3 text-xs font-bold text-scholar-700 hover:bg-scholar-50">
                  <ChevronLeft size={14} /> Back
                </button>
                <button type="button" onClick={handleNext} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-scholar-800 py-3 text-xs font-bold text-white hover:bg-scholar-900">
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="rounded-xl border border-scholar-100 bg-white p-3.5 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Users size={13} className="text-scholar-500" /> Who will handle this lead?
                </h4>

                <Field label="Assign to Counsellor">
                  <select className={inputClass} value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
                    <option value="">Unassigned — anyone can follow up</option>
                    {counsellorList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.roleType === "COUNSELLOR" ? "(Counsellor)" : `(${c.roleType})`}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="text-[11px] text-scholar-400">Assigned counsellor gets follow-up reminders via WhatsApp & Email</p>

                <Field label="Any notes? (optional)">
                  <textarea
                    rows={3}
                    className={inputClass + " min-h-[70px] py-2"}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="E.g., Father wants to discuss fee in person on Saturday, student prefers evening batch..."
                  />
                </Field>
                <p className="text-[11px] text-scholar-400 flex items-center gap-1">
                  <StickyNote size={10} /> These notes appear in the follow-up timeline
                </p>

                {/* Review summary */}
                <div className="rounded-xl border border-scholar-100 bg-scholar-50/60 p-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-scholar-700 uppercase tracking-wide">Review before saving</p>
                  <div className="text-xs space-y-1">
                    <p>
                      <span className="font-semibold text-ink">{form.applicantName || "—"}</span> · {form.mobile || "—"} {form.email ? `· ${form.email}` : ""}
                    </p>
                    <p className="text-scholar-600">
                      {selectedCourse?.name || "No course"} · {LEAD_SOURCES.find((s) => s.value === form.source)?.label} · {form.priority}
                    </p>
                    <p className="text-scholar-500">
                      Assigned to: <span className="font-semibold text-ink">{counsellorList.find((c) => c.id === form.assignedToId)?.name || "Unassigned"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={handleBack} className="flex items-center gap-1 rounded-xl border border-scholar-200 bg-white px-4 py-3 text-xs font-bold text-scholar-700 hover:bg-scholar-50">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {loading ? "Saving..." : "Save Lead — start follow-up"}
                </button>
              </div>
              <p className="text-center text-[11px] text-scholar-400">You can edit, log calls, or convert to student anytime.</p>
            </div>
          )}
        </form>
      </div>
    </Drawer>
  );
}
