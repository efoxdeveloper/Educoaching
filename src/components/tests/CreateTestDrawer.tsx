"use client";

import { useState, useMemo, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";

type Batch = {
  id: string;
  name: string;
  course: { id?: string; name: string };
};

type Course = {
  id: string;
  name: string;
};

export function CreateTestDrawer({
  open,
  onClose,
  batches,
  courses: passedCourses,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  batches: Batch[];
  courses?: Course[];
  onSuccess: () => void;
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
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(() => {
    const firstCourse = batches[0]?.course?.id || batches[0]?.course?.name || "";
    return firstCourse
      ? batches.filter((b) => b.course?.id === firstCourse || b.course?.name === firstCourse).map((b) => b.id)
      : batches.map((b) => b.id);
  });

  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course?.id === courseId || b.course?.name === courseId);
  }, [batches, courseId]);

  useEffect(() => {
    if (open && courses.length > 0) {
      const activeCourse = courseId && courses.some((c) => c.id === courseId)
        ? courseId
        : courses[0]?.id || "";
      if (activeCourse !== courseId) {
        setCourseId(activeCourse);
      }
      const matching = batches.filter((b) => b.course?.id === activeCourse || b.course?.name === activeCourse);
      if (selectedBatchIds.length === 0 || !selectedBatchIds.some((id) => matching.some((b) => b.id === id))) {
        setSelectedBatchIds(matching.map((b) => b.id));
      }
    }
  }, [open, courses, batches, courseId, selectedBatchIds]);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [passingMarks, setPassingMarks] = useState("35");
  const [description, setDescription] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [negativeMarks, setNegativeMarks] = useState("1");
  const [seriesName, setSeriesName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto calculate duration in minutes when start and end time are chosen
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart && endTime && endTime > newStart) {
      const [sh, sm] = newStart.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) setDurationMinutes(String(diff));
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd && newEnd > startTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = newEnd.split(":").map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) setDurationMinutes(String(diff));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatchIds.length === 0 || !title.trim() || !testDate || !totalMarks) {
      setError("Please select at least one batch and fill in all required fields.");
      return;
    }

    if (startTime && endTime && startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }

    const marksNum = Number(totalMarks);
    if (isNaN(marksNum) || marksNum <= 0) {
      setError("Total marks must be a positive number.");
      return;
    }

    if (passingMarks) {
      const passNum = Number(passingMarks);
      if (isNaN(passNum) || passNum < 0 || passNum > marksNum) {
        setError("Passing marks must be between 0 and total marks.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchIds: selectedBatchIds,
          title: title.trim(),
          subject: subject.trim() || null,
          testDate,
          startTime: startTime || null,
          endTime: endTime || null,
          totalMarks: marksNum,
          passingMarks: passingMarks ? Number(passingMarks) : null,
          description: description.trim() || null,
          isOnline,
          durationMinutes: Number(durationMinutes) || 60,
          negativeMarks: isOnline ? Number(negativeMarks) || 0 : null,
          seriesName: seriesName.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create test.");
        return;
      }

      // Reset form
      setTitle("");
      setSubject("");
      setStartTime("");
      setEndTime("");
      setTotalMarks("100");
      setPassingMarks("35");
      setDescription("");
      onSuccess();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Create New Test">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-danger-50 p-3 text-xs font-medium text-danger-600">
            {error}
          </div>
        )}

        <Field label="Target Course Program *">
          <select
            value={courseId}
            onChange={(e) => {
              const newCourse = e.target.value;
              setCourseId(newCourse);
              const matching = batches.filter(
                (b) => b.course?.id === newCourse || b.course?.name === newCourse
              );
              setSelectedBatchIds(matching.map((b) => b.id));
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
              Target Batches * ({selectedBatchIds.length} of {availableBatches.length} selected)
            </label>
            {availableBatches.length > 0 && selectedBatchIds.length < availableBatches.length && (
              <button
                type="button"
                onClick={() => setSelectedBatchIds(availableBatches.map((b) => b.id))}
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
                const isChecked = selectedBatchIds.includes(b.id);
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
                          setSelectedBatchIds(selectedBatchIds.filter((id) => id !== b.id));
                        } else {
                          setSelectedBatchIds([...selectedBatchIds, b.id]);
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

        <Field label="Test Title *">
          <input
            type="text"
            placeholder="e.g. Periodic Test 1, Unit Test - Mechanics"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            required
          />
        </Field>

        <Field label="Subject / Topic">
          <input
            type="text"
            placeholder="e.g. Physics, Mathematics, Science"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Test Date *">
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className={inputClass}
            required
          />
        </Field>

        {/* Test Timing Schedule */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>⏰ Test Timing</span>
              <span className="text-[11px] font-normal text-scholar-500">(Optional / Flexible)</span>
            </label>
            {startTime && endTime && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Duration: {Number(durationMinutes) || 60} mins
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time">
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="End Time">
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Quick timing presets e.g. 9 AM - 11 AM, 10 AM - 1 PM */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-medium text-scholar-500">Quick presets:</span>
            {[
              { label: "9:00 AM - 11:00 AM", start: "09:00", end: "11:00" },
              { label: "9:00 AM - 12:00 PM", start: "09:00", end: "12:00" },
              { label: "10:00 AM - 1:00 PM", start: "10:00", end: "13:00" },
              { label: "2:00 PM - 5:00 PM", start: "14:00", end: "17:00" },
            ].map((slot) => (
              <button
                key={slot.label}
                type="button"
                onClick={() => {
                  handleStartTimeChange(slot.start);
                  handleEndTimeChange(slot.end);
                }}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors border ${
                  startTime === slot.start && endTime === slot.end
                    ? "bg-scholar-600 text-white border-scholar-600"
                    : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-100"
                }`}
              >
                {slot.label}
              </button>
            ))}
            {(startTime || endTime) && (
              <button
                type="button"
                onClick={() => {
                  setStartTime("");
                  setEndTime("");
                }}
                className="text-[10px] text-danger-600 hover:underline ml-auto font-medium"
              >
                Clear timing
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Marks *">
            <input
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 100"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label="Passing Marks">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 35"
              value={passingMarks}
              onChange={(e) => setPassingMarks(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Description / Syllabus (Optional)">
          <textarea
            rows={3}
            placeholder="Chapters or topics included in this test..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </Field>

        {/* Online CBT Exam Mode Settings */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
              className="h-4 w-4 rounded text-scholar-600 focus:ring-scholar-500"
            />
            <span className="text-xs font-semibold text-ink">
              Enable Online CBT Test Engine (Timed MCQ, Auto-Score, Negative Marks)
            </span>
          </label>

          {isOnline && (
            <div className="space-y-3 pt-2 border-t border-scholar-200/60">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration (Minutes)">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Negative Penalty per Error">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={negativeMarks}
                    onChange={(e) => setNegativeMarks(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Test Series Grouping (Optional)">
                <input
                  type="text"
                  placeholder="e.g. JEE Mock Series 2026, NEET All-India"
                  value={seriesName}
                  onChange={(e) => setSeriesName(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scholar-700 disabled:opacity-50"
          >
            {loading ? "Creating Test..." : "Create Test"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
