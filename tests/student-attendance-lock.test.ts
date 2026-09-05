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
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireInstitute: vi.fn(),
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
    vi.mocked(tenantModule.requireInstitute).mockResolvedValue({
      instituteId,
      userId: "user-1",
      role: "STAFF",
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
    vi.mocked(tenantModule.requireInstitute).mockResolvedValue({
      instituteId,
      userId: "user-1",
      role: "STAFF",
    } as any);

    vi.mocked(prisma.batch.findFirst).mockResolvedValue({
      id: batchId,
      name: "Physics Batch A",
      instituteId,
    } as any);

    vi.mocked(prisma.attendance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.attendance.findMany).mockResolvedValue([]);
    vi.mocked(prisma.attendance.upsert).mockResolvedValue({} as any);

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
});
