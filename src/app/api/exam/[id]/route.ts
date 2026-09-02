import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const test = await prisma.test.findUnique({
    where: { id: params.id },
    include: {
      institute: { select: { id: true, name: true, city: true } },
      batch: { select: { id: true, name: true, course: { select: { name: true } } } },
      _count: { select: { questions: true } },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Exam not found or link has expired" }, { status: 404 });
  }

  return NextResponse.json({
    id: test.id,
    title: test.title,
    subject: test.subject,
    description: test.description,
    durationMinutes: test.durationMinutes || 60,
    startTime: test.startTime ? test.startTime.toISOString() : null,
    endTime: test.endTime ? test.endTime.toISOString() : null,
    totalMarks: test.totalMarks,
    passingMarks: test.passingMarks,
    negativeMarks: test.negativeMarks !== null ? test.negativeMarks : 1,
    marksPerQuestion: test.marksPerQuestion || 4,
    seriesName: test.seriesName,
    questionCount: test._count.questions,
    batchName: test.batch.name,
    courseName: test.batch.course?.name || "General",
    instituteName: test.institute.name,
    instituteCity: test.institute.city,
  });
}
