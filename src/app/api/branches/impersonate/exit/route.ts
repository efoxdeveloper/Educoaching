import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireInstitute, BRANCH_IMPERSONATION_COOKIE } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function POST() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const cookieStore = cookies();
  cookieStore.delete(BRANCH_IMPERSONATION_COOKIE);

  // Per-session JWT: client will clear via update({ impersonatingBranchId: null })
  // We log with the branchId from JWT if present, else generic
  const impersonatingBranchId = (ctx.session?.user as any)?.impersonatingBranchId as string | null;
  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "BRANCH_IMPERSONATION_ENDED",
    entityType: "Branch",
    entityId: impersonatingBranchId || "unknown",
    metadata: { previousBranchId: impersonatingBranchId, via: "exit" },
  });

  return NextResponse.json({ success: true, impersonatingBranchId: null });
}
