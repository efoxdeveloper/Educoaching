import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { PLATFORM_PLANS } from "@/lib/pricing";
import { addMonths } from "@/lib/subscription";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const { plan, note } = body as { plan?: string; note?: string };

  if (!plan || !(plan in PLATFORM_PLANS)) {
    return NextResponse.json({ error: "Invalid plan. Use MONTHLY, QUARTERLY, or YEARLY" }, { status: 400 });
  }

  const planKey = plan as keyof typeof PLATFORM_PLANS;
  const planDetails = PLATFORM_PLANS[planKey];

  const institute = await prisma.institute.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, billingCycle: true, platformSubscriptionStatus: true, currentPeriodEnd: true },
  });

  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  const now = new Date();
  const base =
    institute.currentPeriodEnd && new Date(institute.currentPeriodEnd) > now
      ? new Date(institute.currentPeriodEnd)
      : now;
  const currentPeriodEnd = addMonths(base, planDetails.months);

  const updated = await prisma.institute.update({
    where: { id: params.id },
    data: {
      billingCycle: planKey,
      platformSubscriptionStatus: "ACTIVE",
      currentPeriodAmount: planDetails.amount,
      currentPeriodEnd,
      expiryReminderSentAt: null,
    },
  });

  await logAudit({
    instituteId: updated.id,
    actor: actorFromSession(ctx.session),
    action: "PLATFORM_SUBSCRIPTION_MANUAL_RENEWAL",
    entityType: "Institute",
    entityId: updated.id,
    metadata: {
      plan: planKey,
      amount: planDetails.amount,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      previousBillingCycle: institute.billingCycle,
      previousStatus: institute.platformSubscriptionStatus,
      previousPeriodEnd: institute.currentPeriodEnd ? new Date(institute.currentPeriodEnd).toISOString() : null,
      note: note ? String(note).slice(0, 500) : null,
      manual: true,
      offline: true,
      by: "platform_admin",
    },
  });

  await prisma.platformNotification.create({
    data: {
      instituteId: updated.id,
      type: "PLATFORM_SUBSCRIPTION_MANUAL_RENEWAL",
      message: `${updated.name} subscription manually renewed to ${planKey} by platform admin. Valid until ${currentPeriodEnd.toLocaleDateString("en-IN")}.`,
    },
  });

  return NextResponse.json({ ok: true, institute: updated });
}
