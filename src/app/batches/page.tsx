import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { BatchesView } from "@/components/batches/BatchesView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState, getSubBranches } from "@/lib/tenant";

export default async function BatchesPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const { branchId: activeBranchId } = await getBranchImpersonationState();
  if (!activeBranchId) redirect("/login");

  const rawRole = (session?.user as { role?: string } | undefined)?.role || "OWNER";
  const userRole = String(rawRole).toUpperCase();
  const userEmail = session?.user?.email;
  const canEdit = userRole === "OWNER" || userRole === "ADMIN";

  let facultyBranchIds: string[] = [];
  let isFacultyAllBranches = false;
  let allocatedBatchIds: string[] = [];

  if (userRole === "FACULTY" && userEmail) {
    const fac = await prisma.faculty.findFirst({
      where: { instituteId, email: userEmail },
      include: {
        branches: { select: { id: true } },
        batches: { select: { batchId: true } },
      },
    });
    if (fac) {
      isFacultyAllBranches = fac.isAllBranches;
      facultyBranchIds = fac.branches.map((b) => b.id);
      if (fac.branchId) facultyBranchIds.push(fac.branchId);
      allocatedBatchIds = fac.batches.map((b) => b.batchId);
    }
  }

  // Strict branch isolation: every view is scoped to activeBranchId
  const batchWhere: any = { instituteId, branchId: activeBranchId };
  if (userRole === "FACULTY" && !isFacultyAllBranches) {
    batchWhere.AND = [
      { OR: [{ id: { in: allocatedBatchIds } }, { faculty: { some: { faculty: { email: userEmail } } } }] },
      { branchId: activeBranchId },
    ];
    delete batchWhere.branchId;
  }

  const [batches, courses, allSubBranches] = await Promise.all([
    prisma.batch.findMany({
      where: batchWhere,
      include: {
        course: true,
        branch: true,
        branches: true,
        students: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({ where: { instituteId }, orderBy: { name: "asc" } }),
    getSubBranches(instituteId),
  ]);

  const branches =
    userRole === "FACULTY" && !isFacultyAllBranches && facultyBranchIds.length > 0
      ? allSubBranches.filter((b) => facultyBranchIds.includes(b.id))
      : allSubBranches;


  const serializedBatches = batches.map((b) => ({
    ...b,
    startDate: b.startDate ? b.startDate.toISOString() : null,
    endDate: b.endDate ? b.endDate.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <Shell title="Batch Management" userName={session?.user?.name ?? undefined}>
      <BatchesView
        batches={serializedBatches}
        courses={courses}
        branches={branches}
        canEdit={canEdit}
        userRole={userRole}
      />
    </Shell>
  );
}