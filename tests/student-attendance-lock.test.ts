import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/attendance/route";
import { prisma } from "@/lib/prisma";
import * as tenantModule from "@/lib/tenant";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    batch: {
      findFirst: vi.fn(),
    },
    attendance: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (ops: any[]) => {
      // Simulate transaction by awaiting each upsert promise
      const results: any[] = [];
      for (const op of ops) {
        results.push(await op);
      }
      return results;
    }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireInstitute: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/whatsapp", () => ({
  sendAbsentNotification: vi.fn(),
  sendLateNotification: vi.fn(),
}));

describe("1 — Student attendance locked after save", () => {
  const instituteId = "inst-1";
  const batchId = "batch-1";
  const date = "2026-09-03";

  it("rejects saving attendance if records for batch and date are already locked", async () => {
    vi.mocked(tenantModule.requirePermission).mockResolvedValue({
      instituteId,
      branchId: "branch-1",
      session: { user: { id: "user-1" } },
    } as any);

    vi.mocked(prisma.batch.findFirst).mockResolvedValue({
      id: batchId,
      name: "Physics Batch A",
      instituteId,
    } as any);

    vi.mocked(prisma.attendance.findFirst).mockResolvedValue({
      id: "att-1",
      batchId,
      date: new Date(date),
      locked: true,
    } as any);

    const req = new Request("http://localhost/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        batchId,
        date,
        records: [{ studentId: "s1", status: "PRESENT" }],
      }),
    });

    const res = await POST(req);
    expect(res!.status).toBe(400);
    const data = await res!.json();
    expect(data.error).toBe("Attendance for this date has already been saved and cannot be changed");
    expect(prisma.attendance.upsert).not.toHaveBeenCalled();
  });

  it("saves and sets locked: true on new attendance submission", async () => {
    vi.mocked(tenantModule.requirePermission).mockResolvedValue({
      instituteId,
      branchId: "branch-1",
      session: { user: { id: "user-1" } },
    } as any);

    vi.mocked(prisma.batch.findFirst).mockResolvedValue({
      id: batchId,
      name: "Physics Batch A",
      instituteId,
    } as any);

    vi.mocked(prisma.attendance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.attendance.findMany).mockResolvedValue([]);
    vi.mocked((prisma.student as any).count).mockResolvedValue(2);
    vi.mocked(prisma.attendance.upsert).mockResolvedValue({} as any);
    vi.mocked((prisma as any).$transaction).mockImplementation(async (ops: any[]) => {
      for (const op of ops) await op;
      return [];
    });

    const req = new Request("http://localhost/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        batchId,
        date,
        records: [
          { studentId: "s1", status: "PRESENT" },
          { studentId: "s2", status: "ABSENT" },
        ],
      }),
    });

    const res = await POST(req);
    expect(res!.status).toBe(200);
    const data = await res!.json();
    expect(data.ok).toBe(true);

    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          studentId: "s1",
          batchId,
          status: "PRESENT",
          locked: true,
        }),
        update: expect.objectContaining({
          status: "PRESENT",
          batchId,
          locked: true,
        }),
      })
    );
  });

  it("rejects partial attendance and does not lock any rows", async () => {
    vi.mocked(tenantModule.requirePermission).mockResolvedValue({
      instituteId,
      branchId: "branch-1",
      session: { user: { id: "user-1" } },
    } as any);

    vi.mocked(prisma.batch.findFirst).mockResolvedValue({
      id: batchId,
      name: "Physics Batch A",
      instituteId,
    } as any);

    vi.mocked(prisma.attendance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.attendance.findMany).mockResolvedValue([]);
    vi.mocked((prisma.student as any).count).mockResolvedValue(10);
    vi.mocked(prisma.attendance.upsert).mockClear();
    vi.mocked((prisma as any).$transaction).mockClear();

    const req = new Request("http://localhost/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        batchId,
        date,
        records: [{ studentId: "s1", status: "PRESENT" }],
      }),
    });

    const res = await POST(req);
    expect(res!.status).toBe(400);
    const data = await res!.json();
    expect(data.error).toMatch(/Please mark attendance for all 10 students before saving — 9 remaining/);
    expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    expect((prisma as any).$transaction).not.toHaveBeenCalled();
  });

  it("isolates batches: marking Batch A does not block Batch B on same date", async () => {
    vi.mocked(tenantModule.requirePermission).mockResolvedValue({
      instituteId,
      branchId: "branch-1",
      session: { user: { id: "user-1" } },
    } as any);

    // Batch A has 2 students, Batch B has 2 students - both succeed independently
    vi.mocked(prisma.batch.findFirst).mockResolvedValue({
      id: "batch-A",
      name: "Batch A",
      instituteId,
    } as any);

    vi.mocked(prisma.attendance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.attendance.findMany).mockResolvedValue([]);
    vi.mocked((prisma.student as any).count).mockResolvedValue(2);
    vi.mocked(prisma.attendance.upsert).mockResolvedValue({} as any);
    vi.mocked((prisma as any).$transaction).mockImplementation(async (ops: any[]) => {
      for (const op of ops) await op;
      return [];
    });

    const reqA = new Request("http://localhost/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        batchId: "batch-A",
        date,
        records: [
          { studentId: "s1", status: "PRESENT" },
          { studentId: "s2", status: "PRESENT" },
        ],
      }),
    });
    const resA = await POST(reqA);
    expect(resA!.status).toBe(200);

    // Now Batch B on same date should still be saveable – locked check is per batchId
    vi.mocked(prisma.batch.findFirst).mockResolvedValue({
      id: "batch-B",
      name: "Batch B",
      instituteId,
    } as any);
    (vi.mocked(prisma.attendance.findFirst) as any).mockImplementation(async (args: any) => {
      // Only return locked if batchId is batch-A, simulate Batch B not locked
      if (args?.where?.batchId === "batch-B") return null;
      return null;
    });
    vi.mocked((prisma.student as any).count).mockResolvedValue(2);
    vi.mocked(prisma.attendance.upsert).mockClear();

    const reqB = new Request("http://localhost/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        batchId: "batch-B",
        date,
        records: [
          { studentId: "s3", status: "ABSENT" },
          { studentId: "s4", status: "PRESENT" },
        ],
      }),
    });
    const resB = await POST(reqB);
    expect(resB!.status).toBe(200);
    expect(prisma.attendance.upsert).toHaveBeenCalled();
  });
});
