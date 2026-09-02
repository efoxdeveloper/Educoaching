"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, UserRound, MapPin, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { AddSlotDrawer } from "./AddSlotDrawer";

type Slot = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  batch: { id: string; name: string; timing?: string; course: { id?: string; name: string } };
  faculty: { id: string; name: string } | null;
};

type Batch = { id: string; name: string; timing?: string; course?: { id?: string; name: string } };
type Course = { id: string; name: string };
type Faculty = { id: string; name: string };

const DAYS: { key: string; label: string }[] = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function TimetableView({
  slots,
  batches,
  courses: passedCourses,
  faculty,
  canManage,
}: {
  slots: Slot[];
  batches: Batch[];
  courses?: Course[];
  faculty: Faculty[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [activeDay, setActiveDay] = useState("MON");
  const [selectedCourseId, setSelectedCourseId] = useState("ALL");
  const [selectedBatchId, setSelectedBatchId] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [error, setError] = useState("");

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

  const availableFilterBatches = useMemo(() => {
    if (selectedCourseId === "ALL") return batches;
    return batches.filter(
      (b) => b.course?.id === selectedCourseId || b.course?.name === selectedCourseId
    );
  }, [batches, selectedCourseId]);

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of slots) counts[s.dayOfWeek] = (counts[s.dayOfWeek] ?? 0) + 1;
    return counts;
  }, [slots]);

  const daySlots = useMemo(() => {
    return slots
      .filter((s) => {
        if (s.dayOfWeek !== activeDay) return false;
        if (selectedCourseId !== "ALL") {
          const b = batches.find((batch) => batch.id === s.batch.id);
          if (
            b &&
            b.course?.id !== selectedCourseId &&
            b.course?.name !== selectedCourseId &&
            s.batch.course?.id !== selectedCourseId &&
            s.batch.course?.name !== selectedCourseId
          ) {
            return false;
          }
        }
        if (selectedBatchId !== "ALL" && s.batch.id !== selectedBatchId) return false;
        return true;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [slots, activeDay, selectedCourseId, selectedBatchId, batches]);

  const handleDelete = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/timetable/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete slot");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete slot");
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Course Selector */}
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSelectedBatchId("ALL");
            }}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-semibold text-scholar-700 outline-none shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Batch Selector */}
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-semibold text-scholar-700 outline-none shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Batches</option>
            {availableFilterBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs font-medium text-scholar-500">{slots.length} total classes this week</p>
          {canManage && (
            <button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700 shadow-xs transition-colors"
            >
              <Plus size={15} /> Add Class Slot
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-xl bg-scholar-50 p-1.5">
        {DAYS.map((d) => (
          <button
            key={d.key}
            onClick={() => setActiveDay(d.key)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeDay === d.key ? "bg-white text-ink shadow-sm" : "text-scholar-500 hover:text-ink"
            )}
          >
            {d.label}
            {dayCounts[d.key] ? <span className="ml-1.5 text-xs text-scholar-400">({dayCounts[d.key]})</span> : null}
          </button>
        ))}
      </div>

      {daySlots.length === 0 ? (
        <Card className="p-10 text-center text-sm text-scholar-400">
          No classes scheduled for {DAYS.find((d) => d.key === activeDay)?.label} matching filters.
        </Card>
      ) : (
        <div className="space-y-3">
          {daySlots.map((s) => (
            <Card key={s.id} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-semibold text-ink">{s.batch.name}</p>
                  <span className="text-xs text-scholar-400">· {s.batch.course.name}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-scholar-500">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-scholar-300" /> {formatTime(s.startTime)} - {formatTime(s.endTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UserRound size={13} className="text-scholar-300" /> {s.faculty?.name ?? "Faculty unassigned"}
                  </span>
                  {s.room && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-scholar-300" /> {s.room}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setOpen(true);
                    }}
                    className="rounded-lg p-2 text-scholar-400 hover:bg-scholar-50 hover:text-ink"
                    aria-label="Edit slot"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="rounded-lg p-2 text-scholar-400 hover:bg-danger-50 hover:text-danger-600"
                    aria-label="Delete slot"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <AddSlotDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        batches={batches}
        courses={courses}
        faculty={faculty}
        defaultDay={activeDay}
        editing={editing}
      />
    </>
  );
}