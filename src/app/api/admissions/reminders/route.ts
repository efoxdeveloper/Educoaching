import { NextResponse } from "next/server";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { actorFromSession } from "@/lib/audit";
import { getLeadReminderCandidates, dispatchLeadReminders } from "@/lib/lead-reminders";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const candidates = await getLeadReminderCandidates(ctx.instituteId);
  const overdueCount = candidates.filter((c) => c.isOverdue).length;
  const todayCount = candidates.filter((c) => c.isToday).length;

  return NextResponse.json({
    candidates,
    stats: {
      totalCandidates: candidates.length,
      overdueCount,
      todayCount,
    },
  });
}

export async function POST(req: Request) {
  const ctx = await requirePermission("admissions:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const { channel = "ALL" } = body;

  const result = await dispatchLeadReminders({
    instituteId: ctx.instituteId,
    channel,
    actor: actorFromSession(ctx.session),
  });

  return NextResponse.json(result);
}
