import { describe, it, expect } from "vitest";
import {
  isInstituteSubscriptionExpired,
  isRouteRestrictedBySubscription,
} from "@/lib/subscription";

describe("Subscription Expiry & Route Restriction Logic", () => {
  const baseNow = new Date("2026-09-08T12:00:00Z");
  const futureDate = new Date("2026-09-15T12:00:00Z");
  const pastDate = new Date("2026-09-01T12:00:00Z");

  describe("isInstituteSubscriptionExpired", () => {
    it("trial not yet expired -> returns false", () => {
      const result = isInstituteSubscriptionExpired({
        billingCycle: "TRIAL",
        trialEndsAt: futureDate,
        now: baseNow,
      });
      expect(result).toBe(false);
    });

    it("trial expired -> returns true", () => {
      const result = isInstituteSubscriptionExpired({
        billingCycle: "TRIAL",
        trialEndsAt: pastDate,
        now: baseNow,
      });
      expect(result).toBe(true);
    });

    it("paid plan not expired -> returns false", () => {
      for (const cycle of ["MONTHLY", "QUARTERLY", "YEARLY"]) {
        const result = isInstituteSubscriptionExpired({
          billingCycle: cycle,
          currentPeriodEnd: futureDate,
          now: baseNow,
        });
        expect(result).toBe(false);
      }
    });

    it("paid plan expired -> returns true", () => {
      for (const cycle of ["MONTHLY", "QUARTERLY", "YEARLY"]) {
        const result = isInstituteSubscriptionExpired({
          billingCycle: cycle,
          currentPeriodEnd: pastDate,
          now: baseNow,
        });
        expect(result).toBe(true);
      }
    });

    it("no end-date set -> returns false (fail open)", () => {
      expect(
        isInstituteSubscriptionExpired({
          billingCycle: "TRIAL",
          trialEndsAt: null,
          now: baseNow,
        })
      ).toBe(false);

      expect(
        isInstituteSubscriptionExpired({
          billingCycle: "MONTHLY",
          currentPeriodEnd: null,
          now: baseNow,
        })
      ).toBe(false);

      expect(
        isInstituteSubscriptionExpired({
          billingCycle: null,
          trialEndsAt: null,
          currentPeriodEnd: null,
          now: baseNow,
        })
      ).toBe(false);
    });
  });

  describe("isRouteRestrictedBySubscription", () => {
    it("STUDENT, PARENT, and PLATFORM_ADMIN are never blocked even when expired", () => {
      const nonRestrictedRoles = ["STUDENT", "PARENT", "PLATFORM_ADMIN"];

      for (const role of nonRestrictedRoles) {
        const isRestricted = isRouteRestrictedBySubscription({
          pathname: "/dashboard",
          role,
          isImpersonating: false,
          isExpired: true,
        });
        expect(isRestricted).toBe(false);
      }
    });

    it("platform admin impersonation is never blocked even when expired", () => {
      const isRestricted = isRouteRestrictedBySubscription({
        pathname: "/dashboard",
        role: "OWNER",
        isImpersonating: true,
        isExpired: true,
      });
      expect(isRestricted).toBe(false);
    });

    it("/plans and /settings are never blocked even when expired", () => {
      const allowedPaths = [
        "/plans",
        "/plans/overview",
        "/settings",
        "/settings/profile",
        "/settings/security",
        "/api/institutes/me",
        "/api/institutes/subscribe/create-order",
        "/api/institutes/subscribe/verify",
      ];

      for (const pathname of allowedPaths) {
        const isRestricted = isRouteRestrictedBySubscription({
          pathname,
          role: "OWNER",
          isImpersonating: false,
          isExpired: true,
        });
        expect(isRestricted).toBe(false);
      }
    });

    it("confines staff roles to /plans and /settings when expired (blocks other routes)", () => {
      const staffRoles = [
        "OWNER",
        "ADMIN",
        "STAFF",
        "FACULTY",
        "ACCOUNTANT",
        "COUNSELLOR",
        "TECHNICIAN",
      ];

      const protectedRoutes = [
        "/dashboard",
        "/students",
        "/batches",
        "/attendance",
        "/fees",
        "/reports",
        "/admissions",
        "/api/students",
        "/api/batches",
      ];

      for (const role of staffRoles) {
        for (const pathname of protectedRoutes) {
          const isRestricted = isRouteRestrictedBySubscription({
            pathname,
            role,
            isImpersonating: false,
            isExpired: true,
          });
          expect(isRestricted).toBe(true);
        }
      }
    });

    it("returns false for all routes when subscription is not expired", () => {
      const isRestricted = isRouteRestrictedBySubscription({
        pathname: "/dashboard",
        role: "OWNER",
        isImpersonating: false,
        isExpired: false,
      });
      expect(isRestricted).toBe(false);
    });
  });
});
