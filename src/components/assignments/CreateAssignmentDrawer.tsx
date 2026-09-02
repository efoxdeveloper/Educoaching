"use client";

import { useState, useMemo, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { CheckCircle2, Loader2 } from "lucide-react";

type Batch = {
  id: string;
  name: string;
  course: { id: string; name: string };
};

type Course = {
  id: string;
  name: string;
};

export function CreateAssignmentDrawer({
  open,
  onClose,
  batches,
  courses: passedCourses,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  batches: Batch[];
  courses?: Course[];
  onCreated: () => void;
}) {
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

  const [courseId, setCourseId] = useState(() => batches[0]?.course?.id || "");
  const [batchId, setBatchId] = useState(() => batches[0]?.id || "");

  useEffect(() => {
    if (open) {
      const activeCourse = (courseId && courses.some((c) => c.id === courseId))
        ? courseId
        : courses[0]?.id || "";
      if (activeCourse !== courseId) {
        setCourseId(activeCourse);
      }

      const matchingBatches = activeCourse ? batches.filter((b) => b.course?.id === activeCourse) : batches;
      if (!batchId || !matchingBatches.some((b) => b.id === batchId)) {
        setBatchId(matchingBatches[0]?.id || "");
      }
    }
  }, [open, courses, batches, courseId, batchId]);

  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course?.id === courseId);
  }, [batches, courseId]);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [type, setType] = useState<"HOMEWORK" | "DPP" | "PROJECT">("DPP");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [totalMarks, setTotalMarks] = useState("50");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !batchId || !dueDate) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          batchId,
          type,
          dueDate,
          totalMarks: Number(totalMarks) || 50,
          attachmentUrl: attachmentUrl.trim() || null,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create assignment");
      }

      // Reset
      setTitle("");
      setAttachmentUrl("");
      setDescription("");
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Create Assignment / DPP">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <Field label="Assignment / DPP Title *">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. DPP-05: Newton's Laws & Friction Problems"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject *">
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics"
              className={inputClass}
            />
          </Field>

          <Field label="Category / Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "HOMEWORK" | "DPP" | "PROJECT")}
              className={inputClass}
            >
              <option value="DPP">Daily Practice Problem (DPP)</option>
              <option value="HOMEWORK">Standard Homework</option>
              <option value="PROJECT">Project / Case Study</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Target Course *">
            <select
              value={courseId}
              onChange={(e) => {
                const newCourse = e.target.value;
                setCourseId(newCourse);
                const matching = batches.filter((b) => b.course.id === newCourse);
                setBatchId(matching[0]?.id || "");
              }}
              className={inputClass}
              required
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
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className={inputClass}
              required
              disabled={availableBatches.length === 0}
            >
              {availableBatches.length === 0 ? (
                <option value="" disabled>
                  No batches in this course
                </option>
              ) : (
                availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))
              )}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Submission Due Date *">
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Maximum Marks">
            <input
              type="number"
              min="1"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Question Sheet / Resource Link (Optional)">
          <input
            type="url"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://drive.google.com/... (PDF link)"
            className={inputClass}
          />
        </Field>

        <Field label="Instructions / Problem Statements">
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Solve questions 1-15 from Chapter 3. Show all working steps clearly..."
            className={inputClass}
          />
        </Field>

        <div className="mt-4 flex gap-2 border-t border-scholar-100 pt-3">
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
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Publish Assignment
          </button>
        </div>
      </form>
    </Drawer>
  );
}
