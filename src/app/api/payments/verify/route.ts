import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { actorFromSession } from "@/lib/audit";
import { processPaymentSuccess } from "@/lib/reconciliation";

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    studentId,
    amount,
    purpose,
  } = body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    studentId: string;
    amount: number;
    purpose: "fee" | "renewal";
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !studentId || !amount || !purpose) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

  const student = await prisma.student.findFirst({ where: { id: studentId, instituteId: ctx.instituteId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const result = await processPaymentSuccess({
    instituteId: ctx.instituteId,
    studentId,
    amount,
    purpose,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
    actor: actorFromSession(ctx.session),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to process payment" }, { status: 500 });
  }

  const updatedStudent = await prisma.student.findUnique({
    where: { id: studentId },
  });

  return NextResponse.json({
    ok: true,
    alreadyProcessed: result.alreadyProcessed,
    payment: result.payment,
    renewal: result.renewal,
    student: updatedStudent,
  });
}