import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireInstitute, BRANCH_IMPERSONATION_COOKIE, getBranchImpersonationState } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET() {
  const state = await getBranchImpersonationState();
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const user = ctx.session?.user as { role?: string; isMainBranch?: boolean } | undefined;
  const userRole = user?.role?.toUpperCase();
  const isAuthorized =
    userRole === "OWNER" ||
    userRole === "ADMIN" ||
    userRole === "PLATFORM_ADMIN" ||
    user?.isMainBranch;

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Forbidden: Only Main Branch and Institute administrators can impersonate branches" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { branchId } = body;

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, instituteId: ctx.instituteId },
    select: { id: true, name: true, city: true, contact: true, guidePhone: true, isMainBranch: true, status: true },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found for this institute" }, { status: 404 });
  }

  if (branch.status === "PENDING_APPROVAL") {
    return NextResponse.json(
      { error: "Cannot access this branch yet. Sub-branch request is currently in processing awaiting Platform Admin approval." },
      { status: 403 }
    );
  }

  const cookieStore = cookies();
  const isMain = Boolean(branch.isMainBranch || (branch.name && branch.name.toLowerCase().includes("main")));
  if (isMain) {
    cookieStore.delete(BRANCH_IMPERSONATION_COOKIE);
    if (!branch.isMainBranch) {
      await prisma.branch.update({
        where: { id: branch.id },
        data: { isMainBranch: true },
      }).catch(() => {});
    }
    await logAudit({
      instituteId: ctx.instituteId,
      actor: actorFromSession(ctx.session),
      action: "BRANCH_IMPERSONATION_ENDED",
      entityType: "Branch",
      entityId: branch.id,
      metadata: { branchName: branch.name, reason: "Switched to Main Campus" },
    });

    return NextResponse.json({
      success: true,
      isImpersonating: false,
      branchId: branch.id,
      branchName: branch.name,
    });
  }

  cookieStore.set(BRANCH_IMPERSONATION_COOKIE, branch.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4, // 4 hours
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "BRANCH_IMPERSONATION_STARTED",
    entityType: "Branch",
    entityId: branch.id,
    metadata: { branchName: branch.name, branchCity: branch.city },
  });

  return NextResponse.json({
    success: true,
    isImpersonating: true,
    branchId: branch.id,
    branchName: branch.name,
  });
}
