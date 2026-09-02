"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  CheckSquare,
  Calendar,
  ExternalLink,
  Trash2,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateAssignmentDrawer } from "./CreateAssignmentDrawer";
import { SubmissionsDrawer } from "./SubmissionsDrawer";
import { formatDate } from "@/lib/utils";

type Batch = {
  id: string;
  name: string;
  course: { id: string; name: string };
};

export type AssignmentItem = {
  id: string;
  title: string;
  subject: string;
  type: string;
  description: string | null;
  attachmentUrl: string | null;
  dueDate: string;
  totalMarks: number;
  batchId: string;
  batchName: string;
  courseName: string;
  totalStudents: number;
  submittedCount: number;
  evaluatedCount: number;
  createdAt: string;
};

type Course = {
  id: string;
  name: string;
};

export function AssignmentsView({
  batches,
  courses: passedCourses,
  initialAssignments,
}: {
  batches: Batch[];
  courses?: Course[];
  initialAssignments: AssignmentItem[];
}) {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [selectedCourseId, setSelectedCourseId] = useState("ALL");
  const [selectedBatchId, setSelectedBatchId] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<AssignmentItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submissionsModal, setSubmissionsModal] = useState<{
    id: string;
    title: string;
    totalMarks: number;
  } | null>(null);

  const courses = useMemo(() => {
    if (passedCourses && passedCourses.length > 0) return passedCourses;
    const map = new Map<string, { id: string; name: string }>();
    batches.forEach((b) => {
      if (b.course && b.course.id) {
        map.set(b.course.id, b.course);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [batches, passedCourses]);

  const availableFilterBatches = useMemo(() => {
    if (selectedCourseId === "ALL") return batches;
    return batches.filter((b) => b.course.id === selectedCourseId);
  }, [batches, selectedCourseId]);

  const refreshAssignments = async () => {
    try {
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch {
      console.error("Failed to refresh assignments");
    }
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentToDelete.id));
        setAssignmentToDelete(null);
      }
    } catch {
      console.error("Failed to delete assignment");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = assignments.filter((a) => {
    if (selectedCourseId !== "ALL") {
      const b = batches.find((batch) => batch.id === a.batchId);
      if (b && b.course.id !== selectedCourseId) return false;
    }
    if (selectedBatchId !== "ALL" && a.batchId !== selectedBatchId) return false;
    if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(term);
      const matchSubject = a.subject.toLowerCase().includes(term);
      const matchBatch = a.batchName.toLowerCase().includes(term);
      const matchCourse = a.courseName.toLowerCase().includes(term);
      if (!matchTitle && !matchSubject && !matchBatch && !matchCourse) return false;
    }
    return true;
  });

  const totalDpps = assignments.filter((a) => a.type === "DPP").length;
  const totalHomework = assignments.filter((a) => a.type === "HOMEWORK").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Assignments & DPP Hub</h1>
          <p className="mt-0.5 text-xs text-scholar-400">
            Publish daily practice problems, assign homework, collect student submissions, and grade work.
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-scholar-700 transition-colors"
        >
          <Plus size={15} /> Create Assignment / DPP
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <span className="text-[11px] font-semibold text-scholar-500">Total Assignments</span>
          <p className="font-display text-2xl font-bold text-ink mt-1">{assignments.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] font-semibold text-scholar-500">Daily Practice (DPP)</span>
          <p className="font-display text-2xl font-bold text-scholar-700 mt-1">{totalDpps}</p>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] font-semibold text-scholar-500">Homework & Projects</span>
          <p className="font-display text-2xl font-bold text-emerald-600 mt-1">{totalHomework}</p>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] font-semibold text-scholar-500">Active Batches</span>
          <p className="font-display text-2xl font-bold text-amber-600 mt-1">{batches.length}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-scholar-100/70 p-1">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                typeFilter === "ALL" ? "bg-white text-ink shadow-xs" : "text-scholar-600"
              }`}
            >
              All ({assignments.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("DPP")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                typeFilter === "DPP" ? "bg-white text-ink shadow-xs" : "text-scholar-600"
              }`}
            >
              DPP ({totalDpps})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("HOMEWORK")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                typeFilter === "HOMEWORK" ? "bg-white text-ink shadow-xs" : "text-scholar-600"
              }`}
            >
              Homework ({totalHomework})
            </button>
          </div>

          {/* Course Filter */}
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSelectedBatchId("ALL");
            }}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none cursor-pointer"
          >
            <option value="ALL">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none cursor-pointer"
          >
            <option value="ALL">All Batches</option>
            {availableFilterBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.course.name})
              </option>
            ))}
          </select>

          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none"
            />
          </div>
        </div>

        <span className="text-xs font-medium text-scholar-400">
          Showing {filtered.length} assignments
        </span>
      </div>

      {/* Grid of Assignments */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-scholar-100 bg-white p-12 text-center shadow-card">
          <CheckSquare size={28} className="mx-auto text-scholar-400" />
          <h3 className="mt-3 font-display text-base font-semibold text-ink">No Assignments Found</h3>
          <p className="mt-1 text-xs text-scholar-400 max-w-sm mx-auto">
            {search || selectedBatchId !== "ALL"
              ? "No assignments match your current filters."
              : "Create daily practice problem sheets (DPPs) or homework tasks for your batches."}
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700"
          >
            <Plus size={14} /> Create Assignment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isDpp = item.type === "DPP";
            return (
              <Card
                key={item.id}
                className="flex flex-col justify-between p-5 transition-all hover:shadow-popover"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={isDpp ? "marigold" : "scholar"}>{item.type}</Badge>
                      <span className="rounded-full bg-scholar-50 px-2 py-0.5 text-[10px] font-semibold text-scholar-700 border border-scholar-200">
                        {item.subject}
                      </span>
                      <span className="rounded-full bg-scholar-50 px-2 py-0.5 text-[10px] font-medium text-scholar-600 border border-scholar-100">
                        {item.batchName}
                      </span>
                    </div>

                    <button
                      onClick={() => setAssignmentToDelete(item)}
                      className="text-scholar-300 hover:text-rose-600 p-1 transition"
                      title="Delete Assignment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 className="mt-3 font-display text-sm font-bold text-ink hover:text-scholar-600">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-scholar-400">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-y border-scholar-50 py-2 text-xs text-scholar-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={13} className="text-scholar-400" />
                      <span>Due: {formatDate(item.dueDate)}</span>
                    </div>
                    <span className="font-semibold text-scholar-700">
                      Max Marks: {item.totalMarks}
                    </span>
                  </div>

                  {/* Submission statistics */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-scholar-500">Submissions:</span>
                    <span className="font-semibold text-ink">
                      {item.submittedCount} / {item.totalStudents} students ({item.evaluatedCount}{" "}
                      graded)
                    </span>
                  </div>

                  {item.attachmentUrl && (
                    <div className="mt-2">
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-scholar-600 hover:underline"
                      >
                        <ExternalLink size={11} /> View Problem Attachment
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-scholar-100 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSubmissionsModal({
                        id: item.id,
                        title: item.title,
                        totalMarks: item.totalMarks,
                      })
                    }
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-scholar-50 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-100 transition-colors"
                  >
                    <Users size={13} />
                    View Submissions & Grade ({item.submittedCount})
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Drawer */}
      <CreateAssignmentDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        batches={batches}
        courses={courses}
        onCreated={refreshAssignments}
      />

      {/* Submissions Drawer */}
      {submissionsModal && (
        <SubmissionsDrawer
          open={Boolean(submissionsModal)}
          onClose={() => setSubmissionsModal(null)}
          assignmentId={submissionsModal.id}
          assignmentTitle={submissionsModal.title}
          totalMarks={submissionsModal.totalMarks}
          onEvaluated={refreshAssignments}
        />
      )}

      <ConfirmDialog
        open={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={confirmDeleteAssignment}
        title="Delete Assignment"
        message={
          assignmentToDelete ? (
            <span>
              Are you sure you want to delete assignment <strong>&ldquo;{assignmentToDelete.title}&rdquo;</strong> for{" "}
              <strong>{assignmentToDelete.batchName}</strong>? All student submissions and grades will also be permanently deleted.
            </span>
          ) : null
        }
        confirmLabel="Delete Assignment"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
