import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { CoursesTable } from "@/components/courses/CoursesTable";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function CoursesPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const [courses, branches] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      include: {
        branches: { select: { id: true, name: true, city: true } },
        _count: { select: { batches: true, students: true, subjects: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { instituteId, status: "ACTIVE" },
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = courses.map((c) => ({
    id: c.id,
    name: c.name,
    fee: c.fee.toString(),
    feeType: c.feeType,
    description: c.description,
    duration: c.duration,
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
    targetExam: c.targetExam,
    eligibility: c.eligibility,
    isAllBranches: c.isAllBranches,
    branches: c.branches,
    createdAt: c.createdAt.toISOString(),
    _count: c._count,
  }));

  return (
    <Shell title="Courses & Programs" userName={session?.user?.name ?? undefined}>
      <CoursesTable courses={serialized} availableBranches={branches} />
    </Shell>
  );
}