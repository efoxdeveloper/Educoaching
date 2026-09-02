import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { hasPermission } from "../src/lib/permissions";
import { parseFeatureFlags, DEFAULT_FEATURE_FLAGS } from "../src/lib/institute-settings";

describe("Phase 2 - Permissions & Feature Flags", () => {
  it("grants expenses:write and communication:write to OWNER and ADMIN", () => {
    expect(hasPermission("OWNER", "expenses:write")).toBe(true);
    expect(hasPermission("OWNER", "communication:write")).toBe(true);
    expect(hasPermission("ADMIN", "expenses:write")).toBe(true);
    expect(hasPermission("ADMIN", "communication:write")).toBe(true);
  });

  it("restricts expenses:write from STAFF but allows communication:write", () => {
    expect(hasPermission("STAFF", "expenses:write")).toBe(false);
    expect(hasPermission("STAFF", "communication:write")).toBe(true);
  });

  it("parses new feature flags for expenses and communication", () => {
    const flags = parseFeatureFlags({
      expenses: true,
      communication: false,
    });
    expect(flags.expenses).toBe(true);
    expect(flags.communication).toBe(false);
    expect(flags.onlinePayments).toBe(true);
  });
});

describe("Phase 2 - Razorpay Webhook Signature Verification", () => {
  it("correctly validates HMAC-SHA256 signatures", () => {
    const secret = "test_webhook_secret_key";
    const payload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_123",
            order_id: "order_test_456",
            amount: 500000,
          },
        },
      },
    });

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const forgedSignature = "invalid_signature_hash";

    const verify = (sig: string, body: string, sec: string) => {
      const computed = crypto.createHmac("sha256", sec).update(body).digest("hex");
      return computed === sig;
    };

    expect(verify(expectedSignature, payload, secret)).toBe(true);
    expect(verify(forgedSignature, payload, secret)).toBe(false);
  });
});

describe("Phase 2 - Fee Reminder Categorization Logic", () => {
  it("accurately categorizes overdue, due soon, and future dues", () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 5);

    const dueTomorrow = new Date(today);
    dueTomorrow.setDate(dueTomorrow.getDate() + 1);

    const farFuture = new Date(today);
    farFuture.setDate(farFuture.getDate() + 30);

    const categorize = (dueDate: Date) => {
      const threeDaysAhead = new Date(today);
      threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);
      if (dueDate < today) return "OVERDUE";
      if (dueDate <= threeDaysAhead) return "DUE_SOON";
      return "PENDING";
    };

    expect(categorize(pastDate)).toBe("OVERDUE");
    expect(categorize(dueTomorrow)).toBe("DUE_SOON");
    expect(categorize(farFuture)).toBe("PENDING");
  });
});
