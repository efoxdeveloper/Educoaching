import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import {
  parseInstituteSettings,
  toPublicSmsConfig,
  type SmsProviderType,
} from "@/lib/institute-settings";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { settings: true },
  });

  const parsed = parseInstituteSettings(institute?.settings);
  const publicConfig = toPublicSmsConfig(parsed.smsConfig);

  return NextResponse.json(publicConfig);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("institute:manage");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const {
    provider,
    senderId,
    apiKey,
    dltTemplateIds = {},
    enabled = false,
  } = body as {
    provider?: SmsProviderType;
    senderId?: string;
    apiKey?: string;
    dltTemplateIds?: Record<string, string>;
    enabled?: boolean;
  };

  const validProviders: SmsProviderType[] = ["MSG91", "TEXTLOCAL", "FAST2SMS"];
  if (provider && !validProviders.includes(provider)) {
    return NextResponse.json(
      { error: "Invalid SMS provider. Must be MSG91, TEXTLOCAL, or FAST2SMS." },
      { status: 400 }
    );
  }

  // Load existing settings
  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { settings: true },
  });

  const currentSettings = parseInstituteSettings(institute?.settings);
  const existingSmsConfig = currentSettings.smsConfig;

  let apiKeyEncrypted = existingSmsConfig?.apiKeyEncrypted;

  // If a new API key is provided, encrypt it
  if (apiKey && apiKey.trim()) {
    try {
      apiKeyEncrypted = encrypt(apiKey.trim());
    } catch (err) {
      console.error("[sms-config] Encryption error:", err);
      return NextResponse.json(
        { error: "Failed to securely encrypt API key. Verify server encryption key configuration." },
        { status: 500 }
      );
    }
  }

  if (enabled && !apiKeyEncrypted) {
    return NextResponse.json(
      { error: "Cannot enable SMS Gateway without providing a valid API key." },
      { status: 400 }
    );
  }

  const updatedSmsConfig = {
    provider: provider || existingSmsConfig?.provider || "MSG91",
    senderId: senderId !== undefined ? senderId.trim() : existingSmsConfig?.senderId || "",
    apiKeyEncrypted,
    dltTemplateIds: dltTemplateIds || existingSmsConfig?.dltTemplateIds || {},
    enabled: Boolean(enabled),
  };

  const updatedSettings = {
    ...currentSettings,
    smsConfig: updatedSmsConfig,
  };

  await prisma.institute.update({
    where: { id: ctx.instituteId },
    data: {
      settings: updatedSettings as object,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "INSTITUTE_SMS_CONFIG_UPDATED",
    entityType: "Institute",
    entityId: ctx.instituteId,
    metadata: {
      provider: updatedSmsConfig.provider,
      senderId: updatedSmsConfig.senderId,
      enabled: updatedSmsConfig.enabled,
      keyUpdated: Boolean(apiKey && apiKey.trim()),
    },
  });

  return NextResponse.json({
    success: true,
    config: toPublicSmsConfig(updatedSmsConfig),
  });
}
