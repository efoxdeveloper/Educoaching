import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const role = String((ctx.session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN" && role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Only the Institute Owner or Admin can approve/reject discounts" }, { status: 403 });
  }

  const discountRequest = await prisma.discountRequest.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!discountRequest) {
    return NextResponse.json({ error: "Discount request not found" }, { status: 404 });
  }

  const body = await req.json();
  const { action, decisionNotes } = body; // action: "APPROVE" | "REJECT"

  if (!action || (action !== "APPROVE" && action !== "REJECT")) {
    return NextResponse.json({ error: "Invalid action. Must be 'APPROVE' or 'REJECT'" }, { status: 400 });
  }

  const isApproved = action === "APPROVE";
  const now = new Date();
  const approverName = ctx.session?.user?.name ?? "Institute Owner";

  const updatedRequest = await prisma.discountRequest.update({
    where: { id: params.id },
    data: {
      status: isApproved ? "APPROVED" : "REJECTED",
      decisionAt: now,
      decisionByName: approverName,
      decisionNotes: decisionNotes ? String(decisionNotes).trim() : null,
    },
  });

  // If this request is tied to an enrolled student, update student records
  if (discountRequest.studentId) {
    if (isApproved) {
      await prisma.student.update({
        where: { id: discountRequest.studentId },
        data: {
          discountApprovalStatus: "APPROVED",
          discountPercent: discountRequest.discountPercent,
          totalFee: discountRequest.finalFee,
        },
      });
    } else {
      await prisma.student.update({
        where: { id: discountRequest.studentId },
        data: {
          discountApprovalStatus: "REJECTED",
        },
      });
    }
  }

  // Create notification
  await prisma.platformNotification.create({
    data: {
      instituteId: ctx.instituteId,
      type: isApproved ? "DISCOUNT_APPROVED" : "DISCOUNT_REJECTED",
      message: isApproved
        ? `✅ Special discount of ${discountRequest.discountPercent}% for ${discountRequest.studentName} was ALLOWED by ${approverName}.`
        : `❌ Special discount of ${discountRequest.discountPercent}% for ${discountRequest.studentName} was NOT ALLOWED by ${approverName}.`,
    },
  });

  return NextResponse.json(updatedRequest);
}
