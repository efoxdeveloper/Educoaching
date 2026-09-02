import { redirect } from "next/navigation";
import { Building2, ShieldCheck, Clock3, Ban } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { KpiCard } from "@/components/ui/Card";
import { InstitutesTable } from "@/components/admin/InstitutesTable";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") redirect("/login");

  const institutes = await prisma.institute.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      ownerName: true,
      email: true,
      mobile: true,
      status: true,
      billingCycle: true,
      platformSubscriptionStatus: true,
      currentPeriodAmount: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      createdAt: true,
      address: true,
      city: true,
      state: true,
      academicYearLabel: true,
      guidePhone: true,
      settings: true,
      emailVerified: true,
      mobileVerified: true,
      branches: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          address: true,
          contact: true,
          guidePhone: true,
          isMainBranch: true,
          status: true,
        },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
      files: {
        where: { category: "INSTITUTE_LOGO" },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
      _count: { select: { students: true, batches: true, faculty: true, branches: true } },
    },
  });

  const totalInstitutes = institutes.length;
  const activeCount = institutes.filter((i) => i.status === "ACTIVE").length;
  const pendingCount = institutes.filter((i) => i.status === "PENDING_APPROVAL").length;
  const trialCount = institutes.filter((i) => i.platformSubscriptionStatus === "TRIAL").length;
  const suspendedCount = institutes.filter((i) => i.status === "SUSPENDED").length;
  const mrr = institutes
    .filter((i) => i.platformSubscriptionStatus === "ACTIVE" && i.currentPeriodAmount)
    .reduce((sum, i) => sum + Number(i.currentPeriodAmount), 0);

  const serialized = institutes.map((i) => ({
    ...i,
    currentPeriodAmount: i.currentPeriodAmount ? i.currentPeriodAmount.toString() : null,
    trialEndsAt: i.trialEndsAt.toISOString(),
    currentPeriodEnd: i.currentPeriodEnd ? i.currentPeriodEnd.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
    users: i.users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  }));

  const pendingBranchCount = await prisma.branch.count({
    where: { status: "PENDING_APPROVAL" },
  });

  return (
    <AdminShell title="Platform Overview" userName={session?.user?.name ?? undefined}>
      <div className="mb-6">
        <p className="text-sm text-scholar-400">
          Every institute on the platform, at a glance — subscriptions, usage, and account status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Institutes" value={totalInstitutes.toLocaleString("en-IN")} icon={Building2} accent="scholar" />
        <KpiCard label="Pending Approval" value={pendingCount.toLocaleString("en-IN")} icon={Clock3} accent="marigold" />
        <KpiCard label="Active Accounts" value={activeCount.toLocaleString("en-IN")} icon={ShieldCheck} accent="scholar" />
        <KpiCard label="On Trial" value={trialCount.toLocaleString("en-IN")} icon={Clock3} accent="scholar" />
        <KpiCard label="Suspended" value={suspendedCount.toLocaleString("en-IN")} icon={Ban} accent="scholar" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Est. Monthly Recurring Revenue"
          value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(mrr)}
          icon={Building2}
          accent="marigold"
        />
        <KpiCard
          label="Pending Sub-Branch Requests"
          value={pendingBranchCount.toLocaleString("en-IN")}
          icon={Clock3}
          accent={pendingBranchCount > 0 ? "marigold" : "scholar"}
        />
      </div>

      <div className="mt-6">
        <InstitutesTable institutes={serialized} />
      </div>
    </AdminShell>
  );
}