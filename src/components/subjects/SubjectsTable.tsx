"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Lock } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddSubjectDrawer } from "./AddSubjectDrawer";

type Subject = {
  id: string;
  name: string;
  createdAt: string;
  course: {
    id: string;
    name: string;
  };
};

export function SubjectsTable({
  subjects,
  courses,
  canEdit = true,
}: {
  subjects: Subject[];
  courses: { id: string; name: string }[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      const matchesQuery = query.trim() === "" || s.name.toLowerCase().includes(query.toLowerCase());
      const matchesCourse = !courseFilter || s.course.id === courseFilter;
      return matchesQuery && matchesCourse;
    });
  }, [subjects, query, courseFilter]);

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/subjects/${subjectToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete subject");
      setSubjectToDelete(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {!canEdit && (
        <div className="mb-4 rounded-xl border border-scholar-200 bg-scholar-50/70 p-3 text-xs text-scholar-700 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-scholar-500 shrink-0" />
            <span>
              <strong>Curriculum & Subjects (Read-Only)</strong>: Faculty members can view subjects across courses.
              Adding, editing, or deleting curriculum subjects is restricted to institute administration.
            </span>
          </div>
          <Badge tone="neutral">Read-Only Mode</Badge>
        </div>
      )}

      <Card className="p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 sm:max-w-xs sm:flex-1">
              <Search size={16} className="text-scholar-300" />
              <input
                placeholder="Search subjects"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-scholar-300"
              />
            </div>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 text-sm text-scholar-600 outline-none"
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {canEdit && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-scholar-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700"
            >
              <Plus size={16} />
              Add Subject
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-scholar-100 text-left text-xs font-medium uppercase tracking-wide text-scholar-400">
                <th className="py-3 pr-4">Subject</th>
                <th className="py-3 pr-4">Course</th>
                {canEdit && <th className="py-3 pr-2 text-right">Actions</th>}
              </tr>
            </thead>

            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-scholar-50 last:border-0 hover:bg-paper/60">
                  <td className="py-3 pr-4 font-medium text-ink">{s.name}</td>
                  <td className="py-3 pr-4 text-scholar-500">{s.course.name}</td>
                  {canEdit && (
                    <td className="py-3 pr-2 text-right">
                      <button
                        onClick={() => setSubjectToDelete(s)}
                        className="text-scholar-300 hover:text-danger-600 p-1 transition"
                        aria-label="Delete"
                        title="Delete Subject"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 3 : 2} className="py-10 text-center text-sm text-scholar-400">
                    No subjects match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-scholar-400 tabular-nums">
          Showing {filtered.length} of {subjects.length} subjects.
        </p>
      </Card>

      <AddSubjectDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} courses={courses} />

      <ConfirmDialog
        open={!!subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={confirmDeleteSubject}
        title="Delete Subject"
        message={
          subjectToDelete ? (
            <span>
              Are you sure you want to delete subject <strong>&ldquo;{subjectToDelete.name}&rdquo;</strong> under{" "}
              <strong>{subjectToDelete.course.name}</strong>? This action cannot be undone.
            </span>
          ) : null
        }
        confirmLabel="Delete Subject"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </>
  );
}