import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";
import { parseInstituteSettings, type FeatureFlags } from "@/lib/institute-settings";

type SessionUser = { instituteId?: string | null; role?: string; id?: string; impersonatingBranchId?: string | null; impersonationStartedAt?: number | null };

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

const BRANCH_SELECT = {
  id: true,
  name: true,
  city: true,
  state: true,
  contact: true,
  guidePhone: true,
  isMainBranch: true,
} as const;

type BranchRecord = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  contact: string | null;
  guidePhone: string | null;
  isMainBranch: boolean;
};

/**
 * Finds the main branch for an institute (tries isMainBranch flag, then name contains "main",
 * then falls back to the earliest-created branch).
 */
async function findDefaultMainBranch(instId: string): Promise<BranchRecord | null> {
  let mb = await prisma.branch.findFirst({
    where: { instituteId: instId, isMainBranch: true },
    select: BRANCH_SELECT,
  });
  if (!mb) {
    mb = await prisma.branch.findFirst({
      where: { instituteId: instId, name: { contains: "main", mode: "insensitive" } },
      select: BRANCH_SELECT,
    });
  }
  if (!mb) {
    mb = await prisma.branch.findFirst({
      where: { instituteId: instId },
      orderBy: { createdAt: "asc" },
      select: BRANCH_SELECT,
    });
  }
  return mb ? { ...mb, isMainBranch: true } : null;
}

// Internal shared function for branch resolution logic — per-session JWT, not global cookie/DB
async function resolveBranchContext(
  user: (SessionUser & { isMainBranch?: boolean; branchId?: string | null }) | undefined,
  instituteId: string
): Promise<{
  isImpersonating: boolean;
  branchId: string | null;
  branch: BranchRecord | null;
}> {
  const role = user?.role?.toUpperCase();

  // If this user is directly assigned to a sub-branch (not main branch),
  // they are locked to that branch as their active operational context!
  if (user?.branchId && user?.isMainBranch === false) {
    try {
      const branch = await prisma.branch.findFirst({
        where: {
          id: user.branchId,
          instituteId,
        },
        select: BRANCH_SELECT,
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

  // Per-session impersonation via JWT claim (tied to userId, not global cookie/DB)
  const impersonatingBranchId = (user as any)?.impersonatingBranchId as string | null | undefined;
  const impersonationStartedAt = (user as any)?.impersonationStartedAt as number | null | undefined;
  if (impersonatingBranchId) {
    // Auto-expire after 4 hours
    if (impersonationStartedAt && Date.now() - impersonationStartedAt > 4 * 60 * 60 * 1000) {
      // Expired — fall through to main branch
    } else {
      try {
        const branch = await prisma.branch.findFirst({
          where: { id: impersonatingBranchId, instituteId },
          select: BRANCH_SELECT,
        });
        if (branch) {
          const isMain = isMainBranchRecord(branch);
          if (isMain) {
            return { isImpersonating: false, branchId: branch.id, branch: { ...branch, isMainBranch: true } };
          }
          return { isImpersonating: true, branchId: branch.id, branch: { ...branch, isMainBranch: false } };
        }
        // Branch not found or not in institute — fall through to main
      } catch {
        // fall through
      }
    }
  }

  // No impersonation — default to Main Branch (per-session)
  try {
    const mainBranch = await findDefaultMainBranch(instituteId);
    if (mainBranch) {
      return { isImpersonating: false, branchId: mainBranch.id, branch: mainBranch };
    }
    return { isImpersonating: false, branchId: null, branch: null };
  } catch {
    return { isImpersonating: false, branchId: null, branch: null };
  }
}

export async function getBranchImpersonationState(): Promise<{
  isImpersonating: boolean;
  branchId: string | null;
  branch: BranchRecord | null;
}> {
  const session = await auth();
  const user = session?.user as (SessionUser & { isMainBranch?: boolean; branchId?: string | null }) | undefined;
  const instituteId = user?.instituteId || "";

  if (!instituteId) {
    return { isImpersonating: false, branchId: null, branch: null };
  }

  return resolveBranchContext(user, instituteId);
}

// Use in API routes. Returns { error } if there's no logged-in Institute user,
  // or if a platform admin is impersonating, returns the impersonated institute.
  // Always returns a specific branchId — Main Branch id when not impersonating,
  // the sub-branch id when directly assigned, or the impersonated branch id.
  export async function requireInstitute() {
    const session = await auth();
    const user = session?.user as (SessionUser & { id?: string; email?: string; permissions?: string[]; isMainBranch?: boolean; branchId?: string | null }) | undefined;
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

    let permissions: string[] = user?.permissions || [];
    const upperRole = (user?.role || "").toUpperCase();

    // If permissions not in session or for fresh permissions check, query Faculty record
    if (upperRole && upperRole !== "OWNER" && upperRole !== "ADMIN" && upperRole !== "PLATFORM_ADMIN") {
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
        if (faculty?.permissions) {
          permissions = faculty.permissions;
        }
      } catch {}
    }

    // Resolve the effective branch using shared logic
    const branchContext = await resolveBranchContext(user, instituteId);

    return {
      session,
      instituteId,
      branchId: branchContext.branchId,
      role: user?.role,
      permissions,
      isImpersonating: user?.role === "PLATFORM_ADMIN" && instituteId !== user?.instituteId,
      isImpersonatingBranch: branchContext.isImpersonating,
    } as const;
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
// Grants access to Platform Admin when in impersonation mode or checks role & granular permissions.
export async function requirePermission(permission: Permission) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx;

  const role = ctx.role;
  let effectiveRole = role;
  if (role === "PLATFORM_ADMIN" && ctx.isImpersonating) {
    effectiveRole = "OWNER";
  }

  if (!hasPermission({ role: effectiveRole, permissions: ctx.permissions }, permission)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return ctx;
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