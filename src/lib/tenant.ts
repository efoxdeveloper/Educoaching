import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";
import { parseInstituteSettings, type FeatureFlags } from "@/lib/institute-settings";

type SessionUser = { instituteId?: string | null; role?: string };

export const IMPERSONATION_COOKIE = "platform_impersonate_institute";

export async function getImpersonationState(): Promise<{
  isImpersonating: boolean;
  instituteId: string | null;
  platformAdmin: boolean;
}> {
  const session = await auth();
  const role = (session?.user as SessionUser | undefined)?.role;
  if (role !== "PLATFORM_ADMIN") {
    return { isImpersonating: false, instituteId: null, platformAdmin: false };
  }

  try {
    const cookieStore = cookies();
    const impersonated = cookieStore.get(IMPERSONATION_COOKIE)?.value || null;
    return {
      isImpersonating: Boolean(impersonated),
      instituteId: impersonated,
      platformAdmin: true,
    };
  } catch {
    return { isImpersonating: false, instituteId: null, platformAdmin: true };
  }
}

export const BRANCH_IMPERSONATION_COOKIE = "main_impersonate_branch";

function isMainBranchRecord(b: { id?: string; name?: string | null; isMainBranch?: boolean | null } | null): boolean {
  if (!b) return false;
  if (b.isMainBranch === true) return true;
  if (b.name && b.name.toLowerCase().includes("main")) return true;
  return false;
}

export async function getBranchImpersonationState(): Promise<{
  isImpersonating: boolean;
  branchId: string | null;
  branch: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    contact: string | null;
    guidePhone: string | null;
    isMainBranch: boolean;
  } | null;
}> {
  const session = await auth();
  const user = session?.user as (SessionUser & { isMainBranch?: boolean; branchId?: string | null }) | undefined;
  const role = user?.role?.toUpperCase();

  // If this user is directly assigned to a sub-branch (not main branch),
  // they are locked to that branch as their active operational context!
  if (user?.branchId && user?.isMainBranch === false) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: user.branchId },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          contact: true,
          guidePhone: true,
          isMainBranch: true,
        },
      });
      if (branch) {
        return {
          isImpersonating: false,
          branchId: branch.id,
          branch: { ...branch, isMainBranch: Boolean(branch.isMainBranch) },
        };
      }
    } catch {
      return { isImpersonating: false, branchId: null, branch: null };
    }
  }

  const isEligible = role === "OWNER" || (role === "ADMIN" && (user?.isMainBranch ?? true)) || role === "PLATFORM_ADMIN" || user?.isMainBranch;

  if (!isEligible) {
    return { isImpersonating: false, branchId: null, branch: null };
  }

  try {
    const cookieStore = cookies();
    const branchId = cookieStore.get(BRANCH_IMPERSONATION_COOKIE)?.value || null;

    const findDefaultMainBranch = async (instId: string) => {
      let mb = await prisma.branch.findFirst({
        where: { instituteId: instId, isMainBranch: true },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          contact: true,
          guidePhone: true,
          isMainBranch: true,
        },
      });
      if (!mb) {
        mb = await prisma.branch.findFirst({
          where: { instituteId: instId, name: { contains: "main", mode: "insensitive" } },
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            contact: true,
            guidePhone: true,
            isMainBranch: true,
          },
        });
      }
      if (!mb) {
        mb = await prisma.branch.findFirst({
          where: { instituteId: instId },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            contact: true,
            guidePhone: true,
            isMainBranch: true,
          },
        });
      }
      return mb ? { ...mb, isMainBranch: true } : null;
    };

    if (!branchId) {
      if (user?.instituteId) {
        const mainBranch = await findDefaultMainBranch(user.instituteId);
        if (mainBranch) {
          return {
            isImpersonating: false,
            branchId: mainBranch.id,
            branch: mainBranch,
          };
        }
      }
      return { isImpersonating: false, branchId: null, branch: null };
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        contact: true,
        guidePhone: true,
        isMainBranch: true,
      },
    });

    if (!branch) {
      if (user?.instituteId) {
        const mainBranch = await findDefaultMainBranch(user.instituteId);
        return { isImpersonating: false, branchId: mainBranch?.id || null, branch: mainBranch };
      }
      return { isImpersonating: false, branchId: null, branch: null };
    }

    const isMain = isMainBranchRecord(branch);
    if (isMain) {
      // It's the main branch, so never impersonating!
      return {
        isImpersonating: false,
        branchId: branch.id,
        branch: { ...branch, isMainBranch: true },
      };
    }

    return {
      isImpersonating: true,
      branchId: branch.id,
      branch: { ...branch, isMainBranch: false },
    };
  } catch {
    return { isImpersonating: false, branchId: null, branch: null };
  }
}

// Use in API routes. Returns { error } if there's no logged-in Institute user,
// or if a platform admin is impersonating, returns the impersonated institute.
export async function requireInstitute() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  let instituteId = user?.instituteId;

  if (user?.role === "PLATFORM_ADMIN") {
    try {
      const cookieStore = cookies();
      const impersonated = cookieStore.get(IMPERSONATION_COOKIE)?.value;
      if (impersonated) {
        instituteId = impersonated;
      }
    } catch {}
  }

  if (!session || !instituteId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  return { session, instituteId, isImpersonating: user?.role === "PLATFORM_ADMIN" && instituteId !== user?.instituteId } as const;
}

// Use in server page components - returns active instituteId (or impersonated instituteId).
export async function getInstituteId() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (user?.role === "PLATFORM_ADMIN") {
    try {
      const cookieStore = cookies();
      const impersonated = cookieStore.get(IMPERSONATION_COOKIE)?.value;
      if (impersonated) return impersonated;
    } catch {}
  }

  return user?.instituteId ?? null;
}

// Use in admin API routes. Returns { error } if there's no logged-in PLATFORM_ADMIN.
export async function requirePlatformAdmin() {
  const session = await auth();
  const role = (session?.user as SessionUser | undefined)?.role;

  if (!session || role !== "PLATFORM_ADMIN") {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  return { session } as const;
}

// Use in Institute API routes that require a specific permission.
// Grants access to Platform Admin when in impersonation mode or checks role.
export async function requirePermission(permission: Permission) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  let instituteId = user?.instituteId;
  let role = user?.role;

  if (user?.role === "PLATFORM_ADMIN") {
    try {
      const cookieStore = cookies();
      const impersonated = cookieStore.get(IMPERSONATION_COOKIE)?.value;
      if (impersonated) {
        instituteId = impersonated;
        role = "OWNER"; // Impersonate as Owner
      }
    } catch {}
  }

  if (!session || !instituteId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  if (!hasPermission(role, permission)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { session, instituteId } as const;
}

// Checks if a feature flag is enabled for the current institute tenant.
export async function requireFeature(feature: keyof FeatureFlags) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx;

  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { settings: true },
  });

  const parsed = parseInstituteSettings(institute?.settings);
  if (!parsed.featureFlags[feature]) {
    return {
      error: NextResponse.json(
        { error: `The '${feature}' module is disabled for this institute.` },
        { status: 403 }
      ),
    } as const;
  }

  return ctx;
}