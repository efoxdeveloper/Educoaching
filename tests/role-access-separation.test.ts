import { describe, it, expect } from "vitest";
import { hasPermission } from "@/lib/permissions";

describe("Strict Role-Based Access Control (RBAC) & View Separation", () => {
  const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
    OWNER: ["*"],
    ADMIN: ["*"],
    FACULTY: [
      "/dashboard",
      "/batches",
      "/timetable",
      "/subjects",
      "/attendance",
      "/tests",
      "/study-material",
      "/assignments",
      "/portal",
    ],
    COUNSELLOR: [
      "/dashboard",
      "/admissions",
      "/students",
      "/courses",
      "/batches",
      "/communication",
    ],
    ACCOUNTANT: [
      "/dashboard",
      "/students",
      "/fees",
      "/expenses",
      "/reports",
    ],
    TECHNICIAN: [
      "/dashboard",
      "/tests",
      "/study-material",
      "/batches",
    ],
    STUDENT: [
      "/portal",
    ],
  };

  const isRouteVisibleForRole = (role: string, path: string) => {
    const allowed = ROLE_ALLOWED_ROUTES[role.toUpperCase()] || [];
    if (allowed.includes("*")) return true;
    return allowed.includes(path);
  };

  it("ensures Faculty only see their teaching field and never see owner financials or salaries", () => {
    // Allowed
    expect(isRouteVisibleForRole("FACULTY", "/tests")).toBe(true);
    expect(isRouteVisibleForRole("FACULTY", "/attendance")).toBe(true);
    expect(isRouteVisibleForRole("FACULTY", "/study-material")).toBe(true);
    expect(isRouteVisibleForRole("FACULTY", "/assignments")).toBe(true);
    expect(isRouteVisibleForRole("FACULTY", "/timetable")).toBe(true);

    // Strictly Blocked
    expect(isRouteVisibleForRole("FACULTY", "/fees")).toBe(false);
    expect(isRouteVisibleForRole("FACULTY", "/expenses")).toBe(false);
    expect(isRouteVisibleForRole("FACULTY", "/reports")).toBe(false);
    expect(isRouteVisibleForRole("FACULTY", "/faculty")).toBe(false); // cannot see staff salaries
    expect(isRouteVisibleForRole("FACULTY", "/settings")).toBe(false);
    expect(isRouteVisibleForRole("FACULTY", "/branches")).toBe(false);
    expect(isRouteVisibleForRole("FACULTY", "/admissions")).toBe(false);
  });

  it("ensures Admissions Counsellor only see Lead CRM and student inquiries", () => {
    expect(isRouteVisibleForRole("COUNSELLOR", "/admissions")).toBe(true);
    expect(isRouteVisibleForRole("COUNSELLOR", "/students")).toBe(true);

    // Strictly Blocked
    expect(isRouteVisibleForRole("COUNSELLOR", "/tests")).toBe(false);
    expect(isRouteVisibleForRole("COUNSELLOR", "/fees")).toBe(false);
    expect(isRouteVisibleForRole("COUNSELLOR", "/expenses")).toBe(false);
    expect(isRouteVisibleForRole("COUNSELLOR", "/settings")).toBe(false);
  });

  it("ensures Accountant only sees fees, collections, expenses, and financial reports", () => {
    expect(isRouteVisibleForRole("ACCOUNTANT", "/fees")).toBe(true);
    expect(isRouteVisibleForRole("ACCOUNTANT", "/expenses")).toBe(true);
    expect(isRouteVisibleForRole("ACCOUNTANT", "/reports")).toBe(true);

    // Strictly Blocked
    expect(isRouteVisibleForRole("ACCOUNTANT", "/tests")).toBe(false);
    expect(isRouteVisibleForRole("ACCOUNTANT", "/study-material")).toBe(false);
    expect(isRouteVisibleForRole("ACCOUNTANT", "/timetable")).toBe(false);
    expect(isRouteVisibleForRole("ACCOUNTANT", "/settings")).toBe(false);
  });

  it("ensures Students only see their dedicated student portal", () => {
    expect(isRouteVisibleForRole("STUDENT", "/portal")).toBe(true);

    // Blocked
    expect(isRouteVisibleForRole("STUDENT", "/dashboard")).toBe(false);
    expect(isRouteVisibleForRole("STUDENT", "/fees")).toBe(false);
    expect(isRouteVisibleForRole("STUDENT", "/students")).toBe(false);
    expect(isRouteVisibleForRole("STUDENT", "/settings")).toBe(false);
  });

  it("enforces backend permission gates for mutating actions", () => {
    // Faculty
    expect(hasPermission("FACULTY", "tests:write")).toBe(true);
    expect(hasPermission("FACULTY", "questions:write")).toBe(true);
    expect(hasPermission("FACULTY", "attendance:write")).toBe(true);
    expect(hasPermission("FACULTY", "expenses:write")).toBe(false);
    expect(hasPermission("FACULTY", "payments:write")).toBe(false);
    expect(hasPermission("FACULTY", "team:manage")).toBe(false);

    // Accountant
    expect(hasPermission("ACCOUNTANT", "payments:write")).toBe(true);
    expect(hasPermission("ACCOUNTANT", "expenses:write")).toBe(true);
    expect(hasPermission("ACCOUNTANT", "tests:write")).toBe(false);
    expect(hasPermission("ACCOUNTANT", "admissions:write")).toBe(false);

    // Counsellor
    expect(hasPermission("COUNSELLOR", "admissions:write")).toBe(true);
    expect(hasPermission("COUNSELLOR", "tests:write")).toBe(false);
    expect(hasPermission("COUNSELLOR", "expenses:write")).toBe(false);

    // Owner
    expect(hasPermission("OWNER", "institute:manage")).toBe(true);
    expect(hasPermission("OWNER", "billing:manage")).toBe(true);
    expect(hasPermission("OWNER", "team:manage")).toBe(true);
    expect(hasPermission("OWNER", "expenses:write")).toBe(true);
  });
});
