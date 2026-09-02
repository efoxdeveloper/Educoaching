"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, X, Clock3, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { initials, cn } from "@/lib/utils";

type Batch = { id: string; name: string; timing: string; course: { id?: string; name: string } };
type Course = { id: string; name: string };
type Student = { id: string; name: string; mobile: string; batchId: string | null };
type Status = "PRESENT" | "ABSENT" | "LATE";

const statusMeta: Record<Status, { label: string; icon: typeof Check; active: string }> = {
  PRESENT: { label: "Present", icon: Check, active: "bg-success-500 text-white border-success-500" },
  ABSENT: { label: "Absent", icon: X, active: "bg-danger-500 text-white border-danger-500" },
  LATE: { label: "Late", icon: Clock3, active: "bg-warn-500 text-white border-warn-500" },
};

export function AttendanceView({
  batches,
  courses: passedCourses,
  students,
}: {
  batches: Batch[];
  courses?: Course[];
  students: Student[];
}) {
  const courses = useMemo(() => {
    if (passedCourses && passedCourses.length > 0) return passedCourses;
    const map = new Map<string, { id: string; name: string }>();
    batches.forEach((b) => {
      if (b.course) {
        const id = b.course.id || b.course.name;
        map.set(id, { id, name: b.course.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [batches, passedCourses]);

  const [courseId, setCourseId] = useState(() => batches[0]?.course?.id || batches[0]?.course?.name || "");
  const [batchId, setBatchId] = useState(() => batches[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course?.id === courseId || b.course?.name === courseId);
  }, [batches, courseId]);

  const batchStudents = useMemo(() => students.filter((s) => s.batchId === batchId), [students, batchId]);

  useEffect(() => {
    if (!batchId || !date) return;
    setLoading(true);
    setSaved(false);
    fetch(`/api/attendance?batchId=${batchId}&date=${date}`)
      .then((r) => r.json())
      .then((records: { studentId: string; status: Status }[]) => {
        const map: Record<string, Status> = {};
        for (const r of records) map[r.studentId] = r.status;
        setMarks(map);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, date, students.length]);

  const presentCount = Object.values(marks).filter((s) => s === "PRESENT").length;
  const pct = batchStudents.length > 0 ? Math.round((presentCount / batchStudents.length) * 100) : 0;

  const setStatus = (studentId: string, status: Status) => {
    setMarks((m) => ({ ...m, [studentId]: status }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          date,
          records: batchStudents
            .filter((s) => marks[s.id] !== undefined)
            .map((s) => ({ studentId: s.id, status: marks[s.id] })),
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Course Selector */}
          <select
            value={courseId}
            onChange={(e) => {
              const newCourse = e.target.value;
              setCourseId(newCourse);
              const matching = batches.filter(
                (b) => b.course?.id === newCourse || b.course?.name === newCourse
              );
              setBatchId(matching[0]?.id || "");
            }}
            className="rounded-xl border border-scholar-200 bg-paper px-3 py-2.5 text-sm text-scholar-700 outline-none sm:flex-1 font-medium cursor-pointer"
          >
            {courses.length === 0 ? (
              <option value="">No courses available</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>

          {/* Batch Selector */}
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            disabled={availableBatches.length === 0}
            className="rounded-xl border border-scholar-200 bg-paper px-3 py-2.5 text-sm text-scholar-700 outline-none sm:flex-1 font-medium cursor-pointer disabled:opacity-50"
          >
            {availableBatches.length === 0 ? (
              <option value="" disabled>
                No batches in this course
              </option>
            ) : (
              availableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.timing ? `(${b.timing})` : ""}
                </option>
              ))
            )}
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-paper px-3 py-2.5">
            <CalendarDays size={16} className="text-scholar-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm outline-none font-medium text-scholar-800"
            />
          </div>
        </div>

        <div className="space-y-2">
          {loading && <p className="py-6 text-center text-sm text-scholar-400">Loading students…</p>}
          {!loading && batchStudents.length === 0 && (
            <p className="py-6 text-center text-sm text-scholar-400">No students assigned to this batch yet.</p>
          )}
          {!loading &&
            batchStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-scholar-50 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-scholar-50 text-xs font-semibold text-scholar-600">
                    {initials(s.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    <p className="text-xs text-scholar-400">{s.mobile}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(Object.keys(statusMeta) as Status[]).map((st) => {
                    const meta = statusMeta[st];
                    const Icon = meta.icon;
                    const active = marks[s.id] === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setStatus(s.id, st)}
                        className={cn(
                          "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          active ? meta.active : "border-scholar-100 text-scholar-400 hover:border-scholar-300"
                        )}
                      >
                        <Icon size={13} /> {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {batchStudents.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? "Saving..." : saved ? "Saved ✓" : "Save attendance"}
          </button>
        )}
      </Card>

      <Card className="flex flex-col items-center justify-center gap-3 p-5">
        <p className="self-start font-display text-base font-semibold text-ink">Attendance %</p>
        <ProgressRing value={pct} size={140} stroke={12} color="#1E3A5F" />
        <p className="text-center text-sm text-scholar-400">
          {presentCount} of {batchStudents.length} students present
        </p>
      </Card>
    </div>
  );
}
