import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { getRazorpay } from "@/lib/razorpay";
import { PLATFORM_PLANS } from "@/lib/pricing";

// Starts (or upgrades) the calling institute's own platform subscription -
// distinct from /api/payments/create-order, which is for a Student paying
// their course fee. Owner-only, since billing is an ownership decision.
export async function POST(req: Request) {
  const ctx = await requirePermission("billing:manage");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { plan } = body as { plan?: keyof typeof PLATFORM_PLANS };

  if (!plan || !(plan in PLATFORM_PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const planDetails = PLATFORM_PLANS[plan];

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(planDetails.amount * 100), // paise
      currency: "INR",
      receipt: `platform_${ctx.instituteId}_${Date.now()}`,
      notes: { instituteId: ctx.instituteId, plan },
    });

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}