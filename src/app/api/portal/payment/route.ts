import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { actorFromSession } from "@/lib/audit";
import { processPaymentSuccess } from "@/lib/reconciliation";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      studentId,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      purpose = "fee",
    } = body;

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

    // Role authorization
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
      const link = await prisma.parentStudentLink.findFirst({
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

    // Reject direct credit without gateway signature verification
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Direct fee payment without gateway signature verification is not allowed. Please complete payment via the Razorpay checkout flow." },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret || keySecret.includes("your_key_secret_here")) {
      return NextResponse.json({ error: "Razorpay is not configured on the server" }, { status: 500 });
    }

    // Verify HMAC SHA256 Signature
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Payment verification failed: Signature mismatch" }, { status: 400 });
    }

    const result = await processPaymentSuccess({
      instituteId: student.instituteId,
      studentId,
      amount: payAmount,
      purpose,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      actor: actorFromSession(session),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed to process payment" }, { status: 500 });
    }

    const updatedStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    return NextResponse.json({
      ok: true,
      payment: result.payment,
      newPaidFee: updatedStudent ? Number(updatedStudent.paidFee) : undefined,
      newPending: updatedStudent ? Math.max(0, Number(updatedStudent.totalFee) - Number(updatedStudent.paidFee)) : undefined,
      student: updatedStudent,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not process fee payment. Please try again." },
      { status: 500 }
    );
  }
}
