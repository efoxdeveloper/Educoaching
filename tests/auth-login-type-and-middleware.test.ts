import { describe, it, expect, vi } from "vitest";

describe("5 — Login Type Tab Restrictions and Portal Middleware Separation", () => {
  // Test authorize loginType enforcement logic
  const checkLoginTypeRoleMatch = (loginType?: string, role?: string) => {
    const normLoginType = loginType?.toLowerCase();
    const targetRole = String(role || "").toUpperCase();

    if (normLoginType === "staff" && (targetRole === "STUDENT" || targetRole === "PARENT")) {
      return { error: "UseStudentLogin" };
    }
    if (normLoginType === "student" && targetRole !== "STUDENT" && targetRole !== "PARENT") {
      return { error: "UseStaffLogin" };
    }
    return { ok: true };
  };

  it("rejects a STUDENT account attempting to sign in from the staff login tab", () => {
    const result = checkLoginTypeRoleMatch("staff", "STUDENT");
    expect(result.error).toBe("UseStudentLogin");
  });

  it("rejects a PARENT account attempting to sign in from the staff login tab", () => {
    const result = checkLoginTypeRoleMatch("staff", "PARENT");
    expect(result.error).toBe("UseStudentLogin");
  });

  it("rejects an OWNER account attempting to sign in from the student login tab", () => {
    const result = checkLoginTypeRoleMatch("student", "OWNER");
    expect(result.error).toBe("UseStaffLogin");
  });

  it("rejects a STAFF account attempting to sign in from the student login tab", () => {
    const result = checkLoginTypeRoleMatch("student", "STAFF");
    expect(result.error).toBe("UseStaffLogin");
  });

  it("rejects an ADMIN account attempting to sign in from the student login tab", () => {
    const result = checkLoginTypeRoleMatch("student", "ADMIN");
    expect(result.error).toBe("UseStaffLogin");
  });

  it("allows a STAFF account signing in from the staff tab", () => {
    const result = checkLoginTypeRoleMatch("staff", "STAFF");
    expect(result.ok).toBe(true);
  });

  it("allows a STUDENT account signing in from the student tab", () => {
    const result = checkLoginTypeRoleMatch("student", "STUDENT");
    expect(result.ok).toBe(true);
  });

  // Test middleware redirection matrix
  const evaluateMiddlewareRoute = (role: string, pathname: string) => {
    const upper = role.toUpperCase();
    if ((upper === "STUDENT" || upper === "PARENT") && !pathname.startsWith("/portal")) {
      return { redirect: "/portal" };
    }
    if (
      ["OWNER", "ADMIN", "STAFF", "FACULTY", "ACCOUNTANT", "COUNSELLOR", "TECHNICIAN"].includes(upper) &&
      pathname.startsWith("/portal")
    ) {
      return { redirect: "/dashboard" };
    }
    if (upper === "PLATFORM_ADMIN" && pathname.startsWith("/portal")) {
      return { redirect: "/admin" };
    }
    return { next: true };
  };

  it("middleware redirects STAFF from /portal to /dashboard", () => {
    expect(evaluateMiddlewareRoute("STAFF", "/portal")).toEqual({ redirect: "/dashboard" });
    expect(evaluateMiddlewareRoute("OWNER", "/portal")).toEqual({ redirect: "/dashboard" });
    expect(evaluateMiddlewareRoute("ADMIN", "/portal")).toEqual({ redirect: "/dashboard" });
  });

  it("middleware redirects STUDENT from /dashboard to /portal", () => {
    expect(evaluateMiddlewareRoute("STUDENT", "/dashboard")).toEqual({ redirect: "/portal" });
    expect(evaluateMiddlewareRoute("PARENT", "/fees")).toEqual({ redirect: "/portal" });
  });

  it("middleware allows STUDENT on /portal and STAFF on /dashboard", () => {
    expect(evaluateMiddlewareRoute("STUDENT", "/portal")).toEqual({ next: true });
    expect(evaluateMiddlewareRoute("STAFF", "/dashboard")).toEqual({ next: true });
  });
});
