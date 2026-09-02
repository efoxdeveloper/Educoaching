import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const requests = await prisma.discountRequest.findMany({
    where: {
      instituteId: ctx.instituteId,
      ...(status && status !== "ALL" ? { status: status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: { id: true, name: true, mobile: true, paidFee: true, totalFee: true },
      },
    },
  });

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    studentId,
    studentName,
    studentMobile,
    courseId,
    courseName,
    originalFee,
    discountPercent,
    finalFee,
    reason,
    requestedByRole = "FACULTY",
    requestedByName,
  } = body;

  if (!courseId || !courseName || originalFee === undefined || discountPercent === undefined) {
    return NextResponse.json({ error: "Missing required discount fields" }, { status: 400 });
  }

  const numOriginal = Number(originalFee);
  const numDiscountPct = Number(discountPercent);
  const discountAmount = Math.round(numOriginal * (numDiscountPct / 100));
  const calculatedFinalFee = finalFee !== undefined ? Number(finalFee) : Math.max(0, numOriginal - discountAmount);

  const discountRequest = await prisma.discountRequest.create({
    data: {
      instituteId: ctx.instituteId,
      studentId: studentId || null,
      studentName: String(studentName || "Prospective Student").trim(),
      studentMobile: studentMobile ? String(studentMobile).trim() : null,
      courseId,
      courseName,
      originalFee: numOriginal,
      discountPercent: numDiscountPct,
      discountAmount,
      finalFee: calculatedFinalFee,
      reason: reason ? String(reason).trim() : "Special discount requested by parents",
      requestedByRole: String(requestedByRole).toUpperCase(),
      requestedByName: requestedByName ? String(requestedByName).trim() : ctx.session?.user?.name ?? "Faculty",
      status: "PENDING",
    },
  });

  // Notify institute owner via PlatformNotification
  await prisma.platformNotification.create({
    data: {
      instituteId: ctx.instituteId,
      type: "DISCOUNT_APPROVAL_REQUEST",
      message: `🔔 Special Discount Request: ${numDiscountPct}% requested for ${studentName || "Student"} in ${courseName}. Requires Owner Approval.`,
    },
  });

  return NextResponse.json(discountRequest, { status: 201 });
}
