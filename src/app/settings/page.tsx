import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { auth } from "@/lib/auth";
import { getInstituteId } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canManage = hasPermission(role, "institute:manage");

  return (
    <Shell title="Institute Setup" userName={session?.user?.name ?? undefined}>
      <div className="mb-6">
        <p className="text-sm text-scholar-400">
          Your institute&apos;s profile, campus details, and branding.
          {!canManage && " Only Owners and Admins can make changes here."}
        </p>
      </div>
      <SettingsForm canManage={canManage} />
    </Shell>
  );
}