import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { StudentsTable } from "@/components/students/StudentsTable";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState, getSubBranches } from "@/lib/tenant";

export default async function StudentsPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const { branchId: activeBranchId } = await getBranchImpersonationState();
  if (!activeBranchId) redirect("/login");

  const studentWhere: any = { instituteId, branchId: activeBranchId };

  const [students, courses, batches, branches] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      include: { course: true, batch: true, branch: true },
      orderBy: { createdAt: "desc" },
    }),
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
  ]);

  const serialized = students.map((s) => ({
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

  return (
    <Shell title="Student Management" userName={session?.user?.name ?? undefined}>
      <StudentsTable students={serialized} courses={serializedCourses} batches={serializedBatches} branches={branches} />
    </Shell>
  );
}