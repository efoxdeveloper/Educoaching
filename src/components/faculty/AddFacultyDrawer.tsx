"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import type { BatchOption, FacultyRow, CourseOption } from "./FacultyTable";
import { Building2, BookOpen, Plus, X, Check, GraduationCap, Clock, Eye, EyeOff } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  email: "",
  mobile: "",
  subject: "",
  qualification: "",
  experienceYears: "",
  bio: "",
  status: "ACTIVE",
  roleType: "FACULTY",
  department: "ACADEMIC",
  monthlySalary: "",
  branchId: "",
  hasSystemAccess: false,
  password: "",
};

export const ROLE_OPTIONS = [
  { value: "FACULTY", label: "Faculty / Teacher", department: "ACADEMIC" },
  { value: "DOUBT_FACULTY", label: "Doubt Faculty / Teaching Assistant", department: "ACADEMIC" },
  { value: "COUNSELLOR", label: "Academic Counsellor / Admissions", department: "ADMINISTRATION" },
  { value: "ACCOUNTANT", label: "Accountant / Fee Cashier", department: "ADMINISTRATION" },
  { value: "RECEPTIONIST", label: "Front Desk / Receptionist", department: "ADMINISTRATION" },
  { value: "TECHNICIAN", label: "CBT Lab / IT Technician", department: "TECHNICAL" },
  { value: "HOUSEKEEPING", label: "Housekeeping / Sweeper", department: "OPERATIONS_SUPPORT" },
  { value: "SECURITY", label: "Security Guard", department: "OPERATIONS_SUPPORT" },
  { value: "PEON", label: "Peon / Office Attendant", department: "OPERATIONS_SUPPORT" },
  { value: "DRIVER", label: "Driver / Transport Staff", department: "OPERATIONS_SUPPORT" },
  { value: "OTHER", label: "Other Staff Role", department: "OPERATIONS_SUPPORT" },
];

const PRESET_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Organic Chemistry",
  "Inorganic Chemistry",
  "Physical Chemistry",
  "Mathematics",
  "Biology",
  "Zoology",
  "Botany",
  "Computer Science / Coding",
  "English",
  "Foundation Science",
  "Social Science",
];

const PRESET_QUALIFICATIONS = [
  "B.Tech",
  "M.Tech",
  "B.Sc",
  "M.Sc",
  "Ph.D / Doctorate",
  "MBBS / MD",
  "B.Ed",
  "M.Ed",
  "BCA / MCA",
  "B.Com / M.Com",
  "MBA",
  "CA / CS",
  "UGC NET Qualified",
  "CSIR NET Qualified",
  "GATE Qualified",
  "IIT / NIT Alumnus",
];

export function AddFacultyDrawer({
  open,
  onClose,
  batches,
  courses: initialCourses = [],
  editing,
  branches: initialBranches = [],
}: {
  open: boolean;
  onClose: () => void;
  batches: BatchOption[];
  courses?: CourseOption[];
  editing: FacultyRow | null;
  branches?: Array<{ id: string; name: string; city?: string | null }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [courses, setCourses] = useState<CourseOption[]>(initialCourses);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string; city?: string | null }>>(initialBranches);

  // Multi-branch allocation
  const [isAllBranches, setIsAllBranches] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  // Multi-subject allocation
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState("");

  // Qualifications allocation
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);
  const [customQualInput, setCustomQualInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialBranches !== undefined) {
      setBranches(initialBranches);
    } else {
      fetch("/api/branches")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setBranches(data.filter((b: any) => !b.isMainBranch && b.status === "ACTIVE"));
          }
        })
        .catch(() => {});
    }
  }, [initialBranches]);

  useEffect(() => {
    if (initialCourses.length > 0) {
      setCourses(initialCourses);
    } else {
      fetch("/api/courses")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setCourses(data);
        })
        .catch(() => {});
    }
  }, [initialCourses]);

  // Unified available courses list
  const availableCourses = useMemo(() => {
    const courseMap = new Map<string, { id: string; name: string; duration?: string | null }>();
    courses.forEach((c) => courseMap.set(c.id, { id: c.id, name: c.name, duration: c.duration }));
    batches.forEach((b) => {
      const cId = b.courseId || b.courseName;
      if (!courseMap.has(cId)) {
        courseMap.set(cId, { id: cId, name: b.courseName });
      }
    });
    return Array.from(courseMap.values());
  }, [courses, batches]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        email: editing.email ?? "",
        mobile: editing.mobile ?? "",
        subject: editing.subject ?? "",
        qualification: editing.qualification ?? "",
        experienceYears: editing.experienceYears != null ? String(editing.experienceYears) : "",
        bio: editing.bio ?? "",
        status: editing.status,
        roleType: editing.roleType || "FACULTY",
        department: editing.department || "ACADEMIC",
        monthlySalary: editing.monthlySalary != null ? String(editing.monthlySalary) : "",
        branchId: editing.branchId || "",
        hasSystemAccess: Boolean(editing.hasSystemAccess),
        password: "",
      });

      setIsAllBranches(Boolean(editing.isAllBranches));

      // Populate allocated branches
      const allocatedBranchIds =
        editing.branches && editing.branches.length > 0
          ? editing.branches.map((b) => b.id)
          : editing.branchId
          ? [editing.branchId]
          : [];
      setSelectedBranchIds(allocatedBranchIds);

      // Populate multiple subjects
      const initialSubjects =
        editing.subjects && editing.subjects.length > 0
          ? editing.subjects
          : editing.subject
          ? editing.subject.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      setSelectedSubjects(initialSubjects);

      // Populate qualifications
      const initialQuals = editing.qualification
        ? editing.qualification.split(",").map((q) => q.trim()).filter(Boolean)
        : [];
      setSelectedQualifications(initialQuals);

      // Populate courses from existing batches
      const assignedCourseIds = new Set<string>();
      editing.batches.forEach((bf) => {
        const matchingBatch = batches.find((b) => b.id === bf.batchId);
        if (matchingBatch?.courseId) {
          assignedCourseIds.add(matchingBatch.courseId);
        } else if (matchingBatch?.courseName) {
          assignedCourseIds.add(matchingBatch.courseName);
        } else if (bf.courseName) {
          // Look up matching course by name
          const match = availableCourses.find((c) => c.name.toLowerCase() === bf.courseName.toLowerCase());
          if (match) assignedCourseIds.add(match.id);
          else assignedCourseIds.add(bf.courseName);
        }
      });

      setSelectedCourseIds(Array.from(assignedCourseIds));
      setSelectedBatchIds(editing.batches.map((b) => b.batchId));
    } else {
      setForm(EMPTY_FORM);
      setIsAllBranches(false);
      setSelectedBranchIds([]);
      setSelectedSubjects([]);
      setSelectedQualifications([]);
      setSelectedCourseIds([]);
      setSelectedBatchIds([]);
      setCustomSubjectInput("");
      setCustomQualInput("");
    }
    setError("");
  }, [open, editing, batches, availableCourses]);

  const toggleQualification = (qual: string) => {
    setSelectedQualifications((prev) => {
      const next = prev.includes(qual) ? prev.filter((q) => q !== qual) : [...prev, qual];
      setForm((f) => ({ ...f, qualification: next.join(", ") }));
      return next;
    });
  };

  const handleAddCustomQual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customQualInput.trim();
    if (trimmed && !selectedQualifications.includes(trimmed)) {
      const next = [...selectedQualifications, trimmed];
      setSelectedQualifications(next);
      setForm((f) => ({ ...f, qualification: next.join(", ") }));
      setCustomQualInput("");
    }
  };

  const removeQualification = (qual: string) => {
    setSelectedQualifications((prev) => {
      const next = prev.filter((q) => q !== qual);
      setForm((f) => ({ ...f, qualification: next.join(", ") }));
      return next;
    });
  };

  const handleRoleChange = (selectedRoleValue: string) => {
    const found = ROLE_OPTIONS.find((r) => r.value === selectedRoleValue);
    setForm((prev) => ({
      ...prev,
      roleType: selectedRoleValue,
      department: found?.department || "OPERATIONS_SUPPORT",
      hasSystemAccess: ["FACULTY", "COUNSELLOR", "ACCOUNTANT", "TECHNICIAN"].includes(selectedRoleValue),
    }));
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) => {
      const next = prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId];
      return next;
    });
  };

  const selectAllCourses = () => {
    setSelectedCourseIds(availableCourses.map((c) => c.id));
  };

  const clearAllCourses = () => {
    setSelectedCourseIds([]);
    setSelectedBatchIds([]);
  };

  // Batches matching the selected course(s)
  const filteredBatches = useMemo(() => {
    if (selectedCourseIds.length === 0) return [];
    return batches.filter((b) => {
      if (b.courseId && selectedCourseIds.includes(b.courseId)) return true;
      if (selectedCourseIds.includes(b.courseName)) return true;
      // also check matching by course name
      const matchingCourse = availableCourses.find((c) => selectedCourseIds.includes(c.id));
      if (matchingCourse && b.courseName && b.courseName.toLowerCase() === matchingCourse.name.toLowerCase()) {
        return true;
      }
      return false;
    });
  }, [batches, selectedCourseIds, availableCourses]);

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  const selectAllFilteredBatches = () => {
    const filteredIds = filteredBatches.map((b) => b.id);
    setSelectedBatchIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const clearFilteredBatches = () => {
    const filteredIds = new Set(filteredBatches.map((b) => b.id));
    setSelectedBatchIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  const selectAllBranches = () => {
    setSelectedBranchIds(branches.map((b) => b.id));
  };

  const clearAllBranches = () => {
    setSelectedBranchIds([]);
  };

  const toggleSubject = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const handleAddCustomSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSubjectInput.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed]);
      setCustomSubjectInput("");
    }
  };

  const removeSubject = (subj: string) => {
    setSelectedSubjects((prev) => prev.filter((s) => s !== subj));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        isAllBranches,
        branchIds: isAllBranches ? [] : selectedBranchIds,
        branchId: !isAllBranches && selectedBranchIds.length > 0 ? selectedBranchIds[0] : null,
        subjects: selectedSubjects,
        subject: selectedSubjects.join(", "),
      };

      if (editing) {
        const res = await fetch(`/api/faculty/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update staff record");

        const previouslyAssigned = editing.batches.map((b) => b.batchId);
        const toAssign = selectedBatchIds.filter((id) => !previouslyAssigned.includes(id));
        const toUnassign = previouslyAssigned.filter((id) => !selectedBatchIds.includes(id));

        await Promise.all([
          ...toAssign.map((batchId) =>
            fetch(`/api/faculty/${editing.id}/assign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ batchId }),
            })
          ),
          ...toUnassign.map((batchId) =>
            fetch(`/api/faculty/${editing.id}/assign`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ batchId }),
            })
          ),
        ]);
      } else {
        const res = await fetch("/api/faculty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            batchIds: selectedBatchIds,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create staff member");
        }
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving personnel record.");
    } finally {
      setLoading(false);
    }
  };

  const isTeachingRole = form.roleType === "FACULTY" || form.roleType === "DOUBT_FACULTY";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : "Add Staff / Faculty Member"}
      maxWidth="max-w-xl lg:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        {error && (
          <p className="rounded-xl bg-danger-50 px-3 py-2.5 text-xs text-danger-600 font-medium">
            {error}
          </p>
        )}

        {/* Core Personal Details */}
        <div className="space-y-3">
          <Field label="Full Name *">
            <input
              required
              placeholder="e.g. Dr. Alok Gupta"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile Number">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile"
                value={form.mobile}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                className={inputClass}
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                placeholder="teacher@institute.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Organizational Role */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/40 p-3.5 space-y-3">
          <p className="text-xs font-bold text-scholar-800 uppercase tracking-wider">
            Role & Compensation
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Position / Role Category">
              <select
                value={form.roleType}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={inputClass}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Monthly Base Salary (₹)">
              <input
                type="number"
                min="0"
                placeholder="e.g. 85000"
                value={form.monthlySalary}
                onChange={(e) => setForm((p) => ({ ...p, monthlySalary: e.target.value }))}
                className={inputClass}
              />
            </Field>

            <Field label="Employment Status">
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className={inputClass}
              >
                <option value="ACTIVE">Active Employee</option>
                <option value="UNDER_REVIEW">Under Review / Probation</option>
                <option value="REMOVED">Inactive / Relieved</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Multi-Branch Campus Allocation */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
              <Building2 size={14} className="text-scholar-600" />
              <span>Multi-Branch Campus Allocation</span>
            </label>
            {branches.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllBranches}
                  className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={clearAllBranches}
                  className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {branches.length === 0 ? (
            <p className="text-xs text-scholar-500 bg-scholar-50 p-2.5 rounded-lg border border-scholar-100">
              This institute has only one branch (Main Branch) — no branch selection needed.
            </p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs font-semibold text-scholar-700 cursor-pointer bg-white p-2.5 rounded-lg border border-scholar-200">
                <input
                  type="checkbox"
                  checked={isAllBranches}
                  onChange={(e) => setIsAllBranches(e.target.checked)}
                  className="h-4 w-4 rounded text-scholar-600 focus:ring-scholar-500"
                />
                <span>All Branches / Visiting Star Faculty (Conducts lectures across all campuses)</span>
              </label>

              {!isAllBranches && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-scholar-500">
                    Allocate campuses where this staff member operates:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {branches.map((b) => {
                      const isSelected = selectedBranchIds.includes(b.id);
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => toggleBranch(b.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "bg-scholar-600 text-white border-scholar-600 font-semibold shadow-xs"
                              : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
                          }`}
                        >
                          <span className="truncate">
                            {b.name} {b.city ? `(${b.city})` : ""}
                          </span>
                          {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Academic Multi-Subject & Courses / Batches Allocation (shown only if teaching staff) */}
        {isTeachingRole && (
          <div className="space-y-4">
            {/* Multi-Subject Specialization */}
            <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-scholar-600" />
                  <span>Subject Specialization</span>
                </label>
                <span className="text-[10px] text-scholar-500 font-medium">
                  {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""} selected
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SUBJECTS.map((subj) => {
                  const isSelected = selectedSubjects.includes(subj);
                  return (
                    <button
                      type="button"
                      key={subj}
                      onClick={() => toggleSubject(subj)}
                      className={`rounded-lg px-2.5 py-1 text-xs transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-scholar-600 text-white border-scholar-600 font-semibold shadow-xs"
                          : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-100"
                      }`}
                    >
                      {subj}
                    </button>
                  );
                })}
              </div>

              {/* Custom Subject Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Or type custom subject (e.g. Vedic Maths, Statistics)..."
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSubject();
                    }
                  }}
                  className={`${inputClass} text-xs py-1.5`}
                />
                <button
                  type="button"
                  onClick={handleAddCustomSubject}
                  className="flex items-center gap-1 rounded-xl bg-scholar-600 px-3 py-2 text-xs font-semibold text-white hover:bg-scholar-700 shrink-0 cursor-pointer"
                >
                  <Plus size={13} /> Add
                </button>
              </div>

              {/* Selected Subjects Pills */}
              {selectedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedSubjects.map((subj) => (
                    <span
                      key={subj}
                      className="inline-flex items-center gap-1 rounded-md bg-scholar-100 text-scholar-800 border border-scholar-300 px-2 py-0.5 text-xs font-bold"
                    >
                      {subj}
                      <button
                        type="button"
                        onClick={() => removeSubject(subj)}
                        className="hover:text-danger-600 text-scholar-400 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <Field label="Teaching Experience (Years)">
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 8"
                    value={form.experienceYears}
                    onChange={(e) => setForm((p) => ({ ...p, experienceYears: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* Degrees & Qualifications with Preset Chips & Custom Input */}
              <div className="space-y-2 pt-2 border-t border-scholar-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-scholar-800 flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-scholar-600" />
                    <span>Degrees &amp; Academic Qualifications</span>
                  </label>
                  <span className="text-[10px] text-scholar-500 font-medium">
                    {selectedQualifications.length} qualification{selectedQualifications.length !== 1 ? "s" : ""} selected
                  </span>
                </div>

                {/* Preset Degree Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_QUALIFICATIONS.map((qual) => {
                    const isSelected = selectedQualifications.includes(qual);
                    return (
                      <button
                        type="button"
                        key={qual}
                        onClick={() => toggleQualification(qual)}
                        className={`rounded-lg px-2.5 py-1 text-xs transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-scholar-600 text-white border-scholar-600 font-semibold shadow-xs"
                            : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-100"
                        }`}
                      >
                        {qual}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Degree Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="text"
                    placeholder="Or type custom qualification/college (e.g. B.Tech IIT Delhi, M.Sc Gold Medalist)..."
                    value={customQualInput}
                    onChange={(e) => setCustomQualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomQual();
                      }
                    }}
                    className={`${inputClass} text-xs py-1.5`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomQual}
                    className="flex items-center gap-1 rounded-xl bg-scholar-600 px-3 py-2 text-xs font-semibold text-white hover:bg-scholar-700 shrink-0 cursor-pointer"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                {/* Selected Qualifications Pills */}
                {selectedQualifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {selectedQualifications.map((qual) => (
                      <span
                        key={qual}
                        className="inline-flex items-center gap-1 rounded-md bg-scholar-100 text-scholar-800 border border-scholar-300 px-2 py-0.5 text-xs font-bold"
                      >
                        {qual}
                        <button
                          type="button"
                          onClick={() => removeQualification(qual)}
                          className="hover:text-danger-600 text-scholar-400 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* STEP 1: Courses Faculty Can Teach */}
            <div className="rounded-xl border-2 border-scholar-200 bg-white p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-scholar-900 flex items-center gap-1.5">
                  <GraduationCap size={16} className="text-scholar-600" />
                  <span>Step 1: Courses Faculty Can Teach (Select Multiple)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllCourses}
                    className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={clearAllCourses}
                    className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-scholar-500">
                Choose one or more courses taught by this faculty. Available batches matching these courses will appear in Step 2.
              </p>

              {availableCourses.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {availableCourses.map((c) => {
                    const isSelected = selectedCourseIds.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleCourse(c.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-scholar-600 text-white border-scholar-600 shadow-xs"
                            : "bg-scholar-50 text-scholar-700 border-scholar-200 hover:bg-scholar-100"
                        }`}
                      >
                        <span>{c.name}</span>
                        {c.duration && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              isSelected ? "bg-white/20 text-white" : "bg-scholar-200 text-scholar-700"
                            }`}
                          >
                            {c.duration}
                          </span>
                        )}
                        {isSelected ? (
                          <Check size={14} className="text-white shrink-0" />
                        ) : (
                          <Plus size={13} className="text-scholar-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-scholar-400 italic">No courses found in the system yet.</p>
              )}
            </div>

            {/* STEP 2: Assign Batches from Selected Courses */}
            <div className="rounded-xl border-2 border-scholar-200 bg-white p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-scholar-900 flex items-center gap-1.5">
                  <Building2 size={16} className="text-scholar-600" />
                  <span>Step 2: Assign Batches for Selected Courses</span>
                </label>
                {filteredBatches.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredBatches}
                      className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                    >
                      Assign All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={clearFilteredBatches}
                      className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {selectedCourseIds.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-scholar-300 bg-scholar-50/50 text-center space-y-1">
                  <p className="text-xs font-semibold text-scholar-700">Please select course(s) above first</p>
                  <p className="text-[11px] text-scholar-500">
                    Pick the course programs in Step 1 to load and assign specific batches for this faculty.
                  </p>
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="p-4 rounded-xl border border-scholar-200 bg-scholar-50/50 text-center text-xs text-scholar-500">
                  No active batches found for the selected course(s). You can create new batches under the selected course in the Batches section.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredBatches.map((b) => {
                    const checked = selectedBatchIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => toggleBatch(b.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          checked
                            ? "border-scholar-600 bg-scholar-600 font-semibold text-white shadow-xs"
                            : "border-scholar-200 bg-scholar-50/40 text-scholar-700 hover:bg-scholar-50"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold flex items-center gap-1.5">
                            <span>{b.name}</span>
                            {b.timing && (
                              <span
                                className={`text-[10px] font-normal flex items-center gap-0.5 px-1.5 py-0.2 rounded ${
                                  checked ? "bg-white/20 text-white" : "bg-scholar-100 text-scholar-600"
                                }`}
                              >
                                <Clock size={10} /> {b.timing}
                              </span>
                            )}
                          </span>
                          <span className={`text-[10px] ${checked ? "text-white/80" : "text-scholar-500"}`}>
                            Course: {b.courseName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              checked
                                ? "bg-white/20 text-white"
                                : "bg-scholar-200/70 text-scholar-800"
                            }`}
                          >
                            <Building2 size={11} />
                            {b.branchName || "Main Branch"}
                          </span>
                          {checked && <Check size={14} className="text-white shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Access / Portal Login */}
        <div className="rounded-xl border border-scholar-200 bg-white p-3.5 space-y-3 shadow-xs">
          <label className="flex items-center gap-2 text-xs font-semibold text-scholar-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasSystemAccess}
              onChange={(e) => setForm((p) => ({ ...p, hasSystemAccess: e.target.checked }))}
              className="h-4 w-4 rounded text-scholar-600 focus:ring-scholar-500"
            />
            <span>Create Institute Software Login Account for this Staff Member</span>
          </label>

          {form.hasSystemAccess && !editing && (
            <Field label="Initial Password (min 6 characters) *">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required={form.hasSystemAccess}
                  placeholder="Set secure password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className={`${inputClass} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-scholar-400 hover:text-scholar-700 transition p-0.5 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-sm font-semibold text-scholar-600 hover:bg-scholar-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-60 shadow-xs cursor-pointer"
          >
            {loading ? "Saving..." : editing ? "Update Personnel" : "Register Personnel"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}