import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { amount, studentId, purpose } = body as { amount: number; studentId: string; purpose: "fee" | "renewal" };

  if (!amount || amount <= 0 || !studentId || !purpose) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, instituteId: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: "INR",
      receipt: `${purpose}_${studentId}_${Date.now()}`.slice(0, 40),
      notes: { studentId, purpose, instituteId: student.instituteId },
    });

    // Record pending transaction for tracking & reconciliation
    await prisma.paymentTransaction.create({
      data: {
        instituteId: student.instituteId,
        studentId,
        amount,
        purpose,
        orderId: order.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
