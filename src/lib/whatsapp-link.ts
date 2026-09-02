/**
 * Browser-safe WhatsApp link & phone formatting utilities.
 * Zero Node.js / Twilio dependencies so this can be imported in client components safely.
 */

export function toE164(mobile: string) {
  const digitsOnly = mobile.replace(/[\s-()]/g, "");
  if (digitsOnly.startsWith("+")) return digitsOnly;
  if (digitsOnly.length === 10) return `+91${digitsOnly}`;
  return `+${digitsOnly}`;
}

export function toWhatsAppAddress(mobile: string) {
  return `whatsapp:${toE164(mobile)}`;
}

/**
 * Generate a 100% safe direct WhatsApp Web / Mobile chat link (https://wa.me/...)
 * Opens directly in the user's WhatsApp without using bot APIs.
 */
export function getWhatsAppWebUrl(mobile: string, message: string): string {
  const cleanNumber = toE164(mobile).replace("+", "");
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
