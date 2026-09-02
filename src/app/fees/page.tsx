import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { FeesView } from "@/components/fees/FeesView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function FeesPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const role = String((session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN" && role !== "ACCOUNTANT") {
    redirect("/dashboard");
  }

  const students = await prisma.student.findMany({
    where: { instituteId },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = students.map((s) => ({
    id: s.id,
    name: s.name,
    totalFee: s.totalFee.toString(),
    paidFee: s.paidFee.toString(),
    dueDate: s.dueDate ? s.dueDate.toISOString() : null,
    course: { name: s.course.name },
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
      <FeesView students={serialized} />
    </Shell>
  );
}