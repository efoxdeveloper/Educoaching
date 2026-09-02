import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePlatformAdmin } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { parseInstituteSettings, parseFeatureFlags, type FeatureFlags } from "@/lib/institute-settings";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const institute = await prisma.institute.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, settings: true },
  });

  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  const settings = parseInstituteSettings(institute.settings);
  return NextResponse.json({
    instituteId: institute.id,
    instituteName: institute.name,
    featureFlags: settings.featureFlags,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const institute = await prisma.institute.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, settings: true },
  });

  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  const body = await req.json();
  const incomingFlags = body.featureFlags;

  if (!incomingFlags || typeof incomingFlags !== "object") {
    return NextResponse.json({ error: "Invalid featureFlags payload" }, { status: 400 });
  }

  const currentSettings = parseInstituteSettings(institute.settings);
  const updatedFlags: FeatureFlags = {
    ...currentSettings.featureFlags,
    ...parseFeatureFlags(incomingFlags),
  };

  const updatedSettings = {
    ...currentSettings,
    featureFlags: updatedFlags,
  };

  await prisma.institute.update({
    where: { id: params.id },
    data: { settings: updatedSettings as unknown as Prisma.InputJsonValue },
    select: { id: true },
  });

  await logAudit({
    instituteId: institute.id,
    actor: actorFromSession(ctx.session),
    action: "FEATURE_FLAGS_UPDATED",
    entityType: "Institute",
    entityId: institute.id,
    metadata: { featureFlags: updatedFlags },
  });

  return NextResponse.json({
    success: true,
    featureFlags: updatedFlags,
  });
}
