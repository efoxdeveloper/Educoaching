import { describe, it, expect } from "vitest";
import { sendCustomAlert, sendAbsentNotification, getWhatsAppWebUrl } from "@/lib/whatsapp";

describe("WhatsApp Safety & Anti-Deactivation Protection", () => {
  it("suppresses automated sends to the protected phone number 9411454931", async () => {
    const res = await sendCustomAlert("9411454931", "Test Student", "Fee Reminder");
    expect(res.sent).toBe(true);
    expect(res.simulated).toBe(true);
    expect(res.webUrl).toContain("https://wa.me/919411454931");
  });

  it("suppresses automated sends when with +91 format", async () => {
    const res = await sendAbsentNotification({
      parentMobile: "+919411454931",
      studentName: "Test Student",
      batchName: "Physics Batch",
      date: new Date("2026-08-29"),
    });
    expect(res.sent).toBe(true);
    expect(res.simulated).toBe(true);
  });

  it("generates 100% safe wa.me click-to-chat links without invoking third-party bot APIs", () => {
    const url = getWhatsAppWebUrl("9411454931", "Exam link: http://localhost:3000/exam/123");
    expect(url).toBe("https://wa.me/919411454931?text=Exam%20link%3A%20http%3A%2F%2Flocalhost%3A3000%2Fexam%2F123");
  });
});
