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
  const [batchIds, setBatchIds] = useState<string[]>([]);

  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course?.id === courseId);
  }, [batches, courseId]);

  // Initialize batch selection when drawer opens
  useEffect(() => {
    if (open) {
      // default to first batch of selected course if available
      const defaultBatches = availableBatches.map((b) => b.id);
      setBatchIds(defaultBatches.length > 0 ? [defaultBatches[0]] : []);
    }
  }, [open, availableBatches]);

  // Update batchIds when course changes
  useEffect(() => {
    if (courseId) {
      const matching = batches.filter((b) => b.course?.id === courseId);
      setBatchIds(matching.length > 0 ? [matching[0].id] : []);
    }
  }, [courseId, batches]);

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
    if (!title.trim() || !subject.trim() || batchIds.length === 0 || !dueDate) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create assignment for each selected batch
      await Promise.all(
        batchIds.map(async (bid) => {
          const res = await fetch("/api/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              subject: subject.trim(),
              batchId: bid,
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
        })
      );

      // Reset form after successful creation
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

        <Field label="Target Course *">
          <select
            value={courseId}
            onChange={(e) => {
              const newCourse = e.target.value;
              setCourseId(newCourse);
              const matching = batches.filter((b) => b.course.id === newCourse);
              setBatchIds(matching.map((b) => b.id));
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

        <div className="space-y-2 rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-ink">
              Target Batches * ({batchIds.length} of {availableBatches.length} selected)
            </label>
            {availableBatches.length > 0 && batchIds.length < availableBatches.length && (
              <button
                type="button"
                onClick={() => setBatchIds(availableBatches.map((b) => b.id))}
                className="text-[11px] font-semibold text-scholar-700 hover:text-scholar-900 underline cursor-pointer"
              >
                {`Select All (${availableBatches.length})`}
              </button>
            )}
          </div>

          {availableBatches.length === 0 ? (
            <p className="text-xs text-scholar-400 py-1">No batches found under this course program.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {availableBatches.map((b) => {
                const isChecked = batchIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-all ${
                      isChecked
                        ? "border-scholar-500 bg-white text-scholar-900 shadow-2xs font-semibold"
                        : "border-scholar-200 bg-white/70 text-scholar-600 hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setBatchIds(batchIds.filter((id) => id !== b.id));
                        } else {
                          setBatchIds([...batchIds, b.id]);
                        }
                      }}
                      className="h-4 w-4 rounded text-scholar-600 focus:ring-scholar-500"
                    />
                    <span className="truncate">{b.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due Date *">
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Total Marks (optional)">
            <input
              type="number"
              min="0"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Attachment URL (optional)">
          <input
            type="url"
            placeholder="https://..."
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Description (optional)">
          <textarea
            rows={3}
            placeholder="Additional details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
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
