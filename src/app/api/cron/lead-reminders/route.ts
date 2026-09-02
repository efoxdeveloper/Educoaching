import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchLeadReminders } from "@/lib/lead-reminders";

export async function POST(req: Request) {
  // Verify cron secret if configured
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
  }

  // Fetch all active institutes
  const institutes = await prisma.institute.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const results: Array<{ instituteId: string; name: string; result: unknown }> = [];

  for (const inst of institutes) {
    try {
      const res = await dispatchLeadReminders({
        instituteId: inst.id,
        channel: "ALL",
        actor: { name: "Automated Daily Cron", role: "CRON" },
      });
      results.push({ instituteId: inst.id, name: inst.name, result: res });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.push({ instituteId: inst.id, name: inst.name, result: { error: errorMsg } });
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    institutesProcessed: institutes.length,
    results,
  });
}

export async function GET(req: Request) {
  // Support GET invocation for easy health checks / standard HTTP cron services
  return POST(req);
}
