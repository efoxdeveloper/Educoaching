"use client";

import { useState, useMemo } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { Upload, Loader2, Link as LinkIcon, FileText, Video } from "lucide-react";

type Batch = {
  id: string;
  name: string;
  course: { id: string; name: string };
};

type Course = {
  id: string;
  name: string;
};

export function UploadMaterialDrawer({
  open,
  onClose,
  batches,
  courses,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  batches: Batch[];
  courses: Course[];
  onUploaded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [batchIds, setBatchIds] = useState<string[]>([]);

  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course?.id === courseId);
  }, [batches, courseId]);

  const [fileType, setFileType] = useState("PDF");
  const [fileUrl, setFileUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !fileUrl.trim()) {
      setError("Please fill in Title, Subject, and File/Resource URL.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (batchIds.length === 0) {
        // Upload once with no specific batch (global to course/all)
        const res = await fetch("/api/study-materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            subject: subject.trim(),
            topic: topic.trim() || null,
            courseId: courseId || null,
            batchId: null,
            fileType,
            fileUrl: fileUrl.trim(),
            description: description.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to upload study material");
        }
      } else {
        // Upload one record per selected batch
        await Promise.all(
          batchIds.map(async (bid) => {
            const res = await fetch("/api/study-materials", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: title.trim(),
                subject: subject.trim(),
                topic: topic.trim() || null,
                courseId: courseId || null,
                batchId: bid,
                fileType,
                fileUrl: fileUrl.trim(),
                description: description.trim() || null,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || "Failed to upload study material");
            }
          })
        );
      }

      // Reset
      setTitle("");
      setTopic("");
      setFileUrl("");
      setDescription("");
      setBatchIds([]);
      onUploaded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving study material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Upload Study Material / Video Lecture">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <Field label="Document / Lecture Title *">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 4 - Electrostatics Formula Sheet & DPP"
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
              placeholder="e.g. Physics, Chemistry"
              className={inputClass}
            />
          </Field>

          <Field label="Topic / Chapter">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Current Electricity"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Course Program">
          <select
            value={courseId}
            onChange={(e) => {
              const newCourse = e.target.value;
              setCourseId(newCourse);
              setBatchIds([]);
            }}
            className={inputClass}
          >
            <option value="">All Courses (Global Program)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-2 rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-ink">
              Target Batches ({batchIds.length === 0 ? "All" : `${batchIds.length} of ${availableBatches.length}`} selected)
            </label>
            {availableBatches.length > 0 && batchIds.length > 0 && batchIds.length < availableBatches.length && (
              <button
                type="button"
                onClick={() => setBatchIds(availableBatches.map((b) => b.id))}
                className="text-[11px] font-semibold text-scholar-700 hover:text-scholar-900 underline cursor-pointer"
              >
                {`Select All (${availableBatches.length})`}
              </button>
            )}
            {batchIds.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchIds([])}
                className="text-[11px] font-semibold text-scholar-500 hover:text-scholar-700 underline cursor-pointer ml-2"
              >
                Clear (All Batches)
              </button>
            )}
          </div>

          {!courseId ? (
            <p className="text-xs text-scholar-400 py-1">Select a course above to target specific batches, or leave as-is to publish globally.</p>
          ) : availableBatches.length === 0 ? (
            <p className="text-xs text-scholar-400 py-1">No batches found under this course program.</p>
          ) : (
            <>
              <p className="text-[11px] text-scholar-500 pb-1">
                No selection = visible to all batches in this course. Check specific batches to restrict access.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            </>
          )}
        </div>

        <Field label="Content Format">
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "PDF", label: "PDF Notes", icon: FileText },
              { id: "VIDEO", label: "Video Link", icon: Video },
              { id: "DOCUMENT", label: "Doc / PPT", icon: FileText },
              { id: "LINK", label: "Web Link", icon: LinkIcon },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFileType(f.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold gap-1 transition-all ${
                  fileType === f.id
                    ? "border-scholar-600 bg-scholar-50 text-scholar-800 shadow-xs"
                    : "border-scholar-200 bg-white text-scholar-500 hover:border-scholar-400"
                }`}
              >
                <f.icon size={16} />
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="File / Resource URL *">
          <input
            type="url"
            required
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://drive.google.com/... or https://youtube.com/watch?v=..."
            className={inputClass}
          />
        </Field>

        <Field label="Description & Learning Objectives">
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key concepts covered, prerequisite reading..."
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
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload Material
          </button>
        </div>
      </form>
    </Drawer>
  );
}
