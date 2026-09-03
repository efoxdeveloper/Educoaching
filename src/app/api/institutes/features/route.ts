import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { parseInstituteSettings, DEFAULT_FEATURE_FLAGS } from "@/lib/institute-settings";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { settings: true },
  });

  if (!institute) {
    return NextResponse.json({ featureFlags: DEFAULT_FEATURE_FLAGS });
  }

  const parsed = parseInstituteSettings(institute.settings);
  return NextResponse.json({
    featureFlags: parsed.featureFlags,
    permissions: ctx.permissions,
  });
}
