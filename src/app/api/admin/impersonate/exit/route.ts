import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requirePlatformAdmin, IMPERSONATION_COOKIE } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function POST() {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const cookieStore = cookies();
  const existingImpersonatedId = cookieStore.get(IMPERSONATION_COOKIE)?.value;

  cookieStore.delete(IMPERSONATION_COOKIE);

  if (existingImpersonatedId) {
    await logAudit({
      instituteId: existingImpersonatedId,
      actor: actorFromSession(ctx.session),
      action: "IMPERSONATION_ENDED",
      entityType: "Institute",
      entityId: existingImpersonatedId,
    });
  }

  return NextResponse.json({ success: true });
}
