import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const role = String((ctx.session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Only Owner and Admin can access staff attendance." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const month = searchParams.get("month"); // e.g. "2026-08"

  try {
    if (month) {
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
      const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

      const records = await prisma.staffAttendance.findMany({
        where: {
          instituteId: ctx.instituteId,
          ...(ctx.branchId ? { faculty: { branchId: ctx.branchId as string } } : {}),
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: "asc" },
      });

      return NextResponse.json(
        records.map((r) => ({
          ...r,
          date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
        }))
      );
    }

    const targetDateStr = date || new Date().toISOString().slice(0, 10);
    const targetDate = new Date(targetDateStr);

    const records = await prisma.staffAttendance.findMany({
      where: {
        instituteId: ctx.instituteId,
        ...(ctx.branchId ? { faculty: { branchId: ctx.branchId as string } } : {}),
        date: targetDate,
      },
    });

    return NextResponse.json(
      records.map((r) => ({
        ...r,
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
      }))
    );
  } catch (err: any) {
    console.error("Error fetching staff attendance:", err);
    return NextResponse.json({ error: "Failed to load staff attendance" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const role = String((ctx.session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Only Owner and Admin can save staff attendance." }, { status: 403 });
  }

  const body = await req.json();
  const { date, records } = body as {
    date: string;
    records: Array<{
      facultyId: string;
      status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";
      checkIn?: string;
      checkOut?: string;
      notes?: string;
    }>;
  };

  if (!date || !Array.isArray(records)) {
    return NextResponse.json({ error: "Date and records array are required" }, { status: 400 });
  }

  const attendanceDate = new Date(date);

  // Verify all facultyIds belong to active branch (only when branchId is resolved)
  if (ctx.branchId) {
    const facultyIds = records.map((r) => r.facultyId);
    const validFaculty = await prisma.faculty.findMany({
      where: { id: { in: facultyIds }, instituteId: ctx.instituteId, branchId: ctx.branchId as string },
      select: { id: true },
    });
    const validIds = new Set(validFaculty.map((f) => f.id));
    const invalid = facultyIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json({ error: "Forbidden: one or more faculty belong to a different branch" }, { status: 403 });
    }
  }

  try {
    const results = await Promise.all(
      records.map((item) =>
        prisma.staffAttendance.upsert({
          where: {
            facultyId_date: {
              facultyId: item.facultyId,
              date: attendanceDate,
            },
          },
          update: {
            status: item.status || "PRESENT",
            checkIn: item.checkIn || null,
            checkOut: item.checkOut || null,
            notes: item.notes || null,
          },
          create: {
            instituteId: ctx.instituteId,
            facultyId: item.facultyId,
            date: attendanceDate,
            status: item.status || "PRESENT",
            checkIn: item.checkIn || null,
            checkOut: item.checkOut || null,
            notes: item.notes || null,
          },
        })
      )
    );

    return NextResponse.json({ ok: true, count: results.length });
  } catch (err: any) {
    console.error("Error saving staff attendance:", err);
    return NextResponse.json({ error: "Failed to save staff attendance records" }, { status: 500 });
  }
}

