import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { PLATFORM_PLANS } from "@/lib/pricing";
import { addMonths } from "@/lib/subscription";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function POST(req: Request) {
  const ctx = await requirePermission("billing:manage");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan: keyof typeof PLATFORM_PLANS;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan || !(plan in PLATFORM_PLANS)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || keySecret.includes("your_key_secret_here")) {
    return NextResponse.json({ error: "Razorpay is not configured on the server" }, { status: 500 });
  }

  // Verify the payment actually came from Razorpay and wasn't tampered with.
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const planDetails = PLATFORM_PLANS[plan];

  // Extend from the current period end if they're upgrading before it
  // lapses, otherwise start fresh from now (mirrors how student renewals
  // are computed in /api/renewals).
  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { currentPeriodEnd: true },
  });

  const now = new Date();
  const base =
    institute?.currentPeriodEnd && new Date(institute.currentPeriodEnd) > now
      ? new Date(institute.currentPeriodEnd)
      : now;
  const currentPeriodEnd = addMonths(base, planDetails.months);

  const updated = await prisma.institute.update({
    where: { id: ctx.instituteId },
    data: {
      billingCycle: plan,
      platformSubscriptionStatus: "ACTIVE",
      currentPeriodAmount: planDetails.amount,
      currentPeriodEnd,
      expiryReminderSentAt: null,
    },
    select: { id: true, billingCycle: true, platformSubscriptionStatus: true, currentPeriodEnd: true },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "PLATFORM_SUBSCRIPTION_RENEWED",
    entityType: "Institute",
    entityId: ctx.instituteId,
    metadata: { plan, amount: planDetails.amount, currentPeriodEnd, razorpayPaymentId: razorpay_payment_id },
  });

  return NextResponse.json({ ok: true, institute: updated });
}