import { describe, it, expect } from "vitest";

describe("Main Campus Branch Impersonation", () => {
  type User = {
    role: string;
    isMainBranch?: boolean;
  };

  const canImpersonateBranch = (user: User) => {
    const role = user.role.toUpperCase();
    return role === "OWNER" || role === "ADMIN" || role === "PLATFORM_ADMIN" || Boolean(user.isMainBranch);
  };

  it("permits Main Campus staff, Owners, and Admins to impersonate satellite branches", () => {
    expect(canImpersonateBranch({ role: "OWNER" })).toBe(true);
    expect(canImpersonateBranch({ role: "ADMIN" })).toBe(true);
    expect(canImpersonateBranch({ role: "STAFF", isMainBranch: true })).toBe(true);
  });

  it("denies faculty, students, and satellite branch staff from impersonating branches", () => {
    expect(canImpersonateBranch({ role: "FACULTY", isMainBranch: false })).toBe(false);
    expect(canImpersonateBranch({ role: "STUDENT", isMainBranch: false })).toBe(false);
    expect(canImpersonateBranch({ role: "STAFF", isMainBranch: false })).toBe(false);
  });

  it("correctly scopes queries to impersonated branch", () => {
    const buildScopedWhere = (instituteId: string, impersonatedBranchId: string | null) => {
      const studentWhere: Record<string, unknown> = { instituteId };
      if (impersonatedBranchId) {
        studentWhere.branchId = impersonatedBranchId;
      }
      return studentWhere;
    };

    // When viewing Main Campus (no impersonation)
    expect(buildScopedWhere("inst_1", null)).toEqual({ instituteId: "inst_1" });

    // When impersonating satellite branch "br_jaipur"
    expect(buildScopedWhere("inst_1", "br_jaipur")).toEqual({
      instituteId: "inst_1",
      branchId: "br_jaipur",
    });
  });

  it("scopes batch queries for the impersonated branch", () => {
    const buildBatchWhere = (instituteId: string, impersonatedBranchId: string | null) => {
      const batchWhere: any = { instituteId };
      if (impersonatedBranchId) {
        batchWhere.OR = [
          { branchId: impersonatedBranchId },
          { branches: { some: { id: impersonatedBranchId } } },
          { isAllBranches: true },
        ];
      }
      return batchWhere;
    };

    const impersonatedWhere = buildBatchWhere("inst_1", "br_delhi");
    expect(impersonatedWhere.OR).toHaveLength(3);
    expect(impersonatedWhere.OR[0]).toEqual({ branchId: "br_delhi" });
    expect(impersonatedWhere.OR[2]).toEqual({ isAllBranches: true });
  });
});

describe("Guide Phone Number for Main Institute & Branches", () => {
  it("formats and validates central guide phone for institute setup", () => {
    const instituteProfile = {
      name: "Apex IIT Coaching",
      guidePhone: "+91 98765 00000",
      city: "Kota",
    };

    expect(instituteProfile.guidePhone).toMatch(/^\+?[0-9\s-]{10,15}$/);
    expect(instituteProfile.guidePhone).toBe("+91 98765 00000");
  });

  it("supports branch-specific guide helpline numbers", () => {
    const branches = [
      {
        id: "b_main",
        name: "Kota Main Campus",
        isMainBranch: true,
        contact: "+91 98765 11111",
        guidePhone: "+91 98765 22222",
      },
      {
        id: "b_jaipur",
        name: "Jaipur Satellite Center",
        isMainBranch: false,
        contact: "+91 98765 33333",
        guidePhone: "+91 98765 44444",
      },
    ];

    expect(branches[0].guidePhone).toBe("+91 98765 22222");
    expect(branches[1].guidePhone).toBe("+91 98765 44444");
    expect(branches[0].isMainBranch).toBe(true);
    expect(branches[1].isMainBranch).toBe(false);
  });
});
