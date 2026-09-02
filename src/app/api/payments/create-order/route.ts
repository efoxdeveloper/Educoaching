import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { amount, studentId, purpose } = body as { amount: number; studentId: string; purpose: "fee" | "renewal" };

  if (!amount || amount <= 0 || !studentId || !purpose) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, email: true, instituteId: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Authorization enforcement
  const role = (session.user as { role?: string })?.role;
  const userEmail = session.user.email;
  const userId = (session.user as { id?: string })?.id;

  if (role === "STUDENT") {
    const isSelf = student.id === userId || (student.email && student.email.toLowerCase() === userEmail?.toLowerCase());
    if (!isSelf) {
      return NextResponse.json({ error: "Forbidden: You cannot pay fees for another student." }, { status: 403 });
    }
  } else if (role === "PARENT") {
    if (!userId) {
      return NextResponse.json({ error: "Forbidden: Missing parent identity" }, { status: 403 });
    }
    const link = await (prisma as any).parentStudentLink.findFirst({
      where: { parentUserId: userId, studentId },
    });
    if (!link) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to pay fees for this student." }, { status: 403 });
    }
  } else if (role === "OWNER" || role === "ADMIN" || role === "STAFF" || role === "ACCOUNTANT") {
    const instituteId = (session.user as { instituteId?: string | null })?.instituteId;
    if (instituteId && student.instituteId !== instituteId) {
      return NextResponse.json({ error: "Forbidden: Student does not belong to your institute." }, { status: 403 });
    }
  } else if (role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Unauthorized role." }, { status: 403 });
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
