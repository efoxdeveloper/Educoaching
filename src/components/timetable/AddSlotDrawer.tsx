"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";

type Batch = { id: string; name: string; timing?: string; course?: { id?: string; name: string } };
type Course = { id: string; name: string };
type Faculty = { id: string; name: string };
type Slot = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  batch: { id: string; name?: string; course?: { id?: string; name: string } };
  faculty: { id: string; name?: string } | null;
};

const DAY_OPTIONS = [
  { key: "MON", label: "Monday" },
  { key: "TUE", label: "Tuesday" },
  { key: "WED", label: "Wednesday" },
  { key: "THU", label: "Thursday" },
  { key: "FRI", label: "Friday" },
  { key: "SAT", label: "Saturday" },
  { key: "SUN", label: "Sunday" },
];

export function AddSlotDrawer({
  open,
  onClose,
  batches,
  courses: passedCourses,
  faculty,
  defaultDay,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  batches: Batch[];
  courses?: Course[];
  faculty: Faculty[];
  defaultDay: string;
  editing: Slot | null;
}) {
  const router = useRouter();

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

  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course?.id === courseId || b.course?.name === courseId);
  }, [batches, courseId]);

  const [form, setForm] = useState({
    batchId: batches[0]?.id || "",
    facultyId: "",
    daysOfWeek: [defaultDay],
    startTime: "07:00",
    endTime: "08:00",
    room: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      const editBatch = batches.find((b) => b.id === editing.batch.id);
      const editCourse = editBatch?.course?.id || editBatch?.course?.name || courses[0]?.id || "";
      setCourseId(editCourse);
      setForm({
        batchId: editing.batch.id,
        facultyId: editing.faculty?.id ?? "",
        daysOfWeek: [editing.dayOfWeek],
        startTime: editing.startTime,
        endTime: editing.endTime,
        room: editing.room ?? "",
      });
    } else if (open && courses.length > 0) {
      const activeCourse = courseId && courses.some((c) => c.id === courseId)
        ? courseId
        : courses[0]?.id || "";
      setCourseId(activeCourse);
      const matching = batches.filter((b) => b.course?.id === activeCourse || b.course?.name === activeCourse);
      const firstBatch = matching[0];
      setForm((f) => ({
        ...f,
        daysOfWeek: [defaultDay],
        batchId: firstBatch?.id || "",
      }));
    }
  }, [editing, defaultDay, batches, open, courses, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.batchId) {
      setError("Please select a target batch");
      return;
    }

    if (form.daysOfWeek.length === 0) {
      setError("Please select at least one day");
      return;
    }

    setLoading(true);
    try {
      if (editing) {
        const res = await fetch(`/api/timetable/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId: form.batchId,
            facultyId: form.facultyId,
            dayOfWeek: form.daysOfWeek[0],
            startTime: form.startTime,
            endTime: form.endTime,
            room: form.room,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Could not save class");
        }
      } else {
        const res = await fetch("/api/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId: form.batchId,
            facultyId: form.facultyId,
            daysOfWeek: form.daysOfWeek,
            startTime: form.startTime,
            endTime: form.endTime,
            room: form.room,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Could not save class");
        }
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save class");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (key: string) => {
    if (editing) {
      setForm((f) => ({ ...f, daysOfWeek: [key] }));
      return;
    }
    setForm((f) => {
      const exists = f.daysOfWeek.includes(key);
      if (exists) {
        return { ...f, daysOfWeek: f.daysOfWeek.filter((d) => d !== key) };
      } else {
        return { ...f, daysOfWeek: [...f.daysOfWeek, key] };
      }
    });
  };

  const setPreset = (days: string[]) => {
    setForm((f) => ({ ...f, daysOfWeek: days }));
  };

  return (
    <Drawer open={open} onClose={onClose} title={editing ? "Edit Class Slot" : "Add Class Slot"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-xl bg-danger-50 px-3 py-2.5 text-sm text-danger-600">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Course Program *">
            <select
              required
              className={inputClass}
              value={courseId}
              onChange={(e) => {
                const newCourse = e.target.value;
                setCourseId(newCourse);
                const matching = batches.filter(
                  (b) => b.course?.id === newCourse || b.course?.name === newCourse
                );
                setForm((f) => ({ ...f, batchId: matching[0]?.id || "" }));
              }}
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
          </Field>

          <Field label="Target Batch *">
            <select
              required
              className={inputClass}
              value={form.batchId}
              onChange={(e) => setForm({ ...form, batchId: e.target.value })}
              disabled={availableBatches.length === 0}
            >
              {availableBatches.length === 0 ? (
                <option value="" disabled>No batches in this course</option>
              ) : (
                availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.timing ? `(${b.timing})` : ""}
                  </option>
                ))
              )}
            </select>
          </Field>
        </div>

        <Field label="Faculty (optional)">
          <select className={inputClass} value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
            <option value="">Unassigned</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </Field>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-scholar-500">
              {editing ? "Day of Week" : "Days of Week (Multi-Select)"}
            </label>
            {!editing && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreset(["MON", "TUE", "WED", "THU", "FRI", "SAT"])}
                  className="rounded-md bg-scholar-50 px-2 py-0.5 font-medium text-scholar-700 hover:bg-scholar-100 transition-colors"
                >
                  Mon-Sat
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(["MON", "TUE", "WED", "THU", "FRI"])}
                  className="rounded-md bg-scholar-50 px-2 py-0.5 font-medium text-scholar-700 hover:bg-scholar-100 transition-colors"
                >
                  Mon-Fri
                </button>
                <button
                  type="button"
                  onClick={() => setPreset(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])}
                  className="rounded-md bg-scholar-50 px-2 py-0.5 font-medium text-scholar-700 hover:bg-scholar-100 transition-colors"
                >
                  All
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAY_OPTIONS.map((d) => {
              const selected = form.daysOfWeek.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={`flex flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold transition-colors ${
                    selected
                      ? "bg-scholar-600 text-white shadow-xs"
                      : "bg-paper border border-scholar-100 text-scholar-600 hover:border-scholar-300"
                  }`}
                >
                  <span>{d.label.slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
          {!editing && form.daysOfWeek.length > 1 && (
            <p className="mt-1.5 text-xs text-emerald-600 font-medium">
              ✓ Will schedule this batch for {form.daysOfWeek.length} days at the specified time
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input required type="time" className={inputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </Field>
          <Field label="End time">
            <input required type="time" className={inputClass} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </Field>
        </div>

        <Field label="Room (optional)">
          <input className={inputClass} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 204" />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-sm font-semibold text-scholar-600">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-60">
            {loading
              ? "Saving..."
              : editing
              ? "Save changes"
              : form.daysOfWeek.length > 1
              ? `Add Class (${form.daysOfWeek.length} Days)`
              : "Add class"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}