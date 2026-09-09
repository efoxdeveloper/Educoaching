import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { ReportsView } from "@/components/reports/ReportsView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState } from "@/lib/tenant";
import { getReportsData } from "@/lib/reports-data";
import { hasPermission } from "@/lib/permissions";

export default async function ReportsPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  const { branchId: activeBranchId } = await getBranchImpersonationState();
  if (!instituteId || !activeBranchId) redirect("/login");

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
  // Reports gated by payments:write (sidebar) — keep consistent
  if (!hasPermission({ role, permissions: perms }, "payments:write")) {
    redirect("/dashboard");
  }

  const initialData = await getReportsData(instituteId, activeBranchId);

  return (
    <Shell title="Reports & Analytics" userName={session?.user?.name ?? undefined}>
      <ReportsView initialData={initialData} />
    </Shell>
  );
}
