import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { RENEWAL_PERIOD_DAYS, QUARTERLY_RENEWAL_PERIOD_DAYS, ANNUAL_RENEWAL_PERIOD_DAYS } from "@/lib/subscription";
import { logAudit, actorFromSession } from "@/lib/audit";
import type { SubscriptionPlan } from "@prisma/client";

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { studentId, amount, method, note, planType = "MONTHLY" } = body;

  if (!studentId || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({ where: { id: studentId, instituteId: ctx.instituteId, branchId: ctx.branchId } });
  if (!student) return NextResponse.json({ error: "Student not found for this branch" }, { status: 404 });

  const now = new Date();
  const base =
    student.currentPeriodEnd && new Date(student.currentPeriodEnd) > now
      ? new Date(student.currentPeriodEnd)
      : now;

  const validFrom = now;
  const validUntil = new Date(base);
  
  const periodDays =
    planType === "QUARTERLY"
      ? QUARTERLY_RENEWAL_PERIOD_DAYS
      : planType === "ANNUAL"
      ? ANNUAL_RENEWAL_PERIOD_DAYS
      : RENEWAL_PERIOD_DAYS;

  validUntil.setDate(validUntil.getDate() + periodDays);

  const newPlan: SubscriptionPlan = planType === "QUARTERLY" ? "QUARTERLY" : "MONTHLY";

  const [renewal, updatedStudent] = await prisma.$transaction([
    prisma.renewal.create({
      data: {
        instituteId: ctx.instituteId,
        studentId,
        amount,
        method: method || "Cash",
        planType: planType || "MONTHLY",
        note: note || null,
        validFrom,
        validUntil,
      },
    }),
    prisma.student.update({
      where: { id: studentId },
      data: {
        plan: newPlan,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: validUntil,
        ...(planType === "QUARTERLY"
          ? { quarterlyAmount: amount }
          : { monthlyAmount: amount }),
      },
    }),
  ]);

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "RENEWAL_RECORDED",
    entityType: "Renewal",
    entityId: renewal.id,
    metadata: { studentId, amount: Number(amount), method: method || "Cash", validUntil },
  });

  return NextResponse.json({ renewal, student: updatedStudent }, { status: 201 });
}