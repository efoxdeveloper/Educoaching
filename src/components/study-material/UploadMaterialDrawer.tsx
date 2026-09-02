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
  // "" means "All Batches", otherwise an array of selected batchIds
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [allBatches, setAllBatches] = useState(true); // "All Batches" toggle

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
      if (allBatches || batchIds.length === 0) {
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
      setAllBatches(true);
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
              setAllBatches(true);
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

        {/* Batch targeting section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-scholar-700">
              Target Batches
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allBatches}
                onChange={(e) => {
                  setAllBatches(e.target.checked);
                  if (e.target.checked) setBatchIds([]);
                }}
                className="rounded"
              />
              <span className="text-xs text-scholar-600">All batches in this course</span>
            </label>
          </div>

          {!allBatches && courseId && (
            <>
              <select
                multiple
                value={batchIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                  setBatchIds(selected);
                }}
                className={inputClass}
                style={{ minHeight: "90px" }}
              >
                {availableBatches.length === 0 ? (
                  <option value="" disabled>No batches in this course</option>
                ) : (
                  availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.course?.name})
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-scholar-500">
                Hold <kbd className="rounded border border-scholar-200 bg-scholar-100 px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd> (or <kbd className="rounded border border-scholar-200 bg-scholar-100 px-1 py-0.5 font-mono text-[10px]">⌘</kbd> on Mac) to select multiple batches.
                {batchIds.length > 0 && (
                  <span className="ml-1 font-semibold text-scholar-700">
                    {batchIds.length} batch{batchIds.length > 1 ? "es" : ""} selected — material will be uploaded separately for each.
                  </span>
                )}
              </p>
            </>
          )}

          {!allBatches && !courseId && (
            <p className="text-xs text-scholar-500 italic">Select a course first to pick specific batches.</p>
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
