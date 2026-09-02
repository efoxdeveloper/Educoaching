"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";

type Course = { id: string; name: string };

export function AddSubjectDrawer({
  open,
  onClose,
  courses,
}: {
  open: boolean;
  onClose: () => void;
  courses: Course[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    courseId: courses[0]?.id || "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add subject");
      }
      setForm({ courseId: courses[0]?.id || "", name: "" });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add subject. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add subject">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-xl bg-danger-50 px-3 py-2.5 text-sm text-danger-600">{error}</p>}

        <Field label="Course">
          <select
            required
            className={inputClass}
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subject name">
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Physics"
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-sm font-semibold text-scholar-600">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-60">
            {loading ? "Adding..." : "Add subject"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}