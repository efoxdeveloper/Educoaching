import { NextResponse } from "next/server";
import { processSubscriptionExpiryReminders } from "@/lib/subscription-reminders";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Verify cron secret if configured
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
  }

  try {
    const result = await processSubscriptionExpiryReminders();
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Support GET invocation for easy health checks / standard HTTP cron runners
  return POST(req);
}
