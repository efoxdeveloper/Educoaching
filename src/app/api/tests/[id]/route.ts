import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const testId = params.id;

  const test = await prisma.test.findFirst({
    where: { id: testId, instituteId: ctx.instituteId },
    include: {
      batch: {
        include: {
          students: {
            where: { status: "ACTIVE" },
            select: { id: true, name: true, mobile: true },
            orderBy: { name: "asc" },
          },
          course: { select: { id: true, name: true } },
        },
      },
      results: {
        include: {
          student: {
            select: { id: true, name: true, mobile: true },
          },
        },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const passThreshold = test.passingMarks ?? test.totalMarks * 0.35;

  // Map of student results by studentId
  const resultMap = new Map(test.results.map((r) => [r.studentId, r]));

  // Combine all active batch students with their results (if any)
  const studentRows = test.batch.students.map((st) => {
    const res = resultMap.get(st.id);
    return {
      studentId: st.id,
      studentName: st.name,
      mobile: st.mobile,
      resultId: res?.id ?? null,
      marksObtained: res ? res.marksObtained : null,
      isAbsent: res ? res.isAbsent : false,
      hasRecord: Boolean(res),
      remarks: res?.remarks ?? null,
    };
  });

  // Calculate ranks for students who appeared and have marks
  const appearedRows = studentRows.filter(
    (s) => s.hasRecord && !s.isAbsent && s.marksObtained !== null
  );

  // Sort descending by marks
  appearedRows.sort((a, b) => (b.marksObtained ?? 0) - (a.marksObtained ?? 0));

  // Compute competition rank
  const rankMap = new Map<string, number>();
  let currentRank = 1;
  for (let i = 0; i < appearedRows.length; i++) {
    if (i > 0 && appearedRows[i].marksObtained === appearedRows[i - 1].marksObtained) {
      rankMap.set(appearedRows[i].studentId, rankMap.get(appearedRows[i - 1].studentId)!);
    } else {
      currentRank = i + 1;
      rankMap.set(appearedRows[i].studentId, currentRank);
    }
  }

  // Final enriched list of all students
  const enrichedStudents = studentRows.map((s) => {
    const rank = rankMap.get(s.studentId) ?? null;
    const percentage =
      s.marksObtained !== null
        ? Math.round(((s.marksObtained / test.totalMarks) * 100) * 10) / 10
        : null;

    let status: "PASSED" | "FAILED" | "ABSENT" | "UNRECORDED" = "UNRECORDED";
    if (s.hasRecord) {
      if (s.isAbsent) {
        status = "ABSENT";
      } else if (s.marksObtained !== null) {
        status = s.marksObtained >= passThreshold ? "PASSED" : "FAILED";
      }
    }

    return {
      ...s,
      rank,
      percentage,
      status,
    };
  });

  // Overall performance calculations
  const marksList = appearedRows.map((r) => r.marksObtained as number);
  const totalEnrolled = test.batch.students.length;
  const appearedCount = appearedRows.length;
  const absentCount = studentRows.filter((s) => s.hasRecord && s.isAbsent).length;
  const unrecordedCount = studentRows.filter((s) => !s.hasRecord).length;

  const highestScore = marksList.length > 0 ? Math.max(...marksList) : null;
  const lowestScore = marksList.length > 0 ? Math.min(...marksList) : null;
  const sumMarks = marksList.reduce((acc, m) => acc + m, 0);
  const averageScore = marksList.length > 0 ? Math.round((sumMarks / marksList.length) * 10) / 10 : null;
  const averagePercentage =
    averageScore !== null ? Math.round(((averageScore / test.totalMarks) * 100) * 10) / 10 : null;

  const passedStudents = appearedRows.filter((r) => (r.marksObtained ?? 0) >= passThreshold);
  const passPercentage =
    appearedCount > 0 ? Math.round((passedStudents.length / appearedCount) * 100) : 0;

  const topScorer = appearedRows.length > 0 ? appearedRows[0].studentName : null;

  // Score distribution buckets
  const distribution = [
    { range: "90-100%", count: 0 },
    { range: "75-89%", count: 0 },
    { range: "60-74%", count: 0 },
    { range: "40-59%", count: 0 },
    { range: "<40%", count: 0 },
  ];

  for (const mark of marksList) {
    const pct = (mark / test.totalMarks) * 100;
    if (pct >= 90) distribution[0].count++;
    else if (pct >= 75) distribution[1].count++;
    else if (pct >= 60) distribution[2].count++;
    else if (pct >= 40) distribution[3].count++;
    else distribution[4].count++;
  }

  return NextResponse.json({
    test: {
      id: test.id,
      title: test.title,
      subject: test.subject,
      testDate: test.testDate,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      description: test.description,
      batchId: test.batchId,
      batchName: test.batch.name,
      courseName: test.batch.course?.name ?? "General",
      isOnline: test.isOnline,
      durationMinutes: test.durationMinutes,
      startTime: test.startTime ? test.startTime.toISOString() : null,
      endTime: test.endTime ? test.endTime.toISOString() : null,
    },
    analytics: {
      totalEnrolled,
      appearedCount,
      absentCount,
      unrecordedCount,
      passedCount: passedStudents.length,
      failedCount: appearedCount - passedStudents.length,
      passPercentage,
      highestScore,
      lowestScore,
      averageScore,
      averagePercentage,
      topScorer,
      distribution,
    },
    students: enrichedStudents,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const perm = await requirePermission("tests:write");
  if ("error" in perm) return perm.error;

  const testId = params.id;
  const body = await req.json();
  const { title, subject, testDate, totalMarks, passingMarks, description, startTime, endTime, durationMinutes } = body;

  const existing = await prisma.test.findFirst({
    where: { id: testId, instituteId: perm.instituteId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const parsedTotal = totalMarks !== undefined ? Number(totalMarks) : existing.totalMarks;
  const parsedPass =
    passingMarks !== undefined && passingMarks !== null && passingMarks !== ""
      ? Number(passingMarks)
      : null;

  const baseDate = testDate ? new Date(testDate) : existing.testDate;
  const baseDateStr = baseDate.toISOString().slice(0, 10);

  const parseTestTime = (tVal: unknown) => {
    if (tVal === null) return null;
    if (!tVal || typeof tVal !== "string" || !tVal.trim()) return undefined;
    const raw = tVal.trim();
    if (raw.includes("T")) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const timePart = raw.length === 5 ? `${raw}:00` : raw;
    const d = new Date(`${baseDateStr}T${timePart}`);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const nextStartTime = startTime !== undefined ? parseTestTime(startTime) : existing.startTime;
  const nextEndTime = endTime !== undefined ? parseTestTime(endTime) : existing.endTime;

  let calculatedDuration = durationMinutes !== undefined ? Number(durationMinutes) : existing.durationMinutes;
  if (nextStartTime && nextEndTime && nextEndTime > nextStartTime && durationMinutes === undefined) {
    calculatedDuration = Math.round((nextEndTime.getTime() - nextStartTime.getTime()) / 60000);
  }

  const updated = await prisma.test.update({
    where: { id: testId },
    data: {
      title: title ? title.trim() : existing.title,
      subject: subject !== undefined ? (subject ? subject.trim() : null) : existing.subject,
      testDate: baseDate,
      totalMarks: parsedTotal,
      passingMarks: parsedPass,
      description: description !== undefined ? (description ? description.trim() : null) : existing.description,
      ...(startTime !== undefined ? { startTime: nextStartTime ?? null } : {}),
      ...(endTime !== undefined ? { endTime: nextEndTime ?? null } : {}),
      ...(calculatedDuration !== undefined ? { durationMinutes: calculatedDuration } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const perm = await requirePermission("tests:write");
  if ("error" in perm) return perm.error;

  const testId = params.id;
  const existing = await prisma.test.findFirst({
    where: { id: testId, instituteId: perm.instituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  await prisma.test.delete({
    where: { id: testId },
  });

  return NextResponse.json({ success: true, message: "Test deleted successfully" });
}
