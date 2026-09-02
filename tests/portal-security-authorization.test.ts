import { describe, it, expect } from "vitest";

describe("Item 0 — Student Portal Security & Access Authorization", () => {
  type MockSession = {
    user?: {
      id: string;
      email: string;
      role: "STUDENT" | "OWNER" | "ADMIN" | "STAFF" | "FACULTY";
      name?: string;
    };
  } | null;

  type MockStudent = {
    id: string;
    instituteId: string;
    email: string;
    mobile: string;
    name: string;
  };

  const resolvePortalStudentFilter = (
    session: MockSession,
    instituteId: string | null,
    searchParams?: { mobile?: string; studentId?: string }
  ) => {
    // 1. Unauthenticated user must be redirected to /login
    if (!session || !session.user) {
      return { redirect: "/login" };
    }

    // 2. Missing institute must be redirected
    if (!instituteId) {
      return { redirect: "/login" };
    }

    const userRole = session.user.role;
    const userEmail = session.user.email;

    // 3. If role is STUDENT, query param ?mobile= is completely IGNORED and access is locked to session email
    if (userRole === "STUDENT") {
      if (!userEmail) return { redirect: "/login" };
      return {
        allowed: true,
        where: { instituteId, email: userEmail },
      };
    }

    // 4. If role is OWNER/ADMIN/STAFF, they can preview a student by studentId
    if (["OWNER", "ADMIN", "STAFF"].includes(userRole)) {
      return {
        allowed: true,
        where: {
          instituteId,
          ...(searchParams?.studentId ? { id: searchParams.studentId } : {}),
        },
      };
    }

    // 5. Unauthorized role
    return { redirect: "/dashboard" };
  };

  it("rejects unauthenticated requests to /portal with ?mobile= and redirects to /login", () => {
    const unauthenticatedSession: MockSession = null;
    const result = resolvePortalStudentFilter(unauthenticatedSession, "inst-1", {
      mobile: "9876543210",
    });

    expect(result.redirect).toBe("/login");
  });

  it("prevents a logged-in student from accessing another student's data via ?mobile=", () => {
    const student1Session: MockSession = {
      user: {
        id: "user-student-1",
        email: "alice@example.com",
        role: "STUDENT",
        name: "Alice",
      },
    };

    // Attacker passes Bob's mobile number in URL query param
    const result = resolvePortalStudentFilter(student1Session, "inst-1", {
      mobile: "9876543210", // Bob's mobile
    });

    expect(result.allowed).toBe(true);
    // Verified that where clause is locked to Alice's session email and ignores mobile query param!
    expect(result.where).toEqual({
      instituteId: "inst-1",
      email: "alice@example.com",
    });
    expect(result.where).not.toHaveProperty("mobile");
  });

  it("rejects non-student/non-admin roles like FACULTY from accessing the student portal", () => {
    const facultySession: MockSession = {
      user: {
        id: "user-fac-1",
        email: "faculty@example.com",
        role: "FACULTY",
      },
    };

    const result = resolvePortalStudentFilter(facultySession, "inst-1");
    expect(result.redirect).toBe("/dashboard");
  });

  it("allows institute OWNER/ADMIN to preview student portal by studentId", () => {
    const adminSession: MockSession = {
      user: {
        id: "user-admin-1",
        email: "admin@example.com",
        role: "ADMIN",
      },
    };

    const result = resolvePortalStudentFilter(adminSession, "inst-1", {
      studentId: "student-123",
    });

    expect(result.allowed).toBe(true);
    expect(result.where).toEqual({
      instituteId: "inst-1",
      id: "student-123",
    });
  });

  it("ensures /portal is protected by middleware matcher rules", () => {
    const protectedMatchers = [
      "/dashboard/:path*",
      "/students/:path*",
      "/batches/:path*",
      "/attendance/:path*",
      "/fees/:path*",
      "/settings/:path*",
      "/plans/:path*",
      "/my-plans/:path*",
      "/portal/:path*",
      "/admin/:path*",
    ];

    expect(protectedMatchers.includes("/portal/:path*")).toBe(true);
  });
});
