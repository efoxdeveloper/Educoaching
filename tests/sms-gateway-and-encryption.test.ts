import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";
import { toPublicSmsConfig, type InstituteSmsConfig } from "@/lib/institute-settings";
import { sendInstituteSms, MSG91Provider, TextlocalProvider, Fast2SMSProvider } from "@/lib/sms";
import { prisma } from "@/lib/prisma";

describe("BYOK SMS Gateway & AES-256-GCM Encryption Test Suite", () => {
  const originalEnv = process.env.CREDENTIAL_ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a known 32-byte key (64 hex characters)
    process.env.CREDENTIAL_ENCRYPTION_KEY =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  });

  afterEach(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe("1. AES-256-GCM Encryption / Decryption Utility", () => {
    it("round-trips plaintext correctly", () => {
      const plaintext = "msg91_live_auth_secret_key_1234567890";
      const ciphertext = encrypt(plaintext);

      expect(typeof ciphertext).toBe("string");
      expect(ciphertext).not.toBe(plaintext);
      expect(ciphertext.split(":").length).toBe(3); // iv:authTag:encrypted

      const decrypted = decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it("produces non-deterministic ciphertext for the same plaintext across calls (unique IVs)", () => {
      const plaintext = "my_secret_textlocal_key";
      const cipher1 = encrypt(plaintext);
      const cipher2 = encrypt(plaintext);

      expect(cipher1).not.toBe(cipher2); // Unique IV per call
      expect(decrypt(cipher1)).toBe(plaintext);
      expect(decrypt(cipher2)).toBe(plaintext);
    });

    it("fails loudly if CREDENTIAL_ENCRYPTION_KEY is missing", () => {
      delete process.env.CREDENTIAL_ENCRYPTION_KEY;
      expect(() => encrypt("secret")).toThrow(/Missing required environment variable/i);
      expect(() => decrypt("iv:tag:data")).toThrow(/Missing required environment variable/i);
    });

    it("throws an error when tampering with ciphertext or auth tag", () => {
      const ciphertext = encrypt("authentic_data");
      const [iv, tag, data] = ciphertext.split(":");

      // Tamper with ciphertext data
      const tamperedData = data.slice(0, -2) + (data.endsWith("a") ? "b" : "a");
      const tamperedCipher = `${iv}:${tag}:${tamperedData}`;

      expect(() => decrypt(tamperedCipher)).toThrow();
    });
  });

  describe("2. Public Serialization & Redaction (API Key Leak Prevention)", () => {
    it("never includes apiKeyEncrypted in public config and sets isConfigured accurately", () => {
      const configuredConfig: InstituteSmsConfig = {
        provider: "MSG91",
        senderId: "VIDYAL",
        apiKeyEncrypted: encrypt("secret_api_key"),
        dltTemplateIds: { GENERAL_BROADCAST: "123456789" },
        enabled: true,
      };

      const publicConfig = toPublicSmsConfig(configuredConfig);

      // Verify strict redaction
      expect((publicConfig as any).apiKeyEncrypted).toBeUndefined();
      expect((publicConfig as any).apiKey).toBeUndefined();
      expect(publicConfig.provider).toBe("MSG91");
      expect(publicConfig.senderId).toBe("VIDYAL");
      expect(publicConfig.dltTemplateIds).toEqual({ GENERAL_BROADCAST: "123456789" });
      expect(publicConfig.enabled).toBe(true);
      expect(publicConfig.isConfigured).toBe(true);
    });

    it("returns isConfigured: false when apiKeyEncrypted is missing or blank", () => {
      const unconfiguredConfig: InstituteSmsConfig = {
        provider: "TEXTLOCAL",
        senderId: "SCHOLAR",
        apiKeyEncrypted: undefined,
        dltTemplateIds: {},
        enabled: false,
      };

      const publicConfig = toPublicSmsConfig(unconfiguredConfig);
      expect(publicConfig.isConfigured).toBe(false);
      expect(publicConfig.enabled).toBe(false);
    });
  });

  describe("3. sendInstituteSms Safe Mode & Execution", () => {
    it("returns { sent: false, reason: 'not_configured' } cleanly when smsConfig is disabled", async () => {
      vi.spyOn(prisma.institute, "findUnique").mockResolvedValue({
        id: "inst_test_1",
        name: "Test Institute",
        settings: {
          smsConfig: {
            provider: "MSG91",
            senderId: "TESTID",
            apiKeyEncrypted: encrypt("some_key"),
            enabled: false, // Disabled
          },
        },
      } as any);

      const result = await sendInstituteSms("inst_test_1", {
        to: "9876543210",
        message: "Hello world",
      });

      expect(result.sent).toBe(false);
      expect(result.reason).toBe("not_configured");
    });

    it("returns { sent: false, reason: 'not_configured' } when apiKeyEncrypted is absent", async () => {
      vi.spyOn(prisma.institute, "findUnique").mockResolvedValue({
        id: "inst_test_2",
        name: "Test Institute 2",
        settings: {
          smsConfig: {
            provider: "MSG91",
            senderId: "TESTID",
            enabled: true,
            apiKeyEncrypted: undefined,
          },
        },
      } as any);

      const result = await sendInstituteSms("inst_test_2", {
        to: "9876543210",
        message: "Hello world",
      });

      expect(result.sent).toBe(false);
      expect(result.reason).toBe("not_configured");
    });

    it("returns { sent: false, reason: 'missing_recipient_mobile' } if mobile is empty", async () => {
      const result = await sendInstituteSms("inst_test_3", {
        to: "",
        message: "Hello",
      });
      expect(result.sent).toBe(false);
      expect(result.reason).toBe("missing_recipient_mobile");
    });
  });

  describe("4. Provider Adapters", () => {
    it("MSG91Provider formats mobile to 12 digits and passes authkey header", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ type: "success", message: "SMS dispatched" }),
      } as any);

      const provider = new MSG91Provider();
      const res = await provider.send({
        to: "9876543210",
        senderId: "VIDYAL",
        apiKey: "test_msg91_authkey",
        templateId: "tpl_12345",
        variables: { name: "Aarav" },
      });

      expect(res.sent).toBe(true);
      expect(fetchSpy).toHaveBeenCalled();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://control.msg91.com/api/v5/flow/");
      expect(options?.headers).toMatchObject({ authkey: "test_msg91_authkey" });
    });

    it("TextlocalProvider posts to api.textlocal.in with URL encoded parameters", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success", custom: "ok" }),
      } as any);

      const provider = new TextlocalProvider();
      const res = await provider.send({
        to: "9876543210",
        senderId: "VIDYAL",
        apiKey: "test_textlocal_key",
        message: "Welcome to institute",
        variables: {},
      });

      expect(res.sent).toBe(true);
      expect(fetchSpy).toHaveBeenCalled();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.textlocal.in/send/");
      expect(options?.headers).toMatchObject({
        "Content-Type": "application/x-www-form-urlencoded",
      });
    });

    it("Fast2SMSProvider posts to fast2sms.com with authorization header", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ return: true, message: ["SMS sent successfully"] }),
      } as any);

      const provider = new Fast2SMSProvider();
      const res = await provider.send({
        to: "9876543210",
        senderId: "VIDYAL",
        apiKey: "test_fast2sms_key",
        message: "Alert notification",
        variables: {},
      });

      expect(res.sent).toBe(true);
      expect(fetchSpy).toHaveBeenCalled();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://www.fast2sms.com/dev/bulkV2");
      expect(options?.headers).toMatchObject({ authorization: "test_fast2sms_key" });
    });
  });
});
