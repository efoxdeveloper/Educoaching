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
      branch: { select: { id: true, name: true } },
      replies: { orderBy: { sentAt: "asc" }, include: { sentByAdmin: { select: { name: true, email: true } } } },
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
  const userRole = String((ctx.session?.user as { role?: string })?.role || "").toUpperCase();
  const userEmail = (ctx.session?.user as { email?: string })?.email || null;
  // Try to get mobile from User or Student record
  let userMobile: string | null = null;
  try {
    const u = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }) : null;
    // For student/parent, try student table
    if (userEmail) {
      const s = await prisma.student.findFirst({ where: { email: userEmail, instituteId: ctx.instituteId }, select: { mobile: true, parentMobile: true } });
      if (s) userMobile = s.mobile || s.parentMobile || null;
    }
  } catch {}

  const ticket = await prisma.supportTicket.create({
    data: {
      instituteId: ctx.instituteId,
      branchId: ctx.branchId as string | null,
      userId,
      userRole,
      subject: subject.trim(),
      description: description.trim(),
      contactEmail: userEmail,
      contactMobile: userMobile,
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
