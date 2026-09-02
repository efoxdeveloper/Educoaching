import { prisma } from "@/lib/prisma";
import { parseInstituteSettings, type SmsProviderType } from "@/lib/institute-settings";
import { decrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

export interface SmsSendParams {
  to: string; // e.g. "9876543210" or "919876543210"
  senderId: string; // DLT sender ID e.g. "VIDYAL"
  apiKey: string; // Decrypted API key
  templateId?: string; // DLT Template ID
  variables: Record<string, string>;
  message?: string;
}

export interface SmsProvider {
  send(params: SmsSendParams): Promise<{ sent: boolean; reason?: string; responseDetails?: unknown }>;
}

/**
 * MSG91 Flow / Transactional SMS Implementation
 */
export class MSG91Provider implements SmsProvider {
  async send({ to, senderId, apiKey, templateId, variables, message }: SmsSendParams) {
    try {
      // Normalize mobile to 12-digit Indian format (e.g. 919876543210)
      const cleanPhone = to.replace(/[^0-9]/g, "");
      const formattedTo = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      // MSG91 Flow API
      if (templateId) {
        const payload: Record<string, unknown> = {
          template_id: templateId,
          short_url: "0",
          recipients: [
            {
              mobiles: formattedTo,
              ...variables,
            },
          ],
        };
        if (senderId) payload.sender = senderId;

        const res = await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authkey: apiKey,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data && data.type === "error")) {
          const reason = data.message || `MSG91 HTTP Error: ${res.statusText}`;
          return { sent: false, reason, responseDetails: data };
        }

        return { sent: true, responseDetails: data };
      }

      // Direct SMS payload if templateId not set
      const url = new URL("https://api.msg91.com/api/v2/sendsms");
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: apiKey,
        },
        body: JSON.stringify({
          sender: senderId,
          route: "4",
          country: "91",
          sms: [
            {
              message: message || "Your verification code is received.",
              to: [formattedTo],
            },
          ],
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.type === "error")) {
        return { sent: false, reason: data.message || "Failed to deliver via MSG91", responseDetails: data };
      }

      return { sent: true, responseDetails: data };
    } catch (err: unknown) {
      return { sent: false, reason: err instanceof Error ? err.message : "MSG91 Network dispatch failed" };
    }
  }
}

/**
 * Textlocal India API Implementation
 */
export class TextlocalProvider implements SmsProvider {
  async send({ to, senderId, apiKey, message }: SmsSendParams) {
    try {
      const cleanPhone = to.replace(/[^0-9]/g, "");
      const formattedTo = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const params = new URLSearchParams();
      params.append("apikey", apiKey);
      params.append("numbers", formattedTo);
      params.append("message", message || "Alert from institute.");
      if (senderId) params.append("sender", senderId);

      const res = await fetch("https://api.textlocal.in/send/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = await res.json().catch(() => ({}));
      if (data.status === "failure") {
        const errorMsg =
          data.errors?.map((e: { message?: string }) => e.message || "Error").join(", ") ||
          "Textlocal delivery failed";
        return { sent: false, reason: errorMsg, responseDetails: data };
      }

      return { sent: true, responseDetails: data };
    } catch (err: unknown) {
      return { sent: false, reason: err instanceof Error ? err.message : "Textlocal Network dispatch failed" };
    }
  }
}

/**
 * Fast2SMS API Implementation
 */
export class Fast2SMSProvider implements SmsProvider {
  async send({ to, senderId, apiKey, templateId, message, variables }: SmsSendParams) {
    try {
      const cleanPhone = to.replace(/[^0-9]/g, "");
      const tenDigitPhone = cleanPhone.length === 12 && cleanPhone.startsWith("91") ? cleanPhone.slice(2) : cleanPhone;

      // Fast2SMS DLT Route
      if (templateId) {
        const varValues = Object.values(variables).join("|");
        const payload = {
          route: "dlt",
          sender_id: senderId,
          message: templateId,
          variables_values: varValues || "Notification",
          numbers: tenDigitPhone,
        };

        const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: apiKey,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.return === false) {
          const reason = Array.isArray(data.message) ? data.message.join(", ") : data.message || "Fast2SMS error";
          return { sent: false, reason, responseDetails: data };
        }

        return { sent: true, responseDetails: data };
      }

      // Quick transactional/OTP route
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: apiKey,
        },
        body: JSON.stringify({
          route: "q",
          message: message || "Alert from institute.",
          language: "english",
          flash: 0,
          numbers: tenDigitPhone,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.return === false) {
        const reason = Array.isArray(data.message) ? data.message.join(", ") : data.message || "Fast2SMS error";
        return { sent: false, reason, responseDetails: data };
      }

      return { sent: true, responseDetails: data };
    } catch (err: unknown) {
      return { sent: false, reason: err instanceof Error ? err.message : "Fast2SMS Network dispatch failed" };
    }
  }
}

/**
 * Factory for creating SMS Provider instances.
 */
export function getSmsProvider(providerType: SmsProviderType): SmsProvider {
  switch (providerType) {
    case "MSG91":
      return new MSG91Provider();
    case "TEXTLOCAL":
      return new TextlocalProvider();
    case "FAST2SMS":
      return new Fast2SMSProvider();
    default:
      throw new Error(`Unsupported SMS provider: ${providerType}`);
  }
}

/**
 * Sends a real SMS using the institute's own decrypted BYOK credentials.
 * If smsConfig is missing, disabled, or unconfigured, returns { sent: false, reason: "not_configured" } immediately.
 */
export async function sendInstituteSms(
  instituteId: string,
  {
    to,
    templateName,
    variables = {},
    message,
  }: {
    to: string;
    templateName?: string;
    variables?: Record<string, string>;
    message?: string;
  }
): Promise<{ sent: boolean; reason?: string }> {
  // Fail safe: clean check
  if (!to || !to.trim()) {
    return { sent: false, reason: "missing_recipient_mobile" };
  }

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { settings: true, name: true },
  });

  if (!institute) {
    return { sent: false, reason: "institute_not_found" };
  }

  const settings = parseInstituteSettings(institute.settings);
  const smsConfig = settings.smsConfig;

  // Fail safe: default-off, explicit opt-in
  if (!smsConfig || !smsConfig.enabled || !smsConfig.apiKeyEncrypted) {
    return { sent: false, reason: "not_configured" };
  }

  let decryptedApiKey: string;
  try {
    decryptedApiKey = decrypt(smsConfig.apiKeyEncrypted);
  } catch (err) {
    console.error(`[SMS] Failed to decrypt API key for institute ${instituteId}:`, err);
    return { sent: false, reason: "encryption_decryption_failed" };
  }

  // Lookup DLT template ID
  let templateId: string | undefined = undefined;
  if (templateName && smsConfig.dltTemplateIds) {
    templateId = smsConfig.dltTemplateIds[templateName] || templateName;
  }

  const provider = getSmsProvider(smsConfig.provider);

  const result = await provider.send({
    to,
    senderId: smsConfig.senderId,
    apiKey: decryptedApiKey,
    templateId,
    variables,
    message,
  });

  // Strict audit trail: records which institute's BYOK credentials were used
  await logAudit({
    instituteId,
    action: "SMS_DISPATCHED",
    entityType: "SmsGateway",
    entityId: smsConfig.provider,
    metadata: {
      provider: smsConfig.provider,
      senderId: smsConfig.senderId,
      recipient: to.slice(0, 4) + "****" + to.slice(-2),
      templateName: templateName || null,
      sent: result.sent,
      reason: result.reason || null,
    },
  });

  return result;
}
