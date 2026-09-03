import { describe, it, expect } from "vitest";
import { hasPermission } from "@/lib/permissions";

describe("RBAC Permissions Matrix", () => {
  describe("OWNER role", () => {
    it("should allow all operational, billing, and management permissions", () => {
      expect(hasPermission("OWNER", "students:write")).toBe(true);
      expect(hasPermission("OWNER", "batches:write")).toBe(true);
      expect(hasPermission("OWNER", "faculty:write")).toBe(true);
      expect(hasPermission("OWNER", "payments:write")).toBe(true);
      expect(hasPermission("OWNER", "team:manage")).toBe(true);
      expect(hasPermission("OWNER", "billing:manage")).toBe(true);
      expect(hasPermission("OWNER", "institute:manage")).toBe(true);
      expect(hasPermission("OWNER", "admissions:write")).toBe(true);
      expect(hasPermission("OWNER", "timetable:write")).toBe(true);
      expect(hasPermission("OWNER", "tests:write")).toBe(true);
    });
  });

  describe("ADMIN role", () => {
    it("should allow operational actions but deny sensitive team and billing management", () => {
      expect(hasPermission("ADMIN", "students:write")).toBe(true);
      expect(hasPermission("ADMIN", "batches:write")).toBe(true);
      expect(hasPermission("ADMIN", "payments:write")).toBe(true);
      expect(hasPermission("ADMIN", "admissions:write")).toBe(true);
      expect(hasPermission("ADMIN", "timetable:write")).toBe(true);
      expect(hasPermission("ADMIN", "tests:write")).toBe(true);

      // Admin cannot manage team members or institute subscription billing
      expect(hasPermission("ADMIN", "team:manage")).toBe(false);
      expect(hasPermission("ADMIN", "billing:manage")).toBe(false);
    });
  });

  describe("STAFF role", () => {
    it("should allow day-to-day attendance/payments but deny structural changes", () => {
      expect(hasPermission("STAFF", "attendance:write")).toBe(true);
      expect(hasPermission("STAFF", "payments:write")).toBe(true);
      expect(hasPermission("STAFF", "tests:write")).toBe(true);

      // Denied structural write permissions
      expect(hasPermission("STAFF", "students:write")).toBe(false);
      expect(hasPermission("STAFF", "batches:write")).toBe(false);
      expect(hasPermission("STAFF", "faculty:write")).toBe(false);
      expect(hasPermission("STAFF", "team:manage")).toBe(false);
      expect(hasPermission("STAFF", "billing:manage")).toBe(false);
      expect(hasPermission("STAFF", "timetable:write")).toBe(false);
      expect(hasPermission("STAFF", "admissions:write")).toBe(false);
    });
  });

  describe("Granular Staff Action Rights", () => {
    it("restricts a STAFF user to only their specifically granted permissions", () => {
      const staffUser = { role: "STAFF", permissions: ["attendance:write"] };
      expect(hasPermission(staffUser, "attendance:write")).toBe(true);
      expect(hasPermission(staffUser, "payments:write")).toBe(false);
      expect(hasPermission(staffUser, "tests:write")).toBe(false);
      expect(hasPermission(staffUser, "students:write")).toBe(false);
    });

    it("allows multiple granular permissions when granted to STAFF/FACULTY", () => {
      const facultyUser = { role: "FACULTY", permissions: ["attendance:write", "tests:write", "questions:write"] };
      expect(hasPermission(facultyUser, "attendance:write")).toBe(true);
      expect(hasPermission(facultyUser, "tests:write")).toBe(true);
      expect(hasPermission(facultyUser, "questions:write")).toBe(true);
      expect(hasPermission(facultyUser, "payments:write")).toBe(false);
      expect(hasPermission(facultyUser, "expenses:write")).toBe(false);
    });

    it("ensures OWNER and ADMIN retain full access regardless of permissions array", () => {
      const ownerUser = { role: "OWNER", permissions: [] };
      expect(hasPermission(ownerUser, "students:write")).toBe(true);
      expect(hasPermission(ownerUser, "payments:write")).toBe(true);
      expect(hasPermission(ownerUser, "billing:manage")).toBe(true);

      const adminUser = { role: "ADMIN", permissions: [] };
      expect(hasPermission(adminUser, "students:write")).toBe(true);
      expect(hasPermission(adminUser, "payments:write")).toBe(true);
      expect(hasPermission(adminUser, "attendance:write")).toBe(true);
    });
  });

  describe("Unauthenticated / Unknown role", () => {
    it("should deny any permissions", () => {
      expect(hasPermission(undefined, "students:write")).toBe(false);
      expect(hasPermission(null as any, "students:write")).toBe(false);
      expect(hasPermission("UNKNOWN_ROLE", "students:write")).toBe(false);
      expect(hasPermission("PLATFORM_ADMIN", "students:write")).toBe(false);
    });
  });
});
