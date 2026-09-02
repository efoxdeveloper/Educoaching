import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { actorFromSession } from "@/lib/audit";
import { processRefundSuccess } from "@/lib/reconciliation";

export async function POST(req: Request) {
  const ctx = await requirePermission("payments:refund");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const { studentId, amount, reason, method } = body as {
    studentId?: string;
    amount?: number | string;
    reason?: string;
    method?: string;
  };

  if (!studentId || !amount || !reason || !String(reason).trim()) {
    return NextResponse.json(
      { error: "Student ID, positive refund amount, and refund reason are required." },
      { status: 400 }
    );
  }

  const refundAmount = Number(amount);
  if (isNaN(refundAmount) || refundAmount <= 0) {
    return NextResponse.json(
      { error: "Refund amount must be a positive number." },
      { status: 400 }
    );
  }

  const result = await processRefundSuccess({
    instituteId: ctx.instituteId,
    studentId,
    amount: refundAmount,
    reason: String(reason).trim(),
    method: method || "Cash Refund",
    actor: actorFromSession(ctx.session),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to process refund." }, { status: 400 });
  }

  return NextResponse.json(result.payment, { status: 201 });
}
