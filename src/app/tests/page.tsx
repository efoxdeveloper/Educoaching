import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { TestsView } from "@/components/tests/TestsView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function TestsPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const [courses, batches, rawTests] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { instituteId },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.test.findMany({
      where: { instituteId },
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
    }),
  ]);

  const initialTests = rawTests.map((t) => {
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
      testDate: t.testDate.toISOString(),
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
      seriesName: t.seriesName,
      negativeMarks: t.negativeMarks,
      marksPerQuestion: t.marksPerQuestion,
      createdAt: t.createdAt.toISOString(),
    };
  });

  return (
    <Shell title="Tests & Results" userName={session?.user?.name ?? undefined}>
      <TestsView courses={courses} batches={batches} initialTests={initialTests} />
    </Shell>
  );
}
