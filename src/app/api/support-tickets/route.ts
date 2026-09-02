import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const tickets = await prisma.supportTicket.findMany({
    where: { instituteId: ctx.instituteId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const { subject, description } = body as {
    subject?: string;
    description?: string;
  };

  if (!subject || !subject.trim()) {
    return NextResponse.json({ error: "Please enter a subject for your support ticket." }, { status: 400 });
  }

  if (!description || !description.trim()) {
    return NextResponse.json({ error: "Please provide a description of the issue or question." }, { status: 400 });
  }

  const userId = (ctx.session?.user as { id?: string } | undefined)?.id || null;

  const ticket = await prisma.supportTicket.create({
    data: {
      instituteId: ctx.instituteId,
      userId,
      subject: subject.trim(),
      description: description.trim(),
      status: "OPEN",
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "SUPPORT_TICKET_CREATED",
    entityType: "SupportTicket",
    entityId: ticket.id,
    metadata: {
      subject: ticket.subject,
      status: ticket.status,
    },
  });

  return NextResponse.json({ success: true, ticket }, { status: 201 });
}
