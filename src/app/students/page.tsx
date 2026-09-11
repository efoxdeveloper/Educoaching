import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { StudentsTable } from "@/components/students/StudentsTable";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState, getSubBranches } from "@/lib/tenant";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: { page?: string; limit?: string; q?: string; courseId?: string; status?: string };
}) {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const { branchId: activeBranchId } = await getBranchImpersonationState();
  if (!activeBranchId) redirect("/login");

  const page = Math.max(1, Number(searchParams?.page) || 1);
  const limit = 20;
  const q = searchParams?.q?.trim() || "";
  const courseIdFilter = searchParams?.courseId || "";
  const statusFilter = searchParams?.status || "";

  const studentWhere: any = { instituteId, branchId: activeBranchId };
  if (q) {
    studentWhere.OR = [
      { name: { contains: q, mode: "insensitive" as const } },
      { mobile: { contains: q } },
    ];
  }
  if (courseIdFilter) studentWhere.courseId = courseIdFilter;
  if (statusFilter) studentWhere.status = statusFilter;

  const skip = (page - 1) * limit;

  const [paginatedStudents, total, courses, batches, branches, statusGroups, courseGroups] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        photoUrl: true,
        parentMobile: true,
        status: true,
        admissionDate: true,
        totalFee: true,
        paidFee: true,
        dueDate: true,
        plan: true,
        courseDuration: true,
        quarterlyAmount: true,
        registrationFee: true,
        isSeatBooked: true,
        discountPercent: true,
        discountApprovalStatus: true,
        branchId: true,
        branch: { select: { id: true, name: true, city: true } },
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true, timing: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.student.count({ where: studentWhere }),
    prisma.course.findMany({ where: { instituteId }, orderBy: { name: "asc" } }),
    prisma.batch.findMany({
      where: { instituteId, branchId: activeBranchId },
      select: {
        id: true,
        name: true,
        courseId: true,
        branchId: true,
        isAllBranches: true,
        timing: true,
        status: true,
        endDate: true,
        branch: { select: { id: true, name: true, city: true } },
        branches: { select: { id: true, name: true, city: true } },
      },
    }),
    getSubBranches(instituteId),
    // Aggregates for charts — computed server-side without fetching all rows
    prisma.student.groupBy({
      by: ["status"],
      where: studentWhere,
      _count: { _all: true },
    }),
    prisma.student.groupBy({
      by: ["courseId"],
      where: studentWhere,
      _count: { _all: true },
    }),
  ]);

  // Prepare aggregates for charts
  const statusCounts: Record<string, number> = {};
  for (const g of statusGroups as any[]) {
    statusCounts[g.status] = g._count._all;
  }
  // Map courseId -> course name for courseGroups
  const courseIdToName: Record<string, string> = {};
  for (const c of courses) courseIdToName[c.id] = c.name;
  const courseCounts = (courseGroups as any[])
    .map((g) => ({ name: courseIdToName[g.courseId] || g.courseId, count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const serialized = paginatedStudents.map((s) => ({
    ...s,
    totalFee: s.totalFee.toString(),
    paidFee: s.paidFee.toString(),
    admissionDate: s.admissionDate.toISOString(),
    dueDate: s.dueDate ? s.dueDate.toISOString() : null,
    quarterlyAmount: s.quarterlyAmount ? s.quarterlyAmount.toString() : null,
    registrationFee: s.registrationFee ? s.registrationFee.toString() : null,
    discountPercent: s.discountPercent ? s.discountPercent.toString() : null,
  }));

  const serializedCourses = courses.map((c) => ({ ...c, fee: c.fee.toString() }));

  const serializedBatches = batches.map((b) => ({
    ...b,
    endDate: b.endDate ? b.endDate.toISOString() : null,
  }));

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Ensure page is within bounds — if out of range, redirect to last page (handled by UI, not redirect loop)
  const safePage = Math.min(page, totalPages);

  return (
    <Shell title="Student Management" userName={session?.user?.name ?? undefined}>
      <StudentsTable
        students={serialized}
        total={total}
        page={safePage}
        totalPages={totalPages}
        limit={limit}
        initialQuery={q}
        initialCourseFilter={courseIdFilter}
        initialStatusFilter={statusFilter}
        statusCounts={statusCounts}
        courseCounts={courseCounts}
        courses={serializedCourses}
        batches={serializedBatches}
        branches={branches}
      />
    </Shell>
  );
}
