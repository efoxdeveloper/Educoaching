import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { processPaymentSuccess } from "@/lib/reconciliation";

type RazorpayWebhookPayload = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        method?: string;
        notes?: Record<string, string>;
        error_description?: string;
        error_reason?: string;
      };
    };
    order?: {
      entity?: {
        id?: string;
        amount?: number;
      };
    };
  };
};

export async function POST(req: Request) {
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!webhookSecret || webhookSecret.includes("your_key_secret_here")) {
    return NextResponse.json({ error: "Razorpay webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  // Verify HMAC SHA-256 signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType = event.event;
  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;

  // Handle successful capture or order payment
  if (eventType === "payment.captured" || eventType === "order.paid") {
    const paymentId = paymentEntity?.id;
    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const amountInPaise = paymentEntity?.amount || orderEntity?.amount;
    const amountInRupees = amountInPaise ? amountInPaise / 100 : 0;
    const method = paymentEntity?.method || "Razorpay Webhook";

    if (!paymentId && !orderId) {
      return NextResponse.json({ error: "Missing payment or order ID in webhook" }, { status: 400 });
    }

    // Try finding the pre-existing pending PaymentTransaction
    let tx = orderId
      ? await prisma.paymentTransaction.findUnique({
          where: { orderId },
          include: { student: true },
        })
      : null;

    if (!tx && paymentId) {
      tx = await prisma.paymentTransaction.findUnique({
        where: { paymentId },
        include: { student: true },
      });
    }

    if (tx) {
      await processPaymentSuccess({
        instituteId: tx.instituteId,
        studentId: tx.studentId,
        amount: Number(tx.amount) || amountInRupees,
        purpose: tx.purpose as "fee" | "renewal",
        orderId: tx.orderId,
        paymentId: paymentId || tx.paymentId || `pay_captured_${Date.now()}`,
        signature,
        method,
        actor: { name: "Razorpay Webhook", role: "SYSTEM" },
        webhookPayload: event as unknown as Prisma.InputJsonValue,
      });
    } else if (paymentEntity?.notes?.studentId) {
      // Order wasn't logged beforehand, but studentId is in notes
      const studentId = paymentEntity.notes.studentId;
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (student) {
        const purpose = (paymentEntity.notes.purpose === "renewal" ? "renewal" : "fee") as "fee" | "renewal";
        await processPaymentSuccess({
          instituteId: student.instituteId,
          studentId,
          amount: amountInRupees,
          purpose,
          orderId: orderId || `order_${paymentId}`,
          paymentId: paymentId || `pay_${Date.now()}`,
          signature,
          method,
          actor: { name: "Razorpay Webhook (Notes)", role: "SYSTEM" },
          webhookPayload: event as unknown as Prisma.InputJsonValue,
        });
      }
    }

    return NextResponse.json({ received: true, event: eventType });
  }

  // Handle failed payment event
  if (eventType === "payment.failed") {
    const paymentId = paymentEntity?.id;
    const orderId = paymentEntity?.order_id;
    const failureReason =
      paymentEntity?.error_description ||
      paymentEntity?.error_reason ||
      "Payment failed at payment gateway";

    if (orderId) {
      await prisma.paymentTransaction.updateMany({
        where: { orderId },
        data: {
          status: "FAILED",
          paymentId: paymentId || undefined,
          failureReason,
          reconciled: true,
          reconciledAt: new Date(),
          webhookPayload: event as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json({ received: true, event: eventType, status: "FAILED" });
  }

  // Handle refund events
  if (eventType === "refund.created" || eventType === "refund.processed" || eventType === "payment.refunded") {
    const refundEntity = (event.payload as any)?.refund?.entity;
    const paymentId = refundEntity?.payment_id || paymentEntity?.id;
    const refundId = refundEntity?.id || `rfnd_${Date.now()}`;
    const amountInPaise = refundEntity?.amount || paymentEntity?.amount || 0;
    const refundAmount = amountInPaise / 100;
    const notes = refundEntity?.notes || paymentEntity?.notes || {};
    const reason = notes?.reason || refundEntity?.notes?.comment || "Online Payment Gateway Refund";

    if (paymentId) {
      // Find matching payment or transaction
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [{ razorpayPaymentId: paymentId }, { note: { contains: paymentId } }],
        },
        include: { student: true },
      });

      if (payment) {
        const { processRefundSuccess } = await import("@/lib/reconciliation");
        await processRefundSuccess({
          instituteId: payment.instituteId,
          studentId: payment.studentId,
          amount: refundAmount > 0 ? refundAmount : Number(payment.amount),
          reason,
          method: "Razorpay Refund",
          razorpayPaymentId: paymentId,
          razorpayRefundId: refundId,
          actor: { name: "Razorpay Webhook (Refund)", role: "SYSTEM" },
        });
      }
    }

    return NextResponse.json({ received: true, event: eventType, refund: true });
  }

  // Unhandled / informational event
  return NextResponse.json({ received: true, event: eventType, unhandled: true });
}
