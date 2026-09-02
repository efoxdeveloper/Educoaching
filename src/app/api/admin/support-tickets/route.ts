import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
  }

  const tickets = await prisma.supportTicket.findMany({
    include: {
      institute: {
        select: { id: true, name: true, email: true, mobile: true, ownerName: true },
      },
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}
