import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { AssignmentsView } from "@/components/assignments/AssignmentsView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function AssignmentsPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const [courses, batches, rawAssignments] = await Promise.all([
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
    prisma.assignment.findMany({
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
        _count: { select: { submissions: true } },
        submissions: {
          select: { status: true, marksObtained: true },
        },
      },
      orderBy: { dueDate: "desc" },
    }),
  ]);

  const initialAssignments = rawAssignments.map((a) => {
    const evaluatedCount = a.submissions.filter((s) => s.status === "EVALUATED").length;
    return {
      id: a.id,
      title: a.title,
      subject: a.subject,
      type: a.type,
      description: a.description,
      attachmentUrl: a.attachmentUrl,
      dueDate: a.dueDate.toISOString(),
      totalMarks: a.totalMarks || 100,
      batchId: a.batchId,
      batchName: a.batch.name,
      courseName: a.batch.course?.name || "General",
      totalStudents: a.batch._count.students,
      submittedCount: a.submissions.length,
      evaluatedCount,
      createdAt: a.createdAt.toISOString(),
    };
  });

  return (
    <Shell title="Assignments & DPP" userName={session?.user?.name ?? undefined}>
      <AssignmentsView
        courses={courses}
        batches={batches}
        initialAssignments={initialAssignments}
      />
    </Shell>
  );
}
