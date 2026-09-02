import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPaymentToInstallments, type FeeInstallment } from "@/lib/installments";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, amount, method, installmentNumber, installmentTitle, note } = body;

    const payAmount = Number(amount);
    if (!studentId || Number.isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json(
        { error: "A valid student ID and positive payment amount are required." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { course: true, branch: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student record not found." }, { status: 404 });
    }

    const totalFee = Number(student.totalFee);
    const currentPaid = Number(student.paidFee);
    const outstanding = Math.max(0, totalFee - currentPaid);

    if (payAmount > outstanding && outstanding > 0) {
      return NextResponse.json(
        { error: `Payment amount (₹${payAmount}) exceeds outstanding balance (₹${outstanding}).` },
        { status: 400 }
      );
    }

    const instNum =
      installmentNumber !== undefined && installmentNumber !== null && installmentNumber !== ""
        ? Number(installmentNumber)
        : null;

    // Record the payment
    const payment = await prisma.payment.create({
      data: {
        instituteId: student.instituteId,
        studentId: student.id,
        amount: payAmount,
        method: method || "UPI",
        note: note ? String(note).trim() : `Student Portal Self-Payment via ${method || "UPI"}`,
        installmentNumber: instNum,
        installmentTitle: installmentTitle || (instNum ? `Installment ${instNum}` : "Course Fee Payment"),
      },
    });

    // Check if student has an installment plan and apply payment
    let updatedInstallmentJson = student.installmentPlan;
    let nextDueDate: Date | null | undefined = undefined;

    if (student.installmentPlan && Array.isArray(student.installmentPlan)) {
      const installments = student.installmentPlan as unknown as FeeInstallment[];
      const result = applyPaymentToInstallments(installments, payAmount, instNum || undefined);
      updatedInstallmentJson = result.updatedInstallments as any;
      if (result.nextDueDate) {
        nextDueDate = new Date(result.nextDueDate);
      }
    }

    const newPaidFee = currentPaid + payAmount;
    const newPending = Math.max(0, totalFee - newPaidFee);

    await prisma.student.update({
      where: { id: student.id },
      data: {
        paidFee: { increment: payAmount },
        ...(updatedInstallmentJson ? { installmentPlan: updatedInstallmentJson as any } : {}),
        ...(nextDueDate !== undefined ? { dueDate: nextDueDate } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
        installmentNumber: payment.installmentNumber,
        installmentTitle: payment.installmentTitle,
      },
      newPaidFee,
      newPending,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not process fee payment. Please try again." },
      { status: 500 }
    );
  }
}
