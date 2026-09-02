import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireInstitute, BRANCH_IMPERSONATION_COOKIE } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function POST() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const cookieStore = cookies();
  const existingBranchId = cookieStore.get(BRANCH_IMPERSONATION_COOKIE)?.value;

  cookieStore.delete(BRANCH_IMPERSONATION_COOKIE);

  if (existingBranchId) {
    await logAudit({
      instituteId: ctx.instituteId,
      actor: actorFromSession(ctx.session),
      action: "BRANCH_IMPERSONATION_ENDED",
      entityType: "Branch",
      entityId: existingBranchId,
      metadata: { previousBranchId: existingBranchId },
    });
  }

  return NextResponse.json({ success: true });
}
