import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { parseInstituteSettings, type SmsProviderType } from "@/lib/institute-settings";
import { getSmsProvider } from "@/lib/sms";
import { decrypt } from "@/lib/crypto";

export async function POST(req: Request) {
  const ctx = await requirePermission("institute:manage");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const {
    mobile,
    provider: customProvider,
    senderId: customSenderId,
    apiKey: customApiKey,
    message = "Test SMS from your institute portal. SMS gateway configured successfully!",
  } = body as {
    mobile?: string;
    provider?: SmsProviderType;
    senderId?: string;
    apiKey?: string;
    message?: string;
  };

  if (!mobile || !mobile.trim()) {
    return NextResponse.json({ error: "Please provide a recipient mobile number to send the test SMS." }, { status: 400 });
  }

  // Load existing settings
  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { settings: true, name: true },
  });

  const currentSettings = parseInstituteSettings(institute?.settings);
  const existingSmsConfig = currentSettings.smsConfig;

  const providerType = customProvider || existingSmsConfig?.provider || "MSG91";
  const senderId = customSenderId !== undefined ? customSenderId.trim() : existingSmsConfig?.senderId || "";

  let apiKey = customApiKey?.trim();
  if (!apiKey) {
    if (existingSmsConfig?.apiKeyEncrypted) {
      try {
        apiKey = decrypt(existingSmsConfig.apiKeyEncrypted);
      } catch {
        return NextResponse.json(
          { error: "Failed to decrypt saved API key. Please re-enter your API key and try again." },
          { status: 500 }
        );
      }
    }
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key found. Please enter your SMS provider API key before sending a test SMS." },
      { status: 400 }
    );
  }

  try {
    const providerInstance = getSmsProvider(providerType);
    const result = await providerInstance.send({
      to: mobile.trim(),
      senderId,
      apiKey,
      message,
      variables: {
        institute_name: institute?.name || "Institute",
        name: "Test User",
      },
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          success: false,
          reason: result.reason || "Provider rejected the test SMS dispatch.",
          error: result.reason,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test SMS dispatched successfully via ${providerType} to ${mobile.trim()}!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during test SMS dispatch";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
