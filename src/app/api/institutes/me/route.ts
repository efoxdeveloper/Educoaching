import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { parseInstituteSettings, TIMEZONE_OPTIONS, CURRENCY_OPTIONS } from "@/lib/institute-settings";

// Returns the current institute's own editable profile - every logged-in
// institute user can read it (same convention as every other GET here),
// only PATCH is gated by institute:manage.
export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: {
      id: true,
      name: true,
      ownerName: true,
      email: true,
      mobile: true,
      address: true,
      city: true,
      state: true,
      academicYearLabel: true,
      guidePhone: true,
      instituteSlug: true,
      settings: true,
      billingCycle: true,
      platformSubscriptionStatus: true,
      currentPeriodAmount: true,
      trialStartedAt: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  });
  if (!institute) return NextResponse.json({ error: "Institute not found" }, { status: 404 });

  let effectiveSlug = institute.instituteSlug;
  if (!effectiveSlug) {
    const base = institute.name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "") || "institute";
    let candidate = base;
    const existing = await prisma.institute.findUnique({ where: { instituteSlug: candidate } });
    if (existing && existing.id !== institute.id) {
      candidate = `${base}-${institute.id.slice(-4).toLowerCase()}`;
    }
    await prisma.institute.update({
      where: { id: institute.id },
      data: { instituteSlug: candidate },
    });
    effectiveSlug = candidate;
  }

  // The logo is just the most recent INSTITUTE_LOGO file attached to this
  // institute - no dedicated column, see FileAsset's relatedType/relatedId.
  const logo = await prisma.fileAsset.findFirst({
    where: { instituteId: ctx.instituteId, category: "INSTITUTE_LOGO", relatedType: "Institute", relatedId: ctx.instituteId },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, mimeType: true, createdAt: true },
  });

  return NextResponse.json({
    ...institute,
    instituteSlug: effectiveSlug,
    settings: parseInstituteSettings(institute.settings),
    logo,
  });
}

export async function PATCH(req: Request) {
  const ctx = await requirePermission("institute:manage");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { name, address, city, state, academicYearLabel, guidePhone, settings } = body ?? {};

  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Institute name can't be empty" }, { status: 400 });
  }

  if (settings !== undefined) {
    if (settings.timezone && !TIMEZONE_OPTIONS.includes(settings.timezone)) {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
    }
    if (settings.currency && !CURRENCY_OPTIONS.includes(settings.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }
    if (settings.weekStart && !["MON", "SUN"].includes(settings.weekStart)) {
      return NextResponse.json({ error: "Invalid week start" }, { status: 400 });
    }
  }

  const current = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { settings: true },
  });
  const mergedSettings = settings
    ? { ...parseInstituteSettings(current?.settings), ...settings }
    : undefined;

  const updated = await prisma.institute.update({
    where: { id: ctx.instituteId },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(address !== undefined ? { address: address ? String(address).trim() : null } : {}),
      ...(city !== undefined ? { city: city ? String(city).trim() : null } : {}),
      ...(state !== undefined ? { state: state ? String(state).trim() : null } : {}),
      ...(academicYearLabel !== undefined
        ? { academicYearLabel: academicYearLabel ? String(academicYearLabel).trim() : null }
        : {}),
      ...(guidePhone !== undefined
        ? { guidePhone: guidePhone ? String(guidePhone).trim() : null }
        : {}),
      ...(mergedSettings ? { settings: mergedSettings } : {}),
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      academicYearLabel: true,
      guidePhone: true,
      settings: true,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "INSTITUTE_PROFILE_UPDATED",
    entityType: "Institute",
    entityId: ctx.instituteId,
    metadata: { name, address, city, state, academicYearLabel, settings },
  });

  return NextResponse.json({ ...updated, settings: parseInstituteSettings(updated.settings) });
}