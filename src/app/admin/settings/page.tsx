import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminAccountSettingsClient } from "@/components/admin/AdminAccountSettingsClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminSettingsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") redirect("/login");

  const userId = (session.user as { id?: string })?.id;
  const sessionEmail = session.user?.email || "";

  let dbUser: { email: string; name: string } | null = null;
  if (userId) {
    dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  }
  if (!dbUser && sessionEmail) {
    dbUser = await prisma.user.findUnique({ where: { email: sessionEmail.toLowerCase().trim() }, select: { email: true, name: true } });
  }

  const currentEmail = dbUser?.email || sessionEmail || "unknown";
  const adminName = dbUser?.name || session.user?.name || "Platform Admin";

  return (
    <AdminShell title="Account Settings" userName={adminName}>
      <div className="mb-6">
        <p className="text-sm text-scholar-400">Manage your platform administrator account — change your login email with secure verification.</p>
      </div>
      <AdminAccountSettingsClient currentEmail={currentEmail} adminName={adminName} />
    </AdminShell>
  );
}
