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
      const records = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          instituteId: string;
          facultyId: string;
          date: string;
          status: string;
          checkIn: string | null;
          checkOut: string | null;
          notes: string | null;
        }>
      >(
        `SELECT id, "instituteId", "facultyId", to_char(date, 'YYYY-MM-DD') as date, status, "checkIn", "checkOut", notes
         FROM "StaffAttendance"
         WHERE "instituteId" = $1 AND to_char(date, 'YYYY-MM') = $2
         ORDER BY date ASC`,
        ctx.instituteId,
        month
      );
      return NextResponse.json(records);
    }

    if (date) {
      const records = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          instituteId: string;
          facultyId: string;
          date: string;
          status: string;
          checkIn: string | null;
          checkOut: string | null;
          notes: string | null;
        }>
      >(
        `SELECT id, "instituteId", "facultyId", to_char(date, 'YYYY-MM-DD') as date, status, "checkIn", "checkOut", notes
         FROM "StaffAttendance"
         WHERE "instituteId" = $1 AND date = $2::DATE`,
        ctx.instituteId,
        date
      );
      return NextResponse.json(records);
    }

    // Default: Today's date
    const today = new Date().toISOString().slice(0, 10);
    const records = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        instituteId: string;
        facultyId: string;
        date: string;
        status: string;
        checkIn: string | null;
        checkOut: string | null;
        notes: string | null;
      }>
    >(
      `SELECT id, "instituteId", "facultyId", to_char(date, 'YYYY-MM-DD') as date, status, "checkIn", "checkOut", notes
       FROM "StaffAttendance"
       WHERE "instituteId" = $1 AND date = $2::DATE`,
      ctx.instituteId,
      today
    );
    return NextResponse.json(records);
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

  try {
    for (const item of records) {
      const recordId = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "StaffAttendance" ("id", "instituteId", "facultyId", "date", "status", "checkIn", "checkOut", "notes", "updatedAt")
         VALUES ($1, $2, $3, $4::DATE, $5, $6, $7, $8, NOW())
         ON CONFLICT ("facultyId", "date")
         DO UPDATE SET "status" = EXCLUDED."status",
                       "checkIn" = EXCLUDED."checkIn",
                       "checkOut" = EXCLUDED."checkOut",
                       "notes" = EXCLUDED."notes",
                       "updatedAt" = NOW()`,
        recordId,
        ctx.instituteId,
        item.facultyId,
        date,
        item.status || "PRESENT",
        item.checkIn || null,
        item.checkOut || null,
        item.notes || null
      );
    }

    return NextResponse.json({ ok: true, count: records.length });
  } catch (err: any) {
    console.error("Error saving staff attendance:", err);
    return NextResponse.json({ error: "Failed to save staff attendance records" }, { status: 500 });
  }
}
