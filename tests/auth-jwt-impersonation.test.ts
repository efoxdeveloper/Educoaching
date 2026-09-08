import { describe, it, expect, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status ?? 200 }),
  },
}));

vi.mock("next-auth", () => {
  return {
    default: vi.fn(() => ({
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    })),
    CredentialsSignin: class CredentialsSignin extends Error {},
  };
});

vi.mock("next-auth/providers/credentials", () => {
  return {
    default: vi.fn(() => ({})),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { authCallbacks } from "@/lib/auth";

describe("authCallbacks - Branch Impersonation JWT & Session handling", () => {
  it("initializes token with null impersonation claims on user login", async () => {
    const initialToken: any = {};
    const user = {
      id: "u1",
      role: "OWNER",
      instituteId: "inst1",
      branchId: "b-main",
      isMainBranch: true,
    };

    const token = await authCallbacks.jwt({ token: initialToken, user });
    expect(token.impersonatingBranchId).toBeNull();
    expect(token.impersonationStartedAt).toBeNull();
    expect(token.role).toBe("OWNER");
  });

  it("sets impersonatingBranchId and timestamp on session update trigger", async () => {
    const token: any = {
      id: "u1",
      role: "OWNER",
      impersonatingBranchId: null,
      impersonationStartedAt: null,
    };

    const updatedToken = await authCallbacks.jwt({
      token,
      trigger: "update",
      session: { impersonatingBranchId: "branch-sub-1" },
    });

    expect(updatedToken.impersonatingBranchId).toBe("branch-sub-1");
    expect(typeof updatedToken.impersonationStartedAt).toBe("number");
    expect(updatedToken.impersonationStartedAt).toBeGreaterThan(0);
  });

  it("clears impersonatingBranchId and timestamp when explicitly updated with null", async () => {
    const token: any = {
      id: "u1",
      role: "OWNER",
      impersonatingBranchId: "branch-sub-1",
      impersonationStartedAt: Date.now(),
    };

    const updatedToken = await authCallbacks.jwt({
      token,
      trigger: "update",
      session: { impersonatingBranchId: null, impersonationStartedAt: null },
    });

    expect(updatedToken.impersonatingBranchId).toBeNull();
    expect(updatedToken.impersonationStartedAt).toBeNull();
  });

  it("auto-expires impersonation after 4 hours", async () => {
    const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000;
    const token: any = {
      id: "u1",
      role: "OWNER",
      impersonatingBranchId: "branch-sub-1",
      impersonationStartedAt: fiveHoursAgo,
    };

    const evaluatedToken = await authCallbacks.jwt({ token });
    expect(evaluatedToken.impersonatingBranchId).toBeNull();
    expect(evaluatedToken.impersonationStartedAt).toBeNull();
  });

  it("projects impersonation claims and isImpersonatingBranch correctly onto session", async () => {
    const token: any = {
      id: "u1",
      role: "OWNER",
      instituteId: "inst1",
      branchId: "b-main",
      isMainBranch: true,
      impersonatingBranchId: "branch-sub-1",
      impersonationStartedAt: 12345678,
    };

    const sessionResult = await authCallbacks.session({
      session: { user: {} as any, expires: "2099-01-01" },
      token,
    });

    expect((sessionResult.user as any).impersonatingBranchId).toBe("branch-sub-1");
    expect((sessionResult.user as any).impersonationStartedAt).toBe(12345678);
    expect((sessionResult.user as any).isImpersonatingBranch).toBe(true);

    // When cleared:
    token.impersonatingBranchId = null;
    token.impersonationStartedAt = null;

    const clearedSession = await authCallbacks.session({
      session: { user: {} as any, expires: "2099-01-01" },
      token,
    });

    expect((clearedSession.user as any).impersonatingBranchId).toBeNull();
    expect((clearedSession.user as any).impersonationStartedAt).toBeNull();
    expect((clearedSession.user as any).isImpersonatingBranch).toBe(false);
  });
});
