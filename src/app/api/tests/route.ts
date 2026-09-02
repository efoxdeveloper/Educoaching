import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");

  const whereClause: { instituteId: string; batchId?: string } = {
    instituteId: ctx.instituteId,
  };
  if (batchId) {
    whereClause.batchId = batchId;
  }

  const tests = await prisma.test.findMany({
    where: whereClause,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } },
          _count: { select: { students: true } },
        },
      },
      _count: {
        select: { results: true },
      },
      results: {
        select: {
          marksObtained: true,
          isAbsent: true,
        },
      },
    },
    orderBy: { testDate: "desc" },
  });

  // Augment tests with quick summary metrics
  const enrichedTests = tests.map((t) => {
    const presentResults = t.results.filter((r) => !r.isAbsent && r.marksObtained !== null);
    const marksArr = presentResults.map((r) => r.marksObtained as number);
    const highestScore = marksArr.length > 0 ? Math.max(...marksArr) : null;
    const averageScore =
      marksArr.length > 0 ? marksArr.reduce((a, b) => a + b, 0) / marksArr.length : null;

    const passMarks = t.passingMarks ?? t.totalMarks * 0.35;
    const passedCount = marksArr.filter((m) => m >= passMarks).length;

    return {
      id: t.id,
      title: t.title,
      subject: t.subject,
      testDate: t.testDate,
      totalMarks: t.totalMarks,
      passingMarks: t.passingMarks,
      description: t.description,
      batchId: t.batchId,
      batchName: t.batch.name,
      courseName: t.batch.course?.name ?? "General",
      totalStudents: t.batch._count.students,
      evaluatedCount: t.results.length,
      presentCount: presentResults.length,
      absentCount: t.results.filter((r) => r.isAbsent).length,
      highestScore,
      averageScore: averageScore !== null ? Math.round(averageScore * 10) / 10 : null,
      passedCount,
      passPercentage:
        presentResults.length > 0
          ? Math.round((passedCount / presentResults.length) * 100)
          : null,
      isOnline: t.isOnline,
      durationMinutes: t.durationMinutes,
      startTime: t.startTime ? t.startTime.toISOString() : null,
      endTime: t.endTime ? t.endTime.toISOString() : null,
      status: t.status,
      seriesName: t.seriesName,
      negativeMarks: t.negativeMarks,
      marksPerQuestion: t.marksPerQuestion,
      createdAt: t.createdAt,
    };
  });

  return NextResponse.json(enrichedTests);
}

export async function POST(req: Request) {
  const perm = await requirePermission("tests:write");
  if ("error" in perm) return perm.error;
  const { instituteId } = perm;

  try {
    const body = await req.json();
    const {
      batchId,
      batchIds,
      title,
      subject,
      testDate,
      totalMarks,
      passingMarks,
      description,
      isOnline = false,
      durationMinutes = 60,
      startTime,
      endTime,
      negativeMarks = 1,
      marksPerQuestion = 4,
      status = "DRAFT",
      seriesName,
      questionIds,
    } = body;

    const targetBatchIds: string[] = Array.isArray(batchIds) && batchIds.length > 0
      ? batchIds.filter((id) => typeof id === "string" && id.trim())
      : batchId && typeof batchId === "string" && batchId.trim()
        ? [batchId.trim()]
        : [];

    if (targetBatchIds.length === 0 || !title || !testDate || totalMarks === undefined || totalMarks === null) {
      return NextResponse.json(
        { error: "At least one Batch, Title, Test Date, and Total Marks are required" },
        { status: 400 }
      );
    }

    const parsedTotalMarks = Number(totalMarks);
    if (isNaN(parsedTotalMarks) || parsedTotalMarks <= 0) {
      return NextResponse.json({ error: "Total marks must be a positive number" }, { status: 400 });
    }

    const parsedPassingMarks =
      passingMarks !== undefined && passingMarks !== null && passingMarks !== ""
        ? Number(passingMarks)
        : null;

    if (
      parsedPassingMarks !== null &&
      (isNaN(parsedPassingMarks) || parsedPassingMarks < 0 || parsedPassingMarks > parsedTotalMarks)
    ) {
      return NextResponse.json(
        { error: "Passing marks must be between 0 and total marks" },
        { status: 400 }
      );
    }

    // Verify batches belong to this institute
    const targetBatches = await prisma.batch.findMany({
      where: { id: { in: targetBatchIds }, instituteId },
      include: { course: true },
    });

    if (targetBatches.length === 0) {
      return NextResponse.json({ error: "Selected batches not found" }, { status: 404 });
    }

    // Helper to safely parse time whether sent as "09:00", "09:00:00", or an ISO string
    const parseTestTime = (tVal: unknown, baseDateStr: string) => {
      if (!tVal || typeof tVal !== "string" || !tVal.trim()) return null;
      const raw = tVal.trim();
      if (raw.includes("T")) {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
      }
      const datePart = baseDateStr.slice(0, 10);
      const timePart = raw.length === 5 ? `${raw}:00` : raw;
      const d = new Date(`${datePart}T${timePart}`);
      return isNaN(d.getTime()) ? null : d;
    };

    const parsedStartTime = parseTestTime(startTime, testDate);
    const parsedEndTime = parseTestTime(endTime, testDate);

    // If both start and end time are provided and valid, auto-compute duration if not explicitly provided
    let calculatedDuration = durationMinutes ? Number(durationMinutes) : 60;
    if (parsedStartTime && parsedEndTime && parsedEndTime > parsedStartTime) {
      calculatedDuration = Math.round((parsedEndTime.getTime() - parsedStartTime.getTime()) / 60000);
    }

    const createdTests = await prisma.$transaction(
      targetBatches.map((b) =>
        prisma.test.create({
          data: {
            instituteId,
            batchId: b.id,
            courseId: b.courseId,
            title: title.trim(),
            subject: subject ? subject.trim() : null,
            testDate: new Date(testDate),
            totalMarks: parsedTotalMarks,
            passingMarks: parsedPassingMarks,
            description: description ? description.trim() : null,
            isOnline: Boolean(isOnline),
            durationMinutes: calculatedDuration,
            startTime: parsedStartTime,
            endTime: parsedEndTime,
            negativeMarks: negativeMarks !== undefined ? Number(negativeMarks) : 1,
            marksPerQuestion: marksPerQuestion !== undefined ? Number(marksPerQuestion) : 4,
            status: status || "DRAFT",
            seriesName: seriesName ? seriesName.trim() : null,
            ...(Array.isArray(questionIds) && questionIds.length > 0
              ? {
                  questions: {
                    create: questionIds.map((qId: string, idx: number) => ({
                      questionId: qId,
                      order: idx + 1,
                    })),
                  },
                }
              : {}),
          },
          include: {
            batch: { select: { id: true, name: true } },
            questions: { include: { question: true } },
          },
        })
      )
    );

    return NextResponse.json(createdTests.length === 1 ? createdTests[0] : createdTests, { status: 201 });
  } catch (error) {
    console.error("Error creating test:", error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}
