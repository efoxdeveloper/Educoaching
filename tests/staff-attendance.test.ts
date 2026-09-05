import { describe, it, expect, vi } from "vitest";
import { GET, POST } from "@/app/api/faculty/attendance/route";
import { prisma } from "@/lib/prisma";
import * as tenantModule from "@/lib/tenant";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    staffAttendance: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireInstitute: vi.fn(),
}));

describe("2 — Staff/Teacher Attendance Prisma Integration", () => {
  const instituteId = "inst-123";
  const dateStr = "2026-09-03";

  it("GET returns staff attendance records using prisma.staffAttendance.findMany", async () => {
    vi.mocked(tenantModule.requireInstitute).mockResolvedValue({
      instituteId,
      session: { user: { role: "ADMIN" } },
    } as any);

    vi.mocked(prisma.staffAttendance.findMany).mockResolvedValue([
      {
        id: "sa-1",
        instituteId,
        facultyId: "fac-1",
        date: new Date(dateStr),
        status: "PRESENT",
        checkIn: "09:00",
        checkOut: "17:00",
        notes: "On time",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const req = new Request(`http://localhost/api/faculty/attendance?date=${dateStr}`);
    const res = await GET(req);
    expect(res!.status).toBe(200);

    const data = await res!.json();
    expect(data).toHaveLength(1);
    expect(data[0].facultyId).toBe("fac-1");
    expect(data[0].status).toBe("PRESENT");
    expect(data[0].date).toBe(dateStr);
    expect(prisma.staffAttendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId,
        }),
      })
    );
  });

  it("POST upserts staff attendance records without raw SQL errors", async () => {
    vi.mocked(tenantModule.requireInstitute).mockResolvedValue({
      instituteId,
      session: { user: { role: "OWNER" } },
    } as any);

    vi.mocked(prisma.staffAttendance.upsert).mockResolvedValue({} as any);

    const req = new Request("http://localhost/api/faculty/attendance", {
      method: "POST",
      body: JSON.stringify({
        date: dateStr,
        records: [
          {
            facultyId: "fac-1",
            status: "PRESENT",
            checkIn: "09:15",
            checkOut: "17:00",
            notes: "Morning shift",
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res!.status).toBe(200);
    const data = await res!.json();
    expect(data.ok).toBe(true);
    expect(data.count).toBe(1);

    expect(prisma.staffAttendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          facultyId_date: {
            facultyId: "fac-1",
            date: new Date(dateStr),
          },
        },
        update: {
          status: "PRESENT",
          checkIn: "09:15",
          checkOut: "17:00",
          notes: "Morning shift",
        },
        create: {
          instituteId,
          facultyId: "fac-1",
          date: new Date(dateStr),
          status: "PRESENT",
          checkIn: "09:15",
          checkOut: "17:00",
          notes: "Morning shift",
        },
      })
    );
  });
});
