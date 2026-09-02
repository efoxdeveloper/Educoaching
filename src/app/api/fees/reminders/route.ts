import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { actorFromSession } from "@/lib/audit";
import { getFeeReminderCandidates, dispatchFeeReminders } from "@/lib/fee-reminders";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const [candidates, recentLogs] = await Promise.all([
    getFeeReminderCandidates(ctx.instituteId),
    prisma.feeReminderLog.findMany({
      where: { instituteId: ctx.instituteId },
      include: {
        student: { select: { name: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 50,
    }),
  ]);

  const overdueCount = candidates.filter((c) => c.status === "OVERDUE").length;
  const dueSoonCount = candidates.filter((c) => c.status === "DUE_SOON").length;
  const totalDue = candidates.reduce((sum, c) => sum + c.dueAmount, 0);

  return NextResponse.json({
    candidates,
    recentLogs,
    stats: {
      totalCandidates: candidates.length,
      overdueCount,
      dueSoonCount,
      totalDue,
    },
  });
}

export async function POST(req: Request) {
  const ctx = await requirePermission("payments:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const { studentIds, channel = "ALL", filter = "ALL" } = body;

  const result = await dispatchFeeReminders({
    instituteId: ctx.instituteId,
    studentIds,
    channel,
    filter,
    actor: actorFromSession(ctx.session),
  });

  return NextResponse.json(result);
}
