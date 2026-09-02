"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  ExternalLink,
  Users,
  User,
  Radio,
  Trash2,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CreateLiveClassDrawer } from "./CreateLiveClassDrawer";
import { formatDate } from "@/lib/utils";

type Course = { id: string; name: string };

export type LiveClassItem = {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  reminderSent: boolean;
  batchId: string | null;
  batchName?: string;
  courseName?: string;
  totalStudents?: number;
  facultyId: string | null;
  facultyName?: string;
  createdAt: string;
};

export function LiveClassesView({
  liveClasses,
  batches,
  courses: passedCourses,
  facultyList,
}: {
  liveClasses: LiveClassItem[];
  batches: { id: string; name: string; course?: { id: string; name: string } }[];
  courses?: Course[];
  facultyList: { id: string; name: string; subject?: string | null }[];
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const availableFilterBatches = useMemo(() => {
    if (!courseFilter) return batches;
    return batches.filter((b) => b.course?.id === courseFilter);
  }, [batches, courseFilter]);

  const handleUpdateStatus = async (id: string, status: "LIVE" | "ENDED" | "CANCELLED") => {
    setBusyId(id);
    try {
      await fetch(`/api/live-classes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this live class schedule?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/live-classes/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const filtered = liveClasses.filter((c) => {
    const matchesQuery =
      query === "" ||
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      (c.subject && c.subject.toLowerCase().includes(query.toLowerCase())) ||
      (c.facultyName && c.facultyName.toLowerCase().includes(query.toLowerCase()));

    const matchesStatus = !statusFilter || c.status === statusFilter;

    if (courseFilter) {
      const b = batches.find((batch) => batch.id === c.batchId);
      if (b && b.course?.id !== courseFilter) return false;
    }

    const matchesBatch = !batchFilter || c.batchId === batchFilter;
    return matchesQuery && matchesStatus && matchesBatch;
  });

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs w-full sm:max-w-xs shadow-2xs">
            <Search size={14} className="text-scholar-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by topic, subject, faculty..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-scholar-400 font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-scholar-700 font-medium shadow-2xs outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="LIVE">Live Now</option>
            <option value="ENDED">Ended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setBatchFilter("");
            }}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-scholar-700 font-medium shadow-2xs outline-none cursor-pointer"
          >
            <option value="">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-scholar-700 font-medium shadow-2xs outline-none cursor-pointer"
          >
            <option value="">All Batches</option>
            {availableFilterBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-scholar-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-scholar-700 transition-colors cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Schedule Live Class</span>
        </button>
      </div>

      {/* Grid of Live Classes */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-xs text-scholar-400 space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-scholar-50 text-scholar-400">
            <Video size={24} />
          </div>
          <p className="font-semibold text-scholar-600 text-sm">No live classes scheduled</p>
          <p>Schedule interactive lectures with Zoom, Google Meet, or MS Teams links for your students.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const classDate = new Date(item.scheduledAt);
            const isLive = item.status === "LIVE";
            const isEnded = item.status === "ENDED";

            return (
              <Card
                key={item.id}
                className={`p-5 flex flex-col justify-between transition-all ${
                  isLive ? "border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/10" : ""
                }`}
              >
                <div className="space-y-3">
                  {/* Top Status & Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        isLive
                          ? "bg-rose-500 text-white animate-pulse"
                          : item.status === "SCHEDULED"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : isEnded
                          ? "bg-scholar-100 text-scholar-600"
                          : "bg-danger-50 text-danger-700"
                      }`}
                    >
                      {isLive && <Radio size={12} />}
                      {isLive
                        ? "LIVE NOW"
                        : item.status === "SCHEDULED"
                        ? "UPCOMING"
                        : item.status}
                    </span>

                    <span className="text-[11px] text-scholar-400 font-medium">
                      {item.durationMinutes} mins
                    </span>
                  </div>

                  {/* Class Title & Subject */}
                  <div>
                    {item.subject && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">
                        {item.subject}
                      </span>
                    )}
                    <h4 className="font-display font-bold text-sm text-ink line-clamp-2 mt-0.5">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-scholar-500 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Schedule Details */}
                  <div className="rounded-xl bg-scholar-50/70 p-3 text-xs space-y-1.5 border border-scholar-100">
                    <div className="flex items-center gap-1.5 text-scholar-700 font-medium">
                      <Calendar size={13} className="text-scholar-400" />
                      <span>{formatDate(classDate)}</span>
                      <span className="text-scholar-400">&bull;</span>
                      <Clock size={13} className="text-scholar-400" />
                      <span>
                        {classDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-scholar-600 text-[11px]">
                      <Users size={13} className="text-scholar-400" />
                      <span>{item.batchName || "All Batches"}</span>
                      {item.totalStudents !== undefined && (
                        <span>({item.totalStudents} students)</span>
                      )}
                    </div>

                    {item.facultyName && (
                      <div className="flex items-center gap-1.5 text-scholar-600 text-[11px]">
                        <User size={13} className="text-scholar-400" />
                        <span>Faculty: <strong>{item.facultyName}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-scholar-100 flex flex-col gap-2">
                  <a
                    href={item.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-scholar-600 py-2 text-xs font-bold text-white shadow-2xs hover:bg-scholar-700 transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>Join Class Room</span>
                  </a>

                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {item.status === "SCHEDULED" && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleUpdateStatus(item.id, "LIVE")}
                          className="px-2 py-1 rounded-lg border border-scholar-200 bg-white text-[11px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Go Live
                        </button>
                      )}
                      {(item.status === "SCHEDULED" || item.status === "LIVE") && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleUpdateStatus(item.id, "ENDED")}
                          className="px-2 py-1 rounded-lg border border-scholar-200 bg-white text-[11px] font-semibold text-scholar-700 hover:bg-scholar-50 cursor-pointer"
                        >
                          End
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-scholar-400 hover:text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer"
                      title="Delete class"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateLiveClassDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        batches={batches}
        courses={courses}
        facultyList={facultyList}
      />
    </div>
  );
}
