"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Video, Loader2 } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";

type Batch = { id: string; name: string; course?: { id: string; name: string } };
type Course = { id: string; name: string };
type Faculty = { id: string; name: string; subject?: string | null };

export function CreateLiveClassDrawer({
  open,
  onClose,
  batches,
  courses: passedCourses,
  facultyList,
}: {
  open: boolean;
  onClose: () => void;
  batches: Batch[];
  courses?: Course[];
  facultyList: Faculty[];
}) {
  const router = useRouter();

  const courses = useMemo(() => {
    if (passedCourses && passedCourses.length > 0) return passedCourses;
    const map = new Map<string, { id: string; name: string }>();
    batches.forEach((b) => {
      if (b.course?.id) {
        map.set(b.course.id, b.course);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [batches, passedCourses]);

  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [facultyId, setFacultyId] = useState(facultyList[0]?.id || "");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course?.id === courseId);
  }, [batches, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Please provide a title for the live class.");
      return;
    }
    if (!scheduledAt) {
      setError("Please set the date and time for the class.");
      return;
    }
    if (!meetingLink.trim() || (!meetingLink.startsWith("http://") && !meetingLink.startsWith("https://"))) {
      setError("Please provide a valid Zoom, Google Meet, or MS Teams link starting with https://");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/live-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          batchId: batchId || undefined,
          facultyId: facultyId || undefined,
          subject: subject.trim() || undefined,
          description: description.trim() || undefined,
          scheduledAt,
          durationMinutes: Number(durationMinutes) || 60,
          meetingLink: meetingLink.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule live class.");
      }

      router.refresh();
      onClose();
      setTitle("");
      setSubject("");
      setDescription("");
      setScheduledAt("");
      setMeetingLink("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule live class.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Schedule Live Class / Webinar">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-danger-50 border border-danger-200 p-3 text-xs text-danger-700">
            {error}
          </div>
        )}

        <Field label="Class / Topic Title">
          <input
            required
            className={inputClass}
            placeholder="e.g. Thermodynamics - Live Numerical Problem Solving"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Course Program">
            <select
              className={inputClass}
              value={courseId}
              onChange={(e) => {
                const newCourse = e.target.value;
                setCourseId(newCourse);
                if (newCourse) {
                  const matching = batches.filter((b) => b.course?.id === newCourse);
                  if (!matching.some((b) => b.id === batchId)) {
                    setBatchId("");
                  }
                } else {
                  setBatchId("");
                }
              }}
            >
              <option value="">All Courses (General / Institute-wide)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target Batch">
            <select
              className={inputClass}
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              disabled={!courseId || availableBatches.length === 0}
            >
              {!courseId ? (
                <option value="">All Batches (Institute-wide)</option>
              ) : availableBatches.length === 0 ? (
                <option value="" disabled>
                  No batches in this course
                </option>
              ) : (
                <>
                  <option value="">All Batches in this Course</option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Faculty / Teacher">
            <select className={inputClass} value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
              <option value="">Select Faculty</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.subject ? `(${f.subject})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Subject">
            <input
              className={inputClass}
              placeholder="e.g. Physics, Organic Chemistry"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Date & Time (Class Start) *">
            <input
              required
              type="datetime-local"
              className={inputClass}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </Field>

          <Field label="Duration (Minutes)">
            <input
              type="number"
              min={15}
              max={360}
              step={15}
              className={inputClass}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Live Meeting Link (Zoom / Google Meet / Teams)">
          <div className="relative">
            <input
              required
              type="url"
              className={inputClass}
              placeholder="https://meet.google.com/... or https://zoom.us/j/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-scholar-400 mt-1">
            Enrolled students will receive a join reminder 15 minutes before the start time.
          </p>
        </Field>

        <Field label="Notes / Agenda (Optional)">
          <textarea
            rows={2}
            className={inputClass}
            placeholder="e.g. Please bring NCERT Chapter 4 notes and previous year questions"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-200 py-2.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-xs font-bold text-white hover:bg-scholar-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
            <span>{loading ? "Scheduling..." : "Schedule Class"}</span>
          </button>
        </div>
      </form>
    </Drawer>
  );
}
