import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  BookOpen,
  ClipboardList,
  FileText,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface FacultyDashboardProps {
  facultyName: string;
  facultyEmail: string;
  batches: Array<{
    id: string;
    name: string;
    timing: string | null;
    courseName: string;
    studentCount: number;
  }>;
  todayClasses: Array<{
    id: string;
    batchName: string;
    subjectName: string;
    startTime: string;
    endTime: string;
    room: string | null;
  }>;
  upcomingTests: Array<{
    id: string;
    title: string;
    batchName: string;
    testDate: string;
    totalMarks: number;
    mode: string;
  }>;
  recentAssignments: Array<{
    id: string;
    title: string;
    subject: string;
    batchName: string;
    dueDate: string;
    type: string;
  }>;
  totalStudents: number;
  todayAttendancePercent: number | null;
}

export function FacultyDashboard({
  facultyName,
  facultyEmail,
  batches,
  todayClasses,
  upcomingTests,
  recentAssignments,
  totalStudents,
  todayAttendancePercent,
}: FacultyDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header bar with academic quick shortcuts */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-scholar-100 px-2 py-0.5 text-[11px] font-semibold text-scholar-700">
              <GraduationCap size={13} />
              Faculty Workspace
            </span>
            <span className="text-xs text-scholar-400 font-medium">Academic Portal</span>
          </div>
          <h2 className="mt-1 font-display text-lg font-bold text-ink">
            Welcome back, {facultyName}
          </h2>
          <p className="text-xs text-scholar-500">
            Teaching overview for {formatDate(new Date())} — your classes, batches & evaluations.
          </p>
        </div>

        {/* Action Shortcuts - Academic Only */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-scholar-700 transition-colors"
          >
            <CheckCircle2 size={13} />
            Mark Attendance
          </Link>
          <Link
            href="/timetable"
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 shadow-sm hover:bg-scholar-50 transition-colors"
          >
            <Calendar size={13} className="text-scholar-500" />
            Timetable
          </Link>
          <Link
            href="/tests"
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 shadow-sm hover:bg-scholar-50 transition-colors"
          >
            <ClipboardList size={13} className="text-scholar-500" />
            Tests & CBT
          </Link>
          <Link
            href="/assignments"
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 shadow-sm hover:bg-scholar-50 transition-colors"
          >
            <FileText size={13} className="text-scholar-500" />
            Assignments & DPP
          </Link>
          <Link
            href="/study-material"
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 shadow-sm hover:bg-scholar-50 transition-colors"
          >
            <BookOpen size={13} className="text-scholar-500" />
            Study Material
          </Link>
        </div>
      </div>

      {/* Row 1: Academic KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="My Assigned Batches"
          value={batches.length.toString()}
          icon={Layers}
          accent="scholar"
        />
        <KpiCard
          label="Enrolled Students"
          value={totalStudents.toLocaleString("en-IN")}
          icon={Users}
          accent="scholar"
        />
        <KpiCard
          label="Today's Classes"
          value={todayClasses.length.toString()}
          icon={Clock}
          accent="marigold"
        />
        <KpiCard
          label="Today's Attendance Rate"
          value={todayAttendancePercent !== null ? `${todayAttendancePercent}%` : "Pending"}
          icon={CheckCircle2}
          accent={todayAttendancePercent !== null && todayAttendancePercent >= 80 ? "scholar" : "marigold"}
        />
      </div>

      {/* Row 2: Today's Schedule & My Batches */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Schedule Card */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-scholar-600" />
              <p className="font-display text-base font-semibold text-ink">
                Today&apos;s Lecture Schedule
              </p>
            </div>
            <Link
              href="/timetable"
              className="text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              Full Timetable &rarr;
            </Link>
          </div>

          {todayClasses.length === 0 ? (
            <div className="py-10 text-center text-xs text-scholar-400">
              <Sparkles size={24} className="mx-auto mb-2 text-scholar-300" />
              No lectures scheduled for you today.
            </div>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between rounded-xl border border-scholar-100 bg-scholar-50/50 p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-scholar-600 text-white font-mono text-xs font-bold shadow-xs">
                      {cls.startTime}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{cls.subjectName}</p>
                      <p className="text-xs text-scholar-500">
                        {cls.batchName} {cls.room ? `• Room: ${cls.room}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-md bg-white border border-scholar-200 px-2 py-1 text-[11px] font-medium text-scholar-700">
                      {cls.startTime} - {cls.endTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My Batches Overview Card */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-scholar-600" />
              <p className="font-display text-base font-semibold text-ink">My Batches</p>
            </div>
            <Link
              href="/batches"
              className="text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              All Batches &rarr;
            </Link>
          </div>

          {batches.length === 0 ? (
            <div className="py-10 text-center text-xs text-scholar-400">
              No batches assigned to your profile yet.
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between border-b border-scholar-50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{b.name}</p>
                    <p className="text-xs text-scholar-400">
                      {b.courseName} {b.timing ? `• ${b.timing}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-scholar-50 px-2.5 py-0.5 text-xs font-medium text-scholar-700">
                      <Users size={12} /> {b.studentCount} students
                    </span>
                    <Link
                      href={`/attendance`}
                      className="rounded-lg bg-scholar-100 hover:bg-scholar-200 px-2.5 py-1 text-[11px] font-semibold text-scholar-800 transition-colors"
                    >
                      Attendance
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Upcoming Tests & Recent Assignments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tests Card */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-scholar-600" />
              <p className="font-display text-base font-semibold text-ink">
                Upcoming Tests & Assessments
              </p>
            </div>
            <Link
              href="/tests"
              className="text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              Manage Tests &rarr;
            </Link>
          </div>

          {upcomingTests.length === 0 ? (
            <div className="py-8 text-center text-xs text-scholar-400">
              No upcoming tests scheduled for your batches.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTests.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border-b border-scholar-50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{t.title}</p>
                    <p className="text-xs text-scholar-400">
                      {t.batchName} • {t.mode} • Max: {t.totalMarks} Marks
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-md bg-marigold-50 border border-marigold-200 px-2 py-0.5 text-[11px] font-semibold text-marigold-800">
                      {formatDate(t.testDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Assignments Card */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-scholar-600" />
              <p className="font-display text-base font-semibold text-ink">
                Recent Homework & DPP
              </p>
            </div>
            <Link
              href="/assignments"
              className="text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              All Assignments &rarr;
            </Link>
          </div>

          {recentAssignments.length === 0 ? (
            <div className="py-8 text-center text-xs text-scholar-400">
              No assignments or DPP shared recently.
            </div>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-scholar-50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="text-xs text-scholar-400">
                      {a.subject} • {a.batchName} ({a.type})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-scholar-500">
                      Due: {formatDate(a.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
