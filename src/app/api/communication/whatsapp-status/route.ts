import { NextResponse } from "next/server";
import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { requireInstitute } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;
  return NextResponse.json({
    configured: isWhatsAppConfigured(),
    liveEnabled: process.env.ENABLE_LIVE_WHATSAPP === "true",
    hasCredentials: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM),
  });
}
