import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminBranchesTable } from "@/components/admin/AdminBranchesTable";

export default async function AdminBranchesPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") redirect("/login");

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
      institute: {
        select: {
          id: true,
          name: true,
          ownerName: true,
          email: true,
          mobile: true,
          address: true,
          city: true,
          state: true,
          status: true,
          billingCycle: true,
          platformSubscriptionStatus: true,
          createdAt: true,
          _count: {
            select: {
              branches: true,
              students: true,
              faculty: true,
              batches: true,
            },
          },
        },
      },
      _count: {
        select: { students: true, batches: true, faculty: true },
      },
    },
  });

  const serialized = branches.map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
    state: b.state,
    address: b.address,
    contact: b.contact,
    guidePhone: b.guidePhone,
    isMainBranch: Boolean(b.isMainBranch),
    status: b.status as "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL",
    createdAt: b.createdAt.toISOString(),
    users: b.users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    institute: {
      ...b.institute,
      createdAt: b.institute.createdAt ? b.institute.createdAt.toISOString() : undefined,
    },
    _count: b._count,
  }));

  return (
    <AdminShell title="Sub-Branch Access Requests" userName={session?.user?.name ?? undefined}>
      <div className="mb-6">
        <p className="text-sm text-scholar-400">
          Review, approve, and manage sub-branch access requests submitted by coaching institutes.
        </p>
      </div>

      <AdminBranchesTable initialBranches={serialized} />
    </AdminShell>
  );
}
