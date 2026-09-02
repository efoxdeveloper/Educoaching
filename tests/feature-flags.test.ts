import { describe, it, expect } from "vitest";
import {
  parseFeatureFlags,
  parseInstituteSettings,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_INSTITUTE_SETTINGS,
} from "@/lib/institute-settings";

describe("Feature Flags & Settings Parser", () => {
  describe("parseFeatureFlags", () => {
    it("returns all default flags enabled when raw input is null or undefined", () => {
      expect(parseFeatureFlags(null)).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(parseFeatureFlags(undefined)).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(parseFeatureFlags("invalid")).toEqual(DEFAULT_FEATURE_FLAGS);
    });

    it("correctly applies explicit boolean overrides while keeping others default", () => {
      const result = parseFeatureFlags({
        onlineTests: false,
        reports: false,
      });

      expect(result.onlineTests).toBe(false);
      expect(result.reports).toBe(false);
      expect(result.attendance).toBe(true);
      expect(result.admissions).toBe(true);
      expect(result.timetable).toBe(true);
      expect(result.onlinePayments).toBe(true);
      expect(result.multiBranch).toBe(true);
    });
  });

  describe("parseInstituteSettings", () => {
    it("returns default settings when raw input is empty", () => {
      const res = parseInstituteSettings(null);
      expect(res.currency).toBe("INR");
      expect(res.timezone).toBe("Asia/Kolkata");
      expect(res.weekStart).toBe("MON");
      expect(res.featureFlags).toEqual(DEFAULT_FEATURE_FLAGS);
    });

    it("parses valid timezone, currency, and custom feature flags", () => {
      const res = parseInstituteSettings({
        timezone: "Asia/Dubai",
        currency: "AED",
        weekStart: "SUN",
        featureFlags: { onlinePayments: false },
      });

      expect(res.timezone).toBe("Asia/Dubai");
      expect(res.currency).toBe("AED");
      expect(res.weekStart).toBe("SUN");
      expect(res.featureFlags.onlinePayments).toBe(false);
      expect(res.featureFlags.onlineTests).toBe(true);
    });

    it("safely falls back to defaults if timezone or currency is unknown", () => {
      const res = parseInstituteSettings({
        timezone: "America/Fake_City",
        currency: "INVALID_CURRENCY",
      });

      expect(res.timezone).toBe(DEFAULT_INSTITUTE_SETTINGS.timezone);
      expect(res.currency).toBe(DEFAULT_INSTITUTE_SETTINGS.currency);
    });
  });
});
