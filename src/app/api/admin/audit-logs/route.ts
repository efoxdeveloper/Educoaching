import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";

const PAGE_SIZE = 50;

// Platform-admin-only view across every institute's audit trail. Supports
// ?instituteId= to narrow to one tenant and ?cursor= (an AuditLog id) for
// simple keyset pagination through older entries.
export async function GET(req: Request) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const instituteId = searchParams.get("instituteId");
  const cursor = searchParams.get("cursor");

  const logs = await prisma.auditLog.findMany({
    where: instituteId ? { instituteId } : undefined,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      institute: { select: { id: true, name: true } },
    },
  });

  const nextCursor = logs.length === PAGE_SIZE ? logs[logs.length - 1].id : null;

  return NextResponse.json({ logs, nextCursor });
}