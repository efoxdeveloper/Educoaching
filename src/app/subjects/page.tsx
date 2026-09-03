import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { SubjectsTable } from "@/components/subjects/SubjectsTable";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranchImpersonationState } from "@/lib/tenant";

export default async function SubjectsPage() {
  const session = await auth();
  const { branchId: activeBranchId, branch } = await getBranchImpersonationState();
  const instituteId = (session?.user as any)?.instituteId as string | null;
  if (!instituteId || !activeBranchId) redirect("/login");

  const rawRole = (session?.user as { role?: string } | undefined)?.role || "OWNER";
  const userRole = String(rawRole).toUpperCase();
  const canEdit = userRole === "OWNER" || userRole === "ADMIN";

  const [subjects, courses] = await Promise.all([
    prisma.subject.findMany({
      where: { branchId: activeBranchId, course: { instituteId } },
      include: { course: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const serialized = subjects.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <Shell title="Subjects" userName={session?.user?.name ?? undefined}>
      <SubjectsTable subjects={serialized} courses={courses} canEdit={canEdit} />
    </Shell>
  );
}