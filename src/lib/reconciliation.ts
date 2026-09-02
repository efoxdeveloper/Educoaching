import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { RENEWAL_PERIOD_DAYS } from "@/lib/subscription";
import { logAudit, type AuditActor } from "@/lib/audit";

export type PaymentSuccessResult = {
  ok: boolean;
  alreadyProcessed?: boolean;
  payment?: unknown;
  renewal?: unknown;
  error?: string;
};

type RazorpayPaymentItem = {
  id: string;
  status: string;
  method?: string;
  error_description?: string;
};

/**
 * Idempotently processes a successful Razorpay payment, whether from
 * client-side verification, webhook callback, or reconciliation scheduler.
 */
export async function processPaymentSuccess({
  instituteId,
  studentId,
  amount,
  purpose,
  orderId,
  paymentId,
  signature,
  method = "Razorpay",
  actor,
  webhookPayload,
}: {
  instituteId: string;
  studentId: string;
  amount: number;
  purpose: "fee" | "renewal";
  orderId: string;
  paymentId: string;
  signature?: string;
  method?: string;
  actor?: AuditActor;
  webhookPayload?: Prisma.InputJsonValue;
}): Promise<PaymentSuccessResult> {
  // Idempotency check 1: Has this paymentId already been recorded in Payment?
  const existingPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        { razorpayPaymentId: paymentId },
        { note: { contains: paymentId } },
      ],
    },
  });

  if (existingPayment) {
    // Already recorded - ensure PaymentTransaction is marked SUCCESS
    await prisma.paymentTransaction.upsert({
      where: { orderId },
      update: {
        status: "SUCCESS",
        paymentId,
        reconciled: true,
        reconciledAt: new Date(),
        webhookPayload: webhookPayload ?? undefined,
      },
      create: {
        instituteId,
        studentId,
        amount,
        purpose,
        orderId,
        paymentId,
        signature,
        status: "SUCCESS",
        reconciled: true,
        reconciledAt: new Date(),
        webhookPayload: webhookPayload ?? undefined,
      },
    }).catch(() => {});

    return { ok: true, alreadyProcessed: true, payment: existingPayment };
  }

  // Idempotency check 2: For renewals, check note
  if (purpose === "renewal") {
    const existingRenewal = await prisma.renewal.findFirst({
      where: { note: { contains: paymentId } },
    });
    if (existingRenewal) {
      return { ok: true, alreadyProcessed: true, renewal: existingRenewal };
    }
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
  });

  if (!student) {
    return { ok: false, error: "Student not found" };
  }

  const auditActor = actor || { name: "Razorpay Webhook/Reconciliation", role: "SYSTEM" };

  if (purpose === "fee") {
    // Check if institute has GST enabled
    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { name: true, settings: true },
    });
    const { parseInstituteSettings } = await import("@/lib/institute-settings");
    const parsedSettings = parseInstituteSettings(institute?.settings);

    let baseAmount: number | undefined = undefined;
    let gstAmount: number | undefined = undefined;
    let gstPercent: number | undefined = undefined;

    if (parsedSettings.applyGst) {
      gstPercent = parsedSettings.gstPercent ?? 18;
      const total = Number(amount);
      baseAmount = Number((total / (1 + gstPercent / 100)).toFixed(2));
      gstAmount = Number((total - baseAmount).toFixed(2));
    }

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          instituteId,
          studentId,
          amount,
          baseAmount,
          gstAmount,
          gstPercent,
          method,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          status: "SUCCESS",
          note: `Razorpay payment ${paymentId} (Order: ${orderId})`,
        },
      }),
      prisma.student.update({
        where: { id: studentId },
        data: { paidFee: { increment: Number(amount) } },
      }),
      prisma.paymentTransaction.upsert({
        where: { orderId },
        update: {
          status: "SUCCESS",
          paymentId,
          signature: signature || undefined,
          method,
          reconciled: true,
          reconciledAt: new Date(),
          webhookPayload: webhookPayload ?? undefined,
        },
        create: {
          instituteId,
          studentId,
          amount,
          purpose: "fee",
          orderId,
          paymentId,
          signature,
          method,
          status: "SUCCESS",
          reconciled: true,
          reconciledAt: new Date(),
          webhookPayload: webhookPayload ?? undefined,
        },
      }),
    ]);

    // Asynchronously generate PDF receipt and send confirmation email
    (async () => {
      try {
        const { createAndPersistPaymentReceipt } = await import("@/lib/receipt-generator");
        const { sendPaymentReceiptEmail } = await import("@/lib/email");
        await createAndPersistPaymentReceipt(payment.id);

        if (student.email) {
          await sendPaymentReceiptEmail({
            to: student.email,
            studentName: student.name,
            amount: Number(amount),
            paymentMethod: method,
            receiptNumber: payment.id.slice(-8).toUpperCase(),
            instituteName: institute?.name || "Vidyalaya Institute",
          });
        }
      } catch (receiptErr) {
        console.error("[reconciliation] Failed to generate/email payment receipt:", receiptErr);
      }
    })();

    await logAudit({
      instituteId,
      actor: auditActor,
      action: "PAYMENT_RECORDED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { studentId, amount: Number(amount), method, razorpayPaymentId: paymentId, orderId },
    });

    return { ok: true, payment };
  }

  // purpose === "renewal"
  const now = new Date();
  const base =
    student.currentPeriodEnd && new Date(student.currentPeriodEnd) > now
      ? new Date(student.currentPeriodEnd)
      : now;
  const validUntil = new Date(base);
  validUntil.setDate(validUntil.getDate() + RENEWAL_PERIOD_DAYS);

  const [renewal] = await prisma.$transaction([
    prisma.renewal.create({
      data: {
        instituteId,
        studentId,
        amount,
        method,
        note: `Razorpay payment ${paymentId} (Order: ${orderId})`,
        validFrom: now,
        validUntil,
      },
    }),
    prisma.student.update({
      where: { id: studentId },
      data: {
        plan: "MONTHLY",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: validUntil,
        monthlyAmount: amount,
      },
    }),
    prisma.paymentTransaction.upsert({
      where: { orderId },
      update: {
        status: "SUCCESS",
        paymentId,
        signature: signature || undefined,
        method,
        reconciled: true,
        reconciledAt: new Date(),
        webhookPayload: webhookPayload ?? undefined,
      },
      create: {
        instituteId,
        studentId,
        amount,
        purpose: "renewal",
        orderId,
        paymentId,
        signature,
        method,
        status: "SUCCESS",
        reconciled: true,
        reconciledAt: new Date(),
        webhookPayload: webhookPayload ?? undefined,
      },
    }),
  ]);

  await logAudit({
    instituteId,
    actor: auditActor,
    action: "RENEWAL_RECORDED",
    entityType: "Renewal",
    entityId: renewal.id,
    metadata: { studentId, amount: Number(amount), method, razorpayPaymentId: paymentId, validUntil },
  });

  return { ok: true, renewal, payment: renewal };
}

/**
 * Reconciles pending payment transactions against the Razorpay API.
 */
export async function reconcilePendingTransactions(instituteId?: string) {
  let razorpay: ReturnType<typeof getRazorpay>;
  try {
    razorpay = getRazorpay();
  } catch {
    return {
      success: false,
      error: "Razorpay is not configured",
      scanned: 0,
      reconciled: 0,
      failed: 0,
      stillPending: 0,
      details: [],
    };
  }

  const whereClause: Prisma.PaymentTransactionWhereInput = {
    status: "PENDING",
  };
  if (instituteId) {
    whereClause.instituteId = instituteId;
  }

  const pendingTransactions = await prisma.paymentTransaction.findMany({
    where: whereClause,
    include: { student: true },
    orderBy: { createdAt: "asc" },
  });

  let reconciled = 0;
  let failed = 0;
  let stillPending = 0;
  const details: Array<{ orderId: string; status: string; note: string }> = [];

  for (const tx of pendingTransactions) {
    try {
      const order = await razorpay.orders.fetch(tx.orderId);
      const payments = (await razorpay.orders.fetchPayments(tx.orderId)) as { items?: RazorpayPaymentItem[] };

      const capturedPayment = payments?.items?.find((p) => p.status === "captured");
      const failedPayment = payments?.items?.find((p) => p.status === "failed");

      if (capturedPayment) {
        const res = await processPaymentSuccess({
          instituteId: tx.instituteId,
          studentId: tx.studentId,
          amount: Number(tx.amount),
          purpose: tx.purpose as "fee" | "renewal",
          orderId: tx.orderId,
          paymentId: capturedPayment.id,
          method: capturedPayment.method || "Razorpay",
          actor: { name: "Automated Reconciliation", role: "SYSTEM" },
        });

        if (res.ok) {
          reconciled++;
          details.push({ orderId: tx.orderId, status: "RECONCILED", note: `Captured payment ${capturedPayment.id}` });
        } else {
          stillPending++;
          details.push({ orderId: tx.orderId, status: "ERROR", note: res.error || "Failed to reconcile" });
        }
      } else if (order.status === "paid" && payments?.items && payments.items.length > 0) {
        const p = payments.items[0];
        const res = await processPaymentSuccess({
          instituteId: tx.instituteId,
          studentId: tx.studentId,
          amount: Number(tx.amount),
          purpose: tx.purpose as "fee" | "renewal",
          orderId: tx.orderId,
          paymentId: p.id,
          method: p.method || "Razorpay",
          actor: { name: "Automated Reconciliation", role: "SYSTEM" },
        });
        if (res.ok) {
          reconciled++;
          details.push({ orderId: tx.orderId, status: "RECONCILED", note: `Order marked paid, payment ${p.id}` });
        }
      } else if (failedPayment && (!order.status || order.status === "attempted")) {
        await prisma.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: "FAILED",
            paymentId: failedPayment.id,
            failureReason: failedPayment.error_description || "Payment failed at gateway",
            reconciled: true,
            reconciledAt: new Date(),
          },
        });
        failed++;
        details.push({ orderId: tx.orderId, status: "FAILED", note: failedPayment.error_description || "Payment failed" });
      } else {
        // Still pending at gateway
        stillPending++;
        details.push({ orderId: tx.orderId, status: "STILL_PENDING", note: `Gateway status: ${order.status || "created"}` });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to query Razorpay";
      stillPending++;
      details.push({ orderId: tx.orderId, status: "FETCH_ERROR", note: errorMsg });
    }
  }

  return {
    success: true,
    scanned: pendingTransactions.length,
    reconciled,
    failed,
    stillPending,
    details,
  };
}

/**
 * Processes a refund on a student's fee payment.
 * Decrements student paidFee, creates a negative amount refund Payment record,
 * generates a Refund Credit PDF receipt, and emails the student/parent.
 */
export async function processRefundSuccess({
  instituteId,
  studentId,
  amount,
  reason,
  method = "Refund",
  razorpayPaymentId,
  razorpayRefundId,
  actor,
}: {
  instituteId: string;
  studentId: string;
  amount: number;
  reason: string;
  method?: string;
  razorpayPaymentId?: string;
  razorpayRefundId?: string;
  actor?: AuditActor;
}) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
    include: { course: true, batch: true },
  });

  if (!student) {
    return { ok: false, error: "Student not found" };
  }

  const refundAmount = Math.abs(Number(amount));
  if (refundAmount <= 0) {
    return { ok: false, error: "Refund amount must be greater than zero" };
  }

  const currentPaid = Number(student.paidFee || 0);
  const actualRefund = Math.min(refundAmount, currentPaid);

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        instituteId,
        studentId,
        amount: -actualRefund,
        isRefund: true,
        refundReason: reason.trim(),
        method,
        razorpayPaymentId: razorpayRefundId || (razorpayPaymentId ? `refund_${razorpayPaymentId}` : undefined),
        status: "REFUNDED",
        note: `Refund: ${reason.trim()}${razorpayRefundId ? ` (Razorpay ID: ${razorpayRefundId})` : ""}`,
      },
    }),
    prisma.student.update({
      where: { id: studentId },
      data: { paidFee: { decrement: actualRefund } },
    }),
  ]);

  if (razorpayPaymentId) {
    await prisma.paymentTransaction.updateMany({
      where: { paymentId: razorpayPaymentId },
      data: { status: "REFUNDED" },
    }).catch(() => {});
  }

  // Generate refund receipt & email asynchronously
  (async () => {
    try {
      const { createAndPersistPaymentReceipt } = await import("@/lib/receipt-generator");
      const { sendPaymentReceiptEmail } = await import("@/lib/email");
      await createAndPersistPaymentReceipt(payment.id);

      if (student.email) {
        const institute = await prisma.institute.findUnique({
          where: { id: instituteId },
          select: { name: true },
        });

        await sendPaymentReceiptEmail({
          to: student.email,
          studentName: student.name,
          amount: actualRefund,
          paymentMethod: method,
          receiptNumber: payment.id.slice(-8).toUpperCase(),
          instituteName: institute?.name || "Vidyalaya Institute",
          courseName: student.course?.name,
          isRefund: true,
          refundReason: reason.trim(),
        });
      }
    } catch (err) {
      console.error("[reconciliation] Failed to generate/email refund receipt:", err);
    }
  })();

  const auditActor = actor || { name: "Refund System", role: "SYSTEM" };
  await logAudit({
    instituteId,
    actor: auditActor,
    action: "PAYMENT_REFUNDED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { studentId, refundAmount: actualRefund, reason: reason.trim(), method },
  });

  return { ok: true, payment };
}
