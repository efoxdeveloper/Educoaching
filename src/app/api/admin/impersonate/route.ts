import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, IMPERSONATION_COOKIE } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function POST(req: Request) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { instituteId } = body;

  if (!instituteId) {
    return NextResponse.json({ error: "instituteId is required" }, { status: 400 });
  }

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true, name: true },
  });

  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  const cookieStore = cookies();
  cookieStore.set(IMPERSONATION_COOKIE, institute.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4, // 4 hours
  });

  await logAudit({
    instituteId: institute.id,
    actor: actorFromSession(ctx.session),
    action: "IMPERSONATION_STARTED",
    entityType: "Institute",
    entityId: institute.id,
    metadata: { instituteName: institute.name },
  });

  return NextResponse.json({ success: true, instituteName: institute.name });
}
