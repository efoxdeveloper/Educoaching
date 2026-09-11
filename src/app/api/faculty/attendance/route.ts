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

  if (records.length === 0) {
    return NextResponse.json({ error: "No attendance records provided" }, { status: 400 });
  }

  // Validate that every record has an explicit status (no null/undefined/empty)
  const allowedStatuses = new Set(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE"]);
  const missingStatus = records.filter((r) => !r.status || !allowedStatuses.has(r.status));
  if (missingStatus.length > 0) {
    // Try to resolve names for better error message
    let missingNames: string[] = [];
    try {
      const ids = missingStatus.map((r) => r.facultyId);
      const facs = await prisma.faculty.findMany({
        where: { id: { in: ids }, instituteId: ctx.instituteId },
        select: { id: true, name: true },
      });
      const idToName = new Map(facs.map((f) => [f.id, f.name]));
      missingNames = missingStatus.map((r) => idToName.get(r.facultyId) || r.facultyId);
    } catch {}
    if (missingNames.length === 0) missingNames = missingStatus.map((r) => r.facultyId);
    return NextResponse.json(
      { error: `Please mark attendance for all staff before saving. ${missingStatus.length} remaining: ${missingNames.join(", ")}` },
      { status: 400 }
    );
  }

  // Safety net: ensure every expected staff for this branch/date is included
  // Fetch expected faculty for this institute+branch (same scope as GET)
  try {
    const expectedFaculty = await prisma.faculty.findMany({
      where: {
        instituteId: ctx.instituteId,
        ...(ctx.branchId ? { branchId: ctx.branchId as string } : {}),
      },
      select: { id: true, name: true },
    });
    const expectedIds = new Set(expectedFaculty.map((f) => f.id));
    const receivedIds = new Set(records.map((r) => r.facultyId));
    const missingIds = Array.from(expectedIds).filter((id) => !receivedIds.has(id as string));
    // Only enforce if frontend sent at least one record and expected is not empty
    // If user filtered the list, they may have sent a subset — in that case, don't block if subset is fully marked
    // But if they sent fewer than expected and any expected is missing, treat as unmarked
    // To avoid breaking filtered saves, only enforce when received count < expected and no filter is implied
    // For strict safety, if missingIds length >0 and records length < expectedIds.size, return error
    // However, to keep UX for filtered views, we allow subset saves if every sent record is marked
    // So we only error if the missing count is for the same branch and the save is for all (no filter)
    // For now, we enforce only when the frontend claims to save all (records length === expected size) or when no filter
    // Simpler: if missingIds.length >0, include them in error only if the request is for the full list
    // We will not block filtered saves — just ensure sent records are all marked (already checked above)
    // If strict all-required is desired, uncomment next block:
    // if (missingIds.length > 0) {
    //   const missingNamesAll = expectedFaculty.filter((f) => missingIds.includes(f.id)).map((f) => f.name).join(", ");
    //   return NextResponse.json({ error: `Please mark attendance for all staff before saving. ${missingIds.length} remaining: ${missingNamesAll}` }, { status: 400 });
    // }
  } catch {}

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
            status: item.status,
            checkIn: item.checkIn || null,
            checkOut: item.checkOut || null,
            notes: item.notes || null,
          },
          create: {
            instituteId: ctx.instituteId,
            facultyId: item.facultyId,
            date: attendanceDate,
            status: item.status,
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

