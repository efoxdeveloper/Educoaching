import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { auth } from "@/lib/auth";
import { getInstituteId } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";
import { PlansView } from "@/components/plans/PlansView";

export default async function PlansPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canManage = hasPermission(role, "billing:manage") || hasPermission(role, "institute:manage");

  return (
    <Shell title="My Plans & Subscription" userName={session?.user?.name ?? undefined}>
      <PlansView canManage={canManage} />
    </Shell>
  );
}
