/**
 * tests/branch-tenant.test.ts
 *
 * Phase 1 tests: requireInstitute() branch resolution
 * - Owner not impersonating → Main Branch id (not null, not aggregate)
 * - Sub-branch staff → their own branch id
 * - Owner impersonating Branch B → Branch B's id, isImpersonatingBranch=true
 * - Tampered cookie pointing at another institute's branch → falls back to Main Branch
 * - Single-branch institute → resolves correctly
 */

import { describe, beforeEach, it, expect, vi as jest } from "vitest";

// ─── Prisma mock ────────────────────────────────────────────────────────────
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    branch: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
    faculty: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  },
}));

// ─── next/server mock ───────────────────────────────────────────────────────
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ body, status: init?.status ?? 200 }),
  },
}));

// ─── next/headers mock (cookies) ────────────────────────────────────────────
const mockGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: () => ({ get: mockGet }),
}));

// ─── Auth mock ───────────────────────────────────────────────────────────────
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

// ─── Permissions mock ────────────────────────────────────────────────────────
jest.mock("@/lib/permissions", () => ({
  hasPermission: jest.fn().mockReturnValue(true),
}));

// ─── Institute settings mock ─────────────────────────────────────────────────
jest.mock("@/lib/institute-settings", () => ({
  parseInstituteSettings: () => ({ featureFlags: {} }),
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────
const { requireInstitute, BRANCH_IMPERSONATION_COOKIE } = await import("@/lib/tenant");

// ─── Test data ───────────────────────────────────────────────────────────────
const INST_A = "inst-a";
const INST_B = "inst-b";
const MAIN_BRANCH_A = { id: "branch-main-a", name: "Main Campus", city: null, state: null, contact: null, guidePhone: null, isMainBranch: true };
const SUB_BRANCH_A = { id: "branch-sub-a", name: "North Branch", city: null, state: null, contact: null, guidePhone: null, isMainBranch: false };
const BRANCH_B = { id: "branch-main-b", name: "Main Campus B", city: null, state: null, contact: null, guidePhone: null, isMainBranch: true };

function ownerSession(overrides = {}) {
  return {
    user: {
      id: "user-owner",
      email: "owner@test.com",
      name: "Owner",
      role: "OWNER",
      instituteId: INST_A,
      isMainBranch: true,
      branchId: null,
      permissions: [],
      ...overrides,
    },
  };
}

function staffSession(branchId: string, overrides = {}) {
  return {
    user: {
      id: "user-staff",
      email: "staff@test.com",
      name: "Staff",
      role: "STAFF",
      instituteId: INST_A,
      isMainBranch: false,
      branchId,
      permissions: [],
      ...overrides,
    },
  };
}

describe("requireInstitute() — branch resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no cookie set
    mockGet.mockReturnValue(undefined);
  });

  it("Owner NOT impersonating → returns Main Branch id (not null)", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    // No branch cookie
    mockGet.mockReturnValue(undefined);
    // findFirst for branch: first call returns main branch
    mockFindFirst.mockResolvedValue(MAIN_BRANCH_A);

    const ctx = await requireInstitute();
    expect("error" in ctx).toBe(false);
    if ("error" in ctx) return;

    expect(ctx.branchId).toBe(MAIN_BRANCH_A.id);
    expect(ctx.isImpersonatingBranch).toBe(false);
    expect(ctx.instituteId).toBe(INST_A);
  });

  it("Sub-branch STAFF account → returns their own branch id, locked", async () => {
    mockAuth.mockResolvedValue(staffSession(SUB_BRANCH_A.id));
    // findFirst for branch (institute ownership check) - must include instituteId for tenancy
    mockFindFirst.mockResolvedValueOnce({ id: SUB_BRANCH_A.id, name: "North Branch", isMainBranch: false } as any);

    const ctx = await requireInstitute();
    expect("error" in ctx).toBe(false);
    if ("error" in ctx) return;

    expect(ctx.branchId).toBe(SUB_BRANCH_A.id);
    expect(ctx.isImpersonatingBranch).toBe(false);
    // Verify tenancy check was used: where should contain instituteId
    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ instituteId: INST_A }) }));
  });

  it("Owner impersonating Branch B → returns Branch B id, isImpersonatingBranch=true", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    // Cookie set to sub-branch
    mockGet.mockReturnValue({ value: SUB_BRANCH_A.id });
    // findFirst for branch (institute ownership check on cookie branch)
    mockFindFirst.mockResolvedValue({ id: SUB_BRANCH_A.id, isMainBranch: false, name: "North Branch" } as any);

    const ctx = await requireInstitute();
    expect("error" in ctx).toBe(false);
    if ("error" in ctx) return;

    expect(ctx.branchId).toBe(SUB_BRANCH_A.id);
    expect(ctx.isImpersonatingBranch).toBe(true);
    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ instituteId: INST_A, id: SUB_BRANCH_A.id }) }));
  });

  it("Tampered cookie with another institute's branch → falls back to Main Branch", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    // Cookie set to a branch from INST_B
    mockGet.mockReturnValue({ value: BRANCH_B.id });
    // First findFirst: cookie branch lookup with instituteId=INST_A → not found (belongs to INST_B)
    mockFindFirst.mockResolvedValueOnce(null);
    // Fallback: findFirst for main branch
    mockFindFirst.mockResolvedValueOnce(MAIN_BRANCH_A);

    const ctx = await requireInstitute();
    expect("error" in ctx).toBe(false);
    if ("error" in ctx) return;

    // Must NOT resolve to INST_B's branch
    expect(ctx.branchId).toBe(MAIN_BRANCH_A.id);
    expect(ctx.isImpersonatingBranch).toBe(false);
  });

  it("Single-branch institute → resolves correctly without regression", async () => {
    mockAuth.mockResolvedValue(ownerSession());
    mockGet.mockReturnValue(undefined);
    // Only one branch exists: findFirst(isMainBranch) → returns it
    const onlyBranch = { id: "only-branch", name: "Main Branch", city: null, state: null, contact: null, guidePhone: null, isMainBranch: true };
    mockFindFirst.mockResolvedValue(onlyBranch);

    const ctx = await requireInstitute();
    expect("error" in ctx).toBe(false);
    if ("error" in ctx) return;

    expect(ctx.branchId).toBe("only-branch");
    expect(ctx.isImpersonatingBranch).toBe(false);
  });

  it("No session → returns error 401", async () => {
    mockAuth.mockResolvedValue(null);

    const ctx = await requireInstitute();
    expect("error" in ctx).toBe(true);
    if (!("error" in ctx)) return;
    expect((ctx.error as any).status).toBe(401);
  });
});
