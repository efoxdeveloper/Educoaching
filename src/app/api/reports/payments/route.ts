import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const ctx = await requirePermission("payments:write");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const q = searchParams.get("q")?.trim() || "";
  const method = searchParams.get("method") || "";
  const courseId = searchParams.get("courseId") || undefined;
  const batchId = searchParams.get("batchId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const branchId = ctx.branchId as string;
  const instituteId = ctx.instituteId;

  // Build where for Payment with branch isolation via student.branchId
  const where: any = {
    instituteId,
    ...(branchId ? { student: { branchId } } : {}),
  };

  if (startDate || endDate) {
    where.paidAt = {};
    if (startDate) where.paidAt.gte = new Date(startDate);
    if (endDate) where.paidAt.lte = new Date(endDate);
  }

  if (courseId) {
    where.student = { ...(where.student || {}), courseId };
  }
  if (batchId) {
    where.student = { ...(where.student || {}), batchId };
  }

  if (method && method !== "ALL") {
    where.method = method;
  }

  if (q) {
    // Search across student name, mobile, course name, method
    // Prisma OR across relations
    where.OR = [
      { student: { name: { contains: q, mode: "insensitive" as const } } },
      { student: { mobile: { contains: q } } },
      { student: { course: { name: { contains: q, mode: "insensitive" as const } } } },
      { method: { contains: q, mode: "insensitive" as const } },
    ];
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              mobile: true,
              courseId: true,
              batchId: true,
              course: { select: { name: true } },
              batch: { select: { name: true } },
            },
          },
        },
        orderBy: { paidAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const payments = rows.map((p) => ({
      id: p.id,
      studentName: p.student.name,
      studentMobile: p.student.mobile,
      courseName: p.student.course.name,
      batchName: p.student.batch?.name ?? "—",
      amount: Number(p.amount),
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      note: p.note,
    }));

    return NextResponse.json({
      payments,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Error fetching paginated payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
