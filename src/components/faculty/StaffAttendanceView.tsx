"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  X,
  Clock3,
  Coffee,
  Save,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Search,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { initials } from "@/lib/utils";
import type { BranchOption, FacultyRow } from "./FacultyTable";

type StaffStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";

const statusMeta: Record<
  StaffStatus,
  { label: string; icon: typeof Check; active: string; border: string; bg: string }
> = {
  PRESENT: {
    label: "Present",
    icon: Check,
    active: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
    border: "border-emerald-200",
    bg: "bg-emerald-50 text-emerald-800",
  },
  HALF_DAY: {
    label: "Half Day",
    icon: Clock3,
    active: "bg-amber-600 text-white border-amber-600 shadow-xs",
    border: "border-amber-200",
    bg: "bg-amber-50 text-amber-800",
  },
  ON_LEAVE: {
    label: "On Leave",
    icon: Coffee,
    active: "bg-blue-600 text-white border-blue-600 shadow-xs",
    border: "border-blue-200",
    bg: "bg-blue-50 text-blue-800",
  },
  ABSENT: {
    label: "Absent",
    icon: X,
    active: "bg-rose-600 text-white border-rose-600 shadow-xs",
    border: "border-rose-200",
    bg: "bg-rose-50 text-rose-800",
  },
};

export function StaffAttendanceView({
  faculty,
  branches = [],
}: {
  faculty: FacultyRow[];
  branches?: BranchOption[];
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const [marks, setMarks] = useState<Record<string, StaffStatus | null>>({});
  const [checkIns, setCheckIns] = useState<Record<string, string>>({});
  const [checkOuts, setCheckOuts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load attendance records when date changes
  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setSaved(false);
    setValidationError(null);

    fetch(`/api/faculty/attendance?date=${date}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(
        (
          records: Array<{
            facultyId: string;
            status: StaffStatus;
            checkIn: string | null;
            checkOut: string | null;
            notes: string | null;
          }>
        ) => {
          const statusMap: Record<string, StaffStatus | null> = {};
          const inMap: Record<string, string> = {};
          const outMap: Record<string, string> = {};
          const notesMap: Record<string, string> = {};

          // Do NOT default to PRESENT — leave unmarked as null until explicitly chosen
          // Only apply saved records; staff without a record remain unmarked
          for (const r of records) {
            statusMap[r.facultyId] = r.status;
            if (r.checkIn) inMap[r.facultyId] = r.checkIn;
            if (r.checkOut) outMap[r.facultyId] = r.checkOut;
            if (r.notes) notesMap[r.facultyId] = r.notes;
          }

          setMarks(statusMap);
          setCheckIns(inMap);
          setCheckOuts(outMap);
          setNotes(notesMap);
        }
      )
      .catch((err) => {
        console.error("Error loading staff attendance:", err);
      })
      .finally(() => setLoading(false));
  }, [date, faculty]);

  const filteredFaculty = useMemo(() => {
    return faculty.filter((f) => {
      const q = query.toLowerCase().trim();
      const matchesQuery =
        q === "" ||
        f.name.toLowerCase().includes(q) ||
        (f.subject ?? "").toLowerCase().includes(q) ||
        (f.designation ?? "").toLowerCase().includes(q);

      const matchesDept = deptFilter === "ALL" || (f.department || "ACADEMIC") === deptFilter;

      const matchesBranch =
        branchFilter === "ALL" ||
        f.isAllBranches ||
        (branchFilter === "MAIN" && !f.branch && (!f.branches || f.branches.length === 0)) ||
        f.branch?.id === branchFilter ||
        (f.branches && f.branches.some((br) => br.id === branchFilter));

      return matchesQuery && matchesDept && matchesBranch;
    });
  }, [faculty, query, deptFilter, branchFilter]);

  const stats = useMemo(() => {
    const list = filteredFaculty;
    const total = list.length;
    let present = 0;
    let halfDay = 0;
    let onLeave = 0;
    let absent = 0;
    let unmarked = 0;

    for (const f of list) {
      const s = marks[f.id];
      if (!s) unmarked++;
      else if (s === "PRESENT") present++;
      else if (s === "HALF_DAY") halfDay++;
      else if (s === "ON_LEAVE") onLeave++;
      else if (s === "ABSENT") absent++;
    }

    const effectivePresent = present + halfDay * 0.5;
    const pct = total > 0 ? Math.round((effectivePresent / total) * 100) : 0;
    return { total, present, halfDay, onLeave, absent, unmarked, pct };
  }, [filteredFaculty, marks]);

  const setStatus = (facultyId: string, status: StaffStatus) => {
    setMarks((prev) => ({ ...prev, [facultyId]: status }));
    setSaved(false);
    setValidationError(null);
  };

  const markAll = (status: StaffStatus) => {
    const next: Record<string, StaffStatus | null> = { ...marks };
    for (const f of filteredFaculty) {
      next[f.id] = status;
    }
    setMarks(next);
    setSaved(false);
    setValidationError(null);
  };

  const handleDateShift = (deltaDays: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + deltaDays);
    setDate(d.toISOString().slice(0, 10));
  };

  const handleSave = async () => {
    const unmarked = filteredFaculty.filter((f) => !marks[f.id]);
    if (unmarked.length > 0) {
      const names = unmarked.map((f) => f.name).join(", ");
      setValidationError(`Please mark attendance for all staff before saving. ${unmarked.length} remaining: ${names}`);
      return;
    }
    setValidationError(null);
    setSaving(true);
    try {
      const records = filteredFaculty.map((f) => ({
        facultyId: f.id,
        status: marks[f.id] as StaffStatus,
        checkIn: checkIns[f.id] || null,
        checkOut: checkOuts[f.id] || null,
        notes: notes[f.id] || null,
      }));

      const res = await fetch("/api/faculty/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error) {
          setValidationError(data.error);
          throw new Error(data.error);
        }
        throw new Error();
      }
      setSaved(true);
    } catch (err: any) {
      const msg = err?.message || "Failed to save staff attendance. Please try again.";
      // If it's a validation error from backend, it's already set above; otherwise show inline if it contains our message
      if (msg.includes("Please mark attendance")) {
        setValidationError(msg);
      } else if (msg !== "Failed to fetch" && !msg.includes("Please mark attendance")) {
        // Only alert for non-validation errors and avoid duplicate alert when validationError already set
        const isValidation = msg.toLowerCase().includes("remaining");
        if (!isValidation) alert(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Navigator */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-scholar-900">Daily Staff &amp; Faculty Attendance</h2>
            <p className="text-xs text-scholar-500 mt-0.5">
              Record daily check-in, check-out, and attendance status for institute personnel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDateShift(-1)}
              className="rounded-xl border border-scholar-200 bg-white p-2 text-scholar-600 hover:bg-scholar-50 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2">
              <CalendarDays size={16} className="text-scholar-500" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs font-semibold text-scholar-800 outline-none bg-transparent"
              />
            </div>

            <button
              type="button"
              onClick={() => handleDateShift(1)}
              className="rounded-xl border border-scholar-200 bg-white p-2 text-scholar-600 hover:bg-scholar-50 transition-colors"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => setDate(new Date().toISOString().slice(0, 10))}
              className="rounded-xl border border-scholar-200 bg-scholar-50 px-3 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-100"
            >
              Today
            </button>
          </div>
        </div>

        {/* Attendance Summary Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-6 border-t border-scholar-100 pt-5">
          <div className="flex items-center gap-3">
            <ProgressRing value={stats.pct} size={50} stroke={5} color="#059669" />
            <div>
              <span className="text-xs text-scholar-400 font-medium">Turnout Rate</span>
              <p className="text-base font-bold text-scholar-900">{stats.pct}%</p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="text-[11px] font-semibold text-emerald-700">Present</span>
            <p className="text-lg font-bold text-emerald-900">{stats.present}</p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <span className="text-[11px] font-semibold text-amber-700">Half Day</span>
            <p className="text-lg font-bold text-amber-900">{stats.halfDay}</p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <span className="text-[11px] font-semibold text-blue-700">On Leave</span>
            <p className="text-lg font-bold text-blue-900">{stats.onLeave}</p>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
            <span className="text-[11px] font-semibold text-rose-700">Absent</span>
            <p className="text-lg font-bold text-rose-900">{stats.absent}</p>
          </div>

          <div className={`rounded-xl border p-3 ${stats.unmarked > 0 ? "border-amber-300 bg-amber-50" : "border-scholar-100 bg-scholar-50/50"}`}>
            <span className={`text-[11px] font-semibold ${stats.unmarked > 0 ? "text-amber-700" : "text-scholar-500"}`}>Not Marked</span>
            <p className={`text-lg font-bold ${stats.unmarked > 0 ? "text-amber-900" : "text-scholar-700"}`}>{stats.unmarked}</p>
          </div>
        </div>
        {stats.unmarked > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {stats.unmarked} staff not yet marked — please mark all before saving.
          </div>
        )}
      </Card>

      {/* Toolbar & Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2 sm:max-w-xs sm:flex-1">
              <Search size={15} className="text-scholar-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs outline-none placeholder:text-scholar-400"
              />
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-paper px-3 py-2 text-xs font-semibold text-scholar-700 outline-none"
            >
              <option value="ALL">All Departments</option>
              <option value="ACADEMIC">Teaching Faculty</option>
              <option value="ADMINISTRATION">Admissions &amp; Office</option>
              <option value="TECHNICAL">CBT / IT Tech</option>
              <option value="OPERATIONS_SUPPORT">Operations &amp; Support</option>
            </select>

            {/* Branch Filter */}
            {branches.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-scholar-400" />
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="rounded-xl border border-scholar-100 bg-paper px-3 py-2 text-xs font-semibold text-scholar-700 outline-none"
                >
                  <option value="ALL">All Branches</option>
                  <option value="MAIN">Main Branch / Unallocated</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Mark & Save Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-scholar-400 font-medium mr-1">Quick Mark:</span>
            <button
              type="button"
              onClick={() => markAll("PRESENT")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => markAll("ON_LEAVE")}
              className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
            >
              All Leave
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-xs ml-2 ${
                saved ? "bg-emerald-600" : "bg-scholar-600 hover:bg-scholar-700"
              }`}
            >
              {saved ? <CheckCheck size={16} /> : <Save size={15} />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Attendance"}
            </button>
          </div>
        </div>
        {validationError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </Card>

      {/* Attendance Roster Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-scholar-100 text-xs font-medium text-scholar-400">
                <th className="pb-3 pl-2">Staff Member</th>
                <th className="pb-3">Department &amp; Role</th>
                <th className="pb-3">Branch</th>
                <th className="pb-3 text-center">Attendance Status</th>
                <th className="pb-3 text-center">Check-In</th>
                <th className="pb-3 text-center">Check-Out</th>
                <th className="pb-3">Remarks / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-50">
              {filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-scholar-400">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredFaculty.map((f) => {
                  const currentStatus = marks[f.id] as StaffStatus | undefined;
                  const isUnmarked = !currentStatus;
                  const branchName = f.isAllBranches
                    ? "All Branches"
                    : f.branches && f.branches.length > 0
                    ? f.branches.map((b) => b.name).join(", ")
                    : f.branch?.name || "Main Branch";

                  return (
                    <tr
                      key={f.id}
                      className={`transition-colors hover:bg-scholar-50/40 ${isUnmarked ? "bg-amber-50/40" : ""}`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-scholar-100 text-scholar-700 text-xs font-bold shadow-xs">
                            {initials(f.name)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-scholar-900">{f.name}</p>
                            <p className="text-[11px] text-scholar-500">{f.mobile || f.email || "—"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="py-3">
                        <div className="space-y-0.5">
                          <span className="rounded bg-scholar-50 px-2 py-0.5 text-[10px] font-semibold text-scholar-700 border border-scholar-200">
                            {f.department || "ACADEMIC"}
                          </span>
                          <p className="text-[11px] font-medium text-scholar-600">
                            {f.roleType || "Faculty"}
                          </p>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3 text-xs text-scholar-600 max-w-[150px] truncate">
                        {branchName}
                      </td>

                      {/* Status Toggle Buttons */}
                      <td className="py-3 text-center">
                        <div
                          className={`inline-flex rounded-xl border p-0.5 gap-0.5 shadow-xs ${
                            isUnmarked ? "border-amber-300 bg-amber-50/50" : "border-scholar-200 bg-paper"
                          }`}
                        >
                          {(["PRESENT", "HALF_DAY", "ON_LEAVE", "ABSENT"] as StaffStatus[]).map((s) => {
                            const meta = statusMeta[s];
                            const isActive = currentStatus === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setStatus(f.id, s)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                  isActive ? meta.active : "text-scholar-600 hover:bg-scholar-100/70"
                                }`}
                              >
                                {meta.label}
                              </button>
                            );
                          })}
                        </div>
                        {isUnmarked && (
                          <div className="mt-1 text-[10px] font-bold text-amber-600">Not Marked</div>
                        )}
                      </td>

                      {/* Check-In */}
                      <td className="py-3 text-center">
                        <input
                          type="time"
                          value={checkIns[f.id] || ""}
                          onChange={(e) => {
                            setCheckIns((p) => ({ ...p, [f.id]: e.target.value }));
                            setSaved(false);
                          }}
                          className="rounded-lg border border-scholar-200 px-2 py-1 text-xs font-semibold text-scholar-800 outline-none focus:border-scholar-500"
                        />
                      </td>

                      {/* Check-Out */}
                      <td className="py-3 text-center">
                        <input
                          type="time"
                          value={checkOuts[f.id] || ""}
                          onChange={(e) => {
                            setCheckOuts((p) => ({ ...p, [f.id]: e.target.value }));
                            setSaved(false);
                          }}
                          className="rounded-lg border border-scholar-200 px-2 py-1 text-xs font-semibold text-scholar-800 outline-none focus:border-scholar-500"
                        />
                      </td>

                      {/* Remarks */}
                      <td className="py-3">
                        <input
                          type="text"
                          placeholder="Add note..."
                          value={notes[f.id] || ""}
                          onChange={(e) => {
                            setNotes((p) => ({ ...p, [f.id]: e.target.value }));
                            setSaved(false);
                          }}
                          className="w-full max-w-[160px] rounded-lg border border-scholar-200 px-2 py-1 text-xs outline-none focus:border-scholar-500 placeholder:text-scholar-300"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
