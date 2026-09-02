import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { applyPaymentToInstallments, type FeeInstallment } from "@/lib/installments";

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { studentId, amount, method, note, installmentNumber, installmentTitle } = body;

  if (!studentId || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({ where: { id: studentId, instituteId: ctx.instituteId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const instNum = installmentNumber !== undefined && installmentNumber !== null && installmentNumber !== ""
    ? Number(installmentNumber)
    : null;

  // Check if institute has GST enabled
  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
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

  const payment = await prisma.payment.create({
    data: {
      instituteId: ctx.instituteId,
      studentId,
      amount,
      baseAmount,
      gstAmount,
      gstPercent,
      method: method || "Cash",
      note: note || null,
      installmentNumber: instNum,
      installmentTitle: installmentTitle || null,
    },
  });

  // Check if student has an installment plan
  let updatedInstallmentJson = student.installmentPlan;
  let nextDueDate: Date | null | undefined = undefined;

  if (student.installmentPlan && Array.isArray(student.installmentPlan)) {
    const installments = student.installmentPlan as unknown as FeeInstallment[];
    const result = applyPaymentToInstallments(
      installments,
      Number(amount),
      instNum ? instNum : undefined
    );
    updatedInstallmentJson = result.updatedInstallments as any;
    if (result.nextDueDate) {
      nextDueDate = new Date(result.nextDueDate);
    }
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      paidFee: { increment: Number(amount) },
      ...(updatedInstallmentJson ? { installmentPlan: updatedInstallmentJson as any } : {}),
      ...(nextDueDate !== undefined ? { dueDate: nextDueDate } : {}),
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "PAYMENT_RECORDED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      studentId,
      amount: Number(amount),
      method: method || "Cash",
      installmentNumber: instNum,
      installmentTitle: installmentTitle || null,
    },
  });

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
          paymentMethod: method || "Cash",
          receiptNumber: payment.id.slice(-8).toUpperCase(),
          instituteName: institute?.name || "Vidyalaya Institute",
        });
      }
    } catch (receiptErr) {
      console.error("[payments] Failed to generate/email payment receipt:", receiptErr);
    }
  })();

  return NextResponse.json(payment, { status: 201 });
}