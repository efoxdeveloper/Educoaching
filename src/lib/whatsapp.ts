import { toE164, toWhatsAppAddress, getWhatsAppWebUrl } from "./whatsapp-link";
export { toE164, toWhatsAppAddress, getWhatsAppWebUrl };

// Strict Safety Guard:
// Automated Twilio sandbox messages trigger Meta / WhatsApp spam detectors,
// which causes personal WhatsApp accounts to be flagged or deactivated.
// Live WhatsApp dispatch is DISABLED by default.
const ENABLE_LIVE_WHATSAPP = process.env.ENABLE_LIVE_WHATSAPP === "true";

// Blacklist personal phone numbers from ever receiving automated bot pings
const PROTECTED_PHONE_PATTERNS = ["9411454931", "+919411454931"];

export function isWhatsAppConfigured() {
  return !!(
    ENABLE_LIVE_WHATSAPP &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM &&
    !process.env.TWILIO_ACCOUNT_SID.includes("your_account_sid_here")
  );
}

function getClient() {
  const twilio = require("twilio");
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Send WhatsApp notification safely.
 * If live dispatch is disabled (default) or the recipient is a protected number,
 * it runs in Safe Simulation Mode and logs the notification.
 */
async function sendWhatsApp(to: string, message: string) {
  const normalized = to.replace(/[\s-()]/g, "");

  // Always protect the user's personal number
  if (PROTECTED_PHONE_PATTERNS.some((p) => normalized.includes(p))) {
    console.warn(`[whatsapp:safe-mode] Suppressed automated message to protected number ${to} to prevent WhatsApp account deactivation.`);
    return { sent: true, simulated: true, webUrl: getWhatsAppWebUrl(to, message) };
  }

  if (!isWhatsAppConfigured()) {
    console.log(`[whatsapp:safe-mode] Automated Twilio send suppressed for ${to}. Message: "${message}"`);
    return { sent: true, simulated: true, webUrl: getWhatsAppWebUrl(to, message) };
  }

  try {
    const client = getClient();
    const body = message;
    await client.messages.create({
      body,
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toWhatsAppAddress(to),
    });
    return { sent: true };
  } catch (err) {
    console.error("[whatsapp] Failed to send:", err);
    return { sent: false, reason: "send_error" as const };
  }
}

export async function sendAbsentNotification(params: {
  parentMobile: string;
  studentName: string;
  batchName: string;
  date: Date;
}) {
  const { parentMobile, studentName, batchName, date } = params;
  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const message = `Dear Parent, this is to notify you that ${studentName} was marked ABSENT today (${dateStr}) in batch "${batchName}". Please contact the institute if you have any questions.`;
  return sendWhatsApp(parentMobile, message);
}

export async function sendLateNotification(params: {
  parentMobile: string;
  studentName: string;
  batchName: string;
  date: Date;
}) {
  const { parentMobile, studentName, batchName, date } = params;
  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const message = `Dear Parent, this is to notify you that ${studentName} arrived LATE today (${dateStr}) for batch "${batchName}".`;
  return sendWhatsApp(parentMobile, message);
}

export async function sendFeeReminder(parentMobile: string, studentName: string, dueAmount: number, dueDate?: string | null) {
  const message = `Dear Parent, this is a reminder regarding the pending fee of ₹${dueAmount.toLocaleString("en-IN")} for ${studentName}${dueDate ? ` (Due date: ${dueDate})` : ""}. Kindly ensure timely clearance of the balance dues.`;
  return sendWhatsApp(parentMobile, message);
}

export async function sendCustomAlert(parentMobile: string, studentName: string, note: string) {
  const message = `Dear Parent, update regarding ${studentName}: ${note}`;
  return sendWhatsApp(parentMobile, message);
}

export async function sendLeadFollowUpReminder(params: {
  counsellorMobile: string;
  counsellorName: string;
  instituteName: string;
  leadsCount: number;
  leadsSummary: string;
}) {
  const { counsellorMobile, counsellorName, instituteName, leadsCount, leadsSummary } = params;
  const message = `Hello ${counsellorName}, you have ${leadsCount} lead follow-up(s) due today at ${instituteName}:\n\n${leadsSummary}\n\nPlease check your Admissions CRM to complete these follow-ups.`;
  return sendWhatsApp(counsellorMobile, message);
}

export async function sendSupportTicketWhatsAppReply(params: { to: string; ticketId: string; message: string }) {
  const { to, ticketId, message } = params;
  // IMPORTANT: WhatsApp sandbox currently only accepts pre-approved template pattern
  // (see TEMPORARY workaround comment above). Support ticket replies are free-form
  // and will NOT match the sandbox "Your appointment is coming up on..." pattern.
  // In production, you need a real approved WhatsApp template for support replies
  // or an upgraded Twilio WhatsApp sender (not sandbox). We still attempt send via
  // sendWhatsApp which will log/safe-mode if not configured.
  const fullMessage = `Support Ticket #${ticketId.slice(-6).toUpperCase()} reply: ${message}\n\n— Vidyalaya Support`;
  if (!isWhatsAppConfigured()) {
    console.warn(`[whatsapp:support] WhatsApp not configured — ticket ${ticketId} reply would have been sent to ${to}: "${fullMessage}" — requires approved template / upgraded sender for free-form replies.`);
  }
  return sendWhatsApp(to, fullMessage);
}