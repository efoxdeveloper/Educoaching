import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: string };

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be OPEN, IN_PROGRESS, RESOLVED, or CLOSED." },
      { status: 400 }
    );
  }

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
    },
    include: {
      institute: {
        select: { id: true, name: true, email: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({ success: true, ticket });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  await prisma.supportTicket.delete({ where: { id } });

  return NextResponse.json({ success: true, deletedId: id });
}
