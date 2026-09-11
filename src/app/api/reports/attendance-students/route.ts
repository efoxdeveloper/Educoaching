import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
  const ctx = await requirePermission("payments:write");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const q = searchParams.get("q")?.trim() || "";
  const lowAttendanceOnly = searchParams.get("lowAttendanceOnly") === "true";
  const courseId = searchParams.get("courseId") || undefined;
  const batchId = searchParams.get("batchId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const branchId = ctx.branchId as string;
  const instituteId = ctx.instituteId;

  // Build where for Attendance - same as in reports-data.ts
  const attendanceWhere: any = { instituteId, ...(branchId ? { batch: { branchId } } : {}) };
  if (batchId) attendanceWhere.batchId = batchId;
  if (startDate || endDate) {
    attendanceWhere.date = {};
    if (startDate) attendanceWhere.date.gte = startOfDay(new Date(startDate));
    if (endDate) attendanceWhere.date.lte = endOfDay(new Date(endDate));
  }

  try {
    const attendanceRecords = await prisma.attendance.findMany({
      where: attendanceWhere,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            courseId: true,
            course: { select: { name: true } },
            batch: { select: { id: true, name: true } },
          },
        },
        batch: { select: { id: true, name: true, courseId: true } },
      },
      orderBy: { date: "desc" },
    });

    // Filter by courseId if provided (courseId filter is on student.courseId, not batch)
    let filteredAttendance = attendanceRecords;
    if (courseId) {
      filteredAttendance = filteredAttendance.filter((a) => a.student.courseId === courseId);
    }

    // Build studentAttendanceMap (same logic as reports-data.ts)
    const studentAttendanceMap = new Map<
      string,
      {
        studentName: string;
        courseName: string;
        batchName: string;
        total: number;
        present: number;
        absent: number;
        late: number;
      }
    >();

    for (const a of filteredAttendance) {
      const entry = studentAttendanceMap.get(a.studentId) || {
        studentName: a.student.name,
        courseName: a.student.course.name,
        batchName: a.student.batch?.name ?? "Unassigned",
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
      };
      entry.total++;
      if (a.status === "PRESENT") entry.present++;
      else if (a.status === "ABSENT") entry.absent++;
      else if (a.status === "LATE") entry.late++;
      studentAttendanceMap.set(a.studentId, entry);
    }

    let studentSummary = Array.from(studentAttendanceMap.entries()).map(([studentId, s]) => {
      const effectivePresent = s.present + s.late;
      const rate = s.total > 0 ? Math.round((effectivePresent / s.total) * 100) : 0;
      return {
        studentId,
        studentName: s.studentName,
        courseName: s.courseName,
        batchName: s.batchName,
        totalMarked: s.total,
        presentCount: s.present,
        absentCount: s.absent,
        lateCount: s.late,
        attendanceRate: rate,
        isLowAttendance: rate < 75,
      };
    });
    studentSummary.sort((a, b) => a.attendanceRate - b.attendanceRate);

    // Apply q filter (name/course/batch)
    if (q) {
      const lower = q.toLowerCase();
      studentSummary = studentSummary.filter(
        (s) =>
          s.studentName.toLowerCase().includes(lower) ||
          s.courseName.toLowerCase().includes(lower) ||
          s.batchName.toLowerCase().includes(lower)
      );
    }

    // Apply lowAttendanceOnly filter
    if (lowAttendanceOnly) {
      studentSummary = studentSummary.filter((s) => s.isLowAttendance);
    }

    const total = studentSummary.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const paginated = studentSummary.slice(start, start + limit);

    return NextResponse.json({
      students: paginated,
      total,
      page: safePage,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching paginated attendance students:", error);
    return NextResponse.json({ error: "Failed to fetch attendance students" }, { status: 500 });
  }
}
