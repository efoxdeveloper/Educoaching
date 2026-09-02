import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const campaigns = await prisma.bulkCommunication.findMany({
    where: { instituteId: ctx.instituteId },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ campaigns });
}
