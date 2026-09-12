import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState } from "@/lib/tenant";
import { parseInstituteSettings, DEFAULT_FEATURE_FLAGS } from "@/lib/institute-settings";
import { Shell } from "@/components/layout/Shell";
import { TitleProvider } from "@/components/layout/TitleContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const instituteId = await getInstituteId();
  const userName = (session?.user as { name?: string } | undefined)?.name;

  let initialFeatures = DEFAULT_FEATURE_FLAGS;
  let initialPermissions: string[] = (session?.user as { permissions?: string[] } | undefined)?.permissions ?? [];
  let initialBranches: Array<{ id: string; name: string; isMainBranch?: boolean; city?: string | null }> = [];
  let initialImpersonation: { isImpersonating: boolean; branchId: string | null } | null = null;

  if (instituteId) {
    try {
      const [institute, branches, branchState] = await Promise.all([
        prisma.institute.findUnique({ where: { id: instituteId }, select: { settings: true } }),
        prisma.branch.findMany({
          where: { instituteId },
          select: { id: true, name: true, isMainBranch: true, city: true },
          orderBy: { name: "asc" },
        }),
        getBranchImpersonationState(),
      ]);

      if (institute) {
        const parsed = parseInstituteSettings(institute.settings);
        initialFeatures = parsed.featureFlags;
      }

      // If session permissions empty and user is faculty/staff, fetch from faculty record (mirrors requireInstitute)
      if ((!initialPermissions || initialPermissions.length === 0) && instituteId && session?.user) {
        const role = String((session.user as { role?: string }).role || "").toUpperCase();
        if (role !== "OWNER" && role !== "ADMIN" && role !== "PLATFORM_ADMIN") {
          try {
            const faculty = await prisma.faculty.findFirst({
              where: {
                instituteId,
                OR: [
                  ...((session.user as { id?: string }).id ? [{ userId: (session.user as { id?: string }).id! }] : []),
                  ...((session.user as { email?: string | null }).email
                    ? [{ email: { equals: (session.user as { email?: string | null }).email!, mode: "insensitive" as const } }]
                    : []),
                ],
              },
              select: { permissions: true },
            });
            if (faculty?.permissions) initialPermissions = faculty.permissions;
          } catch {}
        }
      }

      initialBranches = branches;
      initialImpersonation = { isImpersonating: branchState.isImpersonating, branchId: branchState.branchId };
    } catch {
      // fallback to defaults; Sidebar/Topbar will client-fetch
    }
  }

  return (
    <TitleProvider>
      <Shell
        userName={userName ?? undefined}
        initialFeatures={initialFeatures}
        initialPermissions={initialPermissions}
        initialBranches={initialBranches}
        initialImpersonation={initialImpersonation}
      >
        {children}
      </Shell>
    </TitleProvider>
  );
}
