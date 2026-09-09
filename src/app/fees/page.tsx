import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { FeesView } from "@/components/fees/FeesView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";

export default async function FeesPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  const { branchId } = await getBranchImpersonationState();
  if (!instituteId || !branchId) redirect("/login");

  const user = session?.user as { role?: string; permissions?: string[]; id?: string; email?: string | null } | undefined;
  const role = String(user?.role || "").toUpperCase();
  let perms: string[] = user?.permissions || [];
  if (role !== "OWNER" && role !== "ADMIN" && role !== "PLATFORM_ADMIN" && instituteId) {
    try {
      const faculty = await prisma.faculty.findFirst({
        where: {
          instituteId,
          OR: [
            ...(user?.id ? [{ userId: user.id }] : []),
            ...(user?.email ? [{ email: { equals: user.email, mode: "insensitive" as const } }] : []),
          ],
        },
        select: { permissions: true },
      });
      if (faculty?.permissions) perms = faculty.permissions;
    } catch {}
  }
  if (!hasPermission({ role, permissions: perms }, "payments:write")) {
    redirect("/dashboard");
  }

  const [students, courses, batches] = await Promise.all([
    prisma.student.findMany({
      where: { instituteId, branchId },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { instituteId, branchId },
      select: { id: true, name: true, courseId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = students.map((s) => ({
    id: s.id,
    name: s.name,
    totalFee: s.totalFee.toString(),
    paidFee: s.paidFee.toString(),
    dueDate: s.dueDate ? s.dueDate.toISOString() : null,
    course: { name: s.course.name },
    courseId: s.courseId,
    batchId: s.batchId,
    plan: s.plan,
    subscriptionStatus: s.subscriptionStatus,
    demoExpiresAt: s.demoExpiresAt ? s.demoExpiresAt.toISOString() : null,
    currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
    monthlyAmount: s.monthlyAmount ? s.monthlyAmount.toString() : null,
    quarterlyAmount: s.quarterlyAmount ? s.quarterlyAmount.toString() : null,
    installmentPlan: s.installmentPlan,
  }));

  return (
    <Shell title="Fee & Collection" userName={session?.user?.name ?? undefined}>
      <FeesView students={serialized} courses={courses} batches={batches} />
    </Shell>
  );
}