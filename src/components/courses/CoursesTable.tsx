"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  Building2,
  Clock,
  Info,
  Pencil,
  Calendar,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddCourseDrawer } from "./AddCourseDrawer";
import { EditCourseDrawer } from "./EditCourseDrawer";
import { formatDate } from "@/lib/utils";

export type CourseItem = {
  id: string;
  name: string;
  fee: string;
  feeType?: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | string;
  description?: string | null;
  duration?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  targetExam?: string | null;
  eligibility?: string | null;
  isAllBranches?: boolean;
  branches?: { id: string; name: string; city?: string | null }[];
  createdAt: string;
  _count: { batches: number; students: number; subjects: number };
};

type BranchOption = {
  id: string;
  name: string;
  city: string | null;
};

export function CoursesTable({
  courses,
  availableBranches = [],
}: {
  courses: CourseItem[];
  availableBranches?: BranchOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [editCourse, setEditCourse] = useState<CourseItem | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchQuery =
        query.trim() === "" ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.targetExam?.toLowerCase().includes(query.toLowerCase()) ||
        c.branches?.some((b) => b.name.toLowerCase().includes(query.toLowerCase()));

      const matchFeeType =
        feeTypeFilter === "ALL" || (c.feeType || "ONE_TIME") === feeTypeFilter;

      return matchQuery && matchFeeType;
    });
  }, [courses, query, feeTypeFilter]);

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete course");
      }
      setCourseToDelete(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete course. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Card className="p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:flex-1">
            <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 sm:max-w-xs flex-1">
              <Search size={16} className="text-scholar-300" />
              <input
                placeholder="Search courses, exams, branches..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-scholar-300"
              />
            </div>

            {/* Filter by Fee Type */}
            <select
              value={feeTypeFilter}
              onChange={(e) => setFeeTypeFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 text-xs font-semibold text-scholar-700 outline-none"
            >
              <option value="ALL">All Fee Types</option>
              <option value="ONE_TIME">Full Course Fee</option>
              <option value="MONTHLY">Monthly Recurring</option>
              <option value="QUARTERLY">Quarterly Recurring</option>
              <option value="ANNUAL">Annual Fee</option>
            </select>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-scholar-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 shadow-xs"
          >
            <Plus size={16} />
            Add Course
          </button>
        </div>

        {deleteError && (
          <p className="mb-4 rounded-xl bg-danger-50 px-3 py-2.5 text-sm text-danger-600 font-medium">
            {deleteError}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-scholar-100 text-left text-xs font-medium uppercase tracking-wide text-scholar-400">
                <th className="py-3 pr-4">Course & Target Exam</th>
                <th className="py-3 pr-4">Fee Structure</th>
                <th className="py-3 pr-4">Branch Allocation</th>
                <th className="py-3 pr-4">Duration</th>
                <th className="py-3 pr-4">Batches</th>
                <th className="py-3 pr-4">Students</th>
                <th className="py-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-scholar-400">
                    No courses found. Click &quot;Add Course&quot; to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isMonthly = c.feeType === "MONTHLY";
                  const isQuarterly = c.feeType === "QUARTERLY";
                  const isAnnual = c.feeType === "ANNUAL";

                  return (
                    <tr key={c.id} className="border-b border-scholar-50 last:border-0 hover:bg-paper/60 transition-colors">
                      {/* Course Name & Exam */}
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-ink text-sm">{c.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {c.targetExam && (
                              <span className="inline-flex items-center rounded-md bg-scholar-50 px-1.5 py-0.5 text-[11px] font-bold text-scholar-700 border border-scholar-200">
                                {c.targetExam}
                              </span>
                            )}
                            {c.eligibility && (
                              <span className="text-[11px] text-scholar-400 truncate max-w-[150px]">
                                • {c.eligibility}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fee Structure */}
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-ink">
                            ₹{Number(c.fee).toLocaleString("en-IN")}
                          </span>
                          <span className="mt-0.5">
                            {isMonthly ? (
                              <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                Monthly Recurring
                              </span>
                            ) : isQuarterly ? (
                              <span className="inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700 border border-cyan-200">
                                Quarterly Recurring
                              </span>
                            ) : isAnnual ? (
                              <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                                Annual Fee
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                Full Course (One-Time / Installments)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Branch Allocation */}
                      <td className="py-3.5 pr-4">
                        {c.isAllBranches !== false || !c.branches || c.branches.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-scholar-50 px-2 py-1 text-xs font-semibold text-scholar-700 border border-scholar-200">
                            <Building2 size={12} className="text-scholar-500" /> All Branches
                          </span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200 w-fit">
                              <Building2 size={12} className="text-amber-600" />
                              {c.branches.length} {c.branches.length === 1 ? "Branch" : "Branches"}
                            </span>
                            <span className="text-[11px] text-scholar-400 truncate max-w-[160px] mt-0.5">
                              {c.branches.map((b) => b.name).join(", ")}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 pr-4 text-scholar-600 text-xs">
                        <div className="flex flex-col gap-0.5">
                          {c.duration ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-scholar-50 px-2 py-0.5 text-xs font-semibold text-scholar-800 border border-scholar-200 w-fit">
                              <Clock size={11} className="text-scholar-600" /> {c.duration}
                            </span>
                          ) : (
                            <span className="text-scholar-300">—</span>
                          )}

                          {c.startDate && (
                            <span className="text-[10px] text-scholar-500">
                              Starts: {formatDate(c.startDate)}
                            </span>
                          )}

                          {c.endDate && (
                            <span
                              className={`text-[10px] font-semibold ${
                                new Date() > new Date(c.endDate)
                                  ? "text-danger-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {new Date() > new Date(c.endDate)
                                ? "⏳ Expired / Completed"
                                : `Ends: ${formatDate(c.endDate)}`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Batches & Students */}
                      <td className="py-3.5 pr-4 text-scholar-700 tabular-nums font-medium">
                        {c._count.batches}
                      </td>
                      <td className="py-3.5 pr-4 text-scholar-700 tabular-nums font-medium">
                        {c._count.students}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditCourse(c)}
                            className="rounded-lg p-1.5 text-scholar-500 hover:bg-scholar-100 hover:text-scholar-800 transition-colors"
                            title="Edit Course & Duration"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setSelectedCourse(c)}
                            className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-50 hover:text-scholar-700 transition-colors"
                            title="View Syllabus & Course Details"
                          >
                            <Info size={15} />
                          </button>
                          <button
                            onClick={() => setCourseToDelete(c)}
                            className="rounded-lg p-1.5 text-scholar-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
                            title="Delete course"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Course Drawer */}
      <AddCourseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        availableBranches={availableBranches}
      />

      {/* Course Details Modal/Drawer */}
      {selectedCourse && (
        <Drawer
          open={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
          title={selectedCourse.name}
        >
          <div className="space-y-4 text-sm pb-6">
            {/* Header info */}
            <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-scholar-500 uppercase tracking-wider">
                  Target Exam
                </span>
                <span className="rounded-md bg-scholar-600 text-white px-2 py-0.5 text-xs font-bold">
                  {selectedCourse.targetExam || "General Academic"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-scholar-200/60">
                <span className="text-xs font-bold text-scholar-500 uppercase tracking-wider">
                  Fee Structure
                </span>
                <span className="font-bold text-ink text-base">
                  ₹{Number(selectedCourse.fee).toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-semibold text-scholar-500">
                    {selectedCourse.feeType === "MONTHLY"
                      ? "/ month"
                      : selectedCourse.feeType === "QUARTERLY"
                      ? "/ quarter (every 3 months)"
                      : selectedCourse.feeType === "ANNUAL"
                      ? "/ year"
                      : "(Full Course / Installments)"}
                  </span>
                </span>
              </div>

              {selectedCourse.duration && (
                <div className="flex items-center justify-between pt-1 border-t border-scholar-200/60 text-xs">
                  <span className="font-bold text-scholar-500 uppercase tracking-wider">Duration</span>
                  <span className="font-semibold text-scholar-800 flex items-center gap-1">
                    <Clock size={12} className="text-scholar-500" /> {selectedCourse.duration}
                  </span>
                </div>
              )}

              {selectedCourse.eligibility && (
                <div className="flex items-center justify-between pt-1 border-t border-scholar-200/60 text-xs">
                  <span className="font-bold text-scholar-500 uppercase tracking-wider">Eligibility</span>
                  <span className="font-semibold text-scholar-800">{selectedCourse.eligibility}</span>
                </div>
              )}
            </div>

            {/* Branch Allocation Breakdown */}
            <div className="rounded-xl border border-scholar-200 bg-white p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
                <Building2 size={15} className="text-scholar-600" /> Branch Allocation
              </h4>
              {selectedCourse.isAllBranches !== false || !selectedCourse.branches || selectedCourse.branches.length === 0 ? (
                <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 font-semibold">
                  ✓ Available across all branches of the institute.
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs text-scholar-600">
                    This course is exclusively delivered at the following {selectedCourse.branches.length} branches:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCourse.branches.map((b) => (
                      <span
                        key={b.id}
                        className="rounded-lg bg-scholar-100 border border-scholar-200 px-2.5 py-1 text-xs font-bold text-scholar-800"
                      >
                        {b.name} {b.city ? `(${b.city})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Course Description & Syllabus Details */}
            <div className="rounded-xl border border-scholar-200 bg-white p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-scholar-800">
                Course Inclusions & Syllabus Overview
              </h4>
              {selectedCourse.description ? (
                <p className="text-xs text-scholar-700 whitespace-pre-line leading-relaxed">
                  {selectedCourse.description}
                </p>
              ) : (
                <p className="text-xs text-scholar-400 italic">
                  No syllabus description entered for this course yet.
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="rounded-lg bg-scholar-50 border border-scholar-100 p-2.5">
                <p className="text-lg font-bold text-scholar-900 tabular-nums">{selectedCourse._count.batches}</p>
                <p className="text-[10px] uppercase font-bold text-scholar-500">Batches</p>
              </div>
              <div className="rounded-lg bg-scholar-50 border border-scholar-100 p-2.5">
                <p className="text-lg font-bold text-scholar-900 tabular-nums">{selectedCourse._count.students}</p>
                <p className="text-[10px] uppercase font-bold text-scholar-500">Students</p>
              </div>
              <div className="rounded-lg bg-scholar-50 border border-scholar-100 p-2.5">
                <p className="text-lg font-bold text-scholar-900 tabular-nums">{selectedCourse._count.subjects}</p>
                <p className="text-[10px] uppercase font-bold text-scholar-500">Subjects</p>
              </div>
            </div>

            <div className="pt-2 border-t border-scholar-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditCourse(selectedCourse);
                  setSelectedCourse(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-scholar-700 transition-colors shadow-xs"
              >
                <Pencil size={13} />
                Edit Course & Duration
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {/* Edit Course Drawer */}
      <EditCourseDrawer
        open={!!editCourse}
        onClose={() => setEditCourse(null)}
        course={editCourse}
        availableBranches={availableBranches}
        onUpdated={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={confirmDeleteCourse}
        title="Delete Course"
        message={
          courseToDelete ? (
            <span>
              Are you sure you want to delete course <strong>&ldquo;{courseToDelete.name}&rdquo;</strong>?{" "}
              {courseToDelete._count.students > 0 && (
                <span className="block mt-1 text-rose-600 font-semibold">
                  ⚠️ Note: This course currently has {courseToDelete._count.students} enrolled students and{" "}
                  {courseToDelete._count.batches} active batches.
                </span>
              )}
            </span>
          ) : null
        }
        confirmLabel="Delete Course"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </>
  );
}