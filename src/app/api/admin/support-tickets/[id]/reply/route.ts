import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendSupportTicketReply } from "@/lib/email";
import { sendSupportTicketWhatsAppReply, isWhatsAppConfigured } from "@/lib/whatsapp";
import { isEmailConfigured } from "@/lib/email";

export async function POST(
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
  const { channel, message, subject, status } = body as {
    channel?: string;
    message?: string;
    subject?: string;
    status?: string;
  };

  if (!message || !String(message).trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const validChannels = ["EMAIL", "WHATSAPP", "IN_APP"];
  const ch = (channel || "IN_APP").toUpperCase();
  if (!validChannels.includes(ch)) {
    return NextResponse.json({ error: "Invalid channel. Must be EMAIL, WHATSAPP, or IN_APP" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      institute: { select: { name: true, email: true, mobile: true } },
      user: { select: { email: true, name: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const adminId = (session.user as { id?: string })?.id || null;
  let sendResult: any = { sent: true, simulated: true };

  if (ch === "EMAIL") {
    if (!isEmailConfigured()) {
      // Still record reply but flag not configured
      sendResult = { sent: false, reason: "not_configured" };
    } else {
      const to = (ticket as any).contactEmail || ticket.user?.email || (ticket.institute as any).email;
      if (!to) return NextResponse.json({ error: "No email available for this ticket raiser" }, { status: 400 });
      const emailSubject = subject?.trim() || `Re: ${ticket.subject} [#${ticket.id.slice(-6).toUpperCase()}]`;
      sendResult = await sendSupportTicketReply({
        to,
        ticketId: ticket.id,
        subject: emailSubject,
        message: String(message).trim(),
        instituteName: ticket.institute.name,
        ticketSubject: ticket.subject,
      });
    }
  } else if (ch === "WHATSAPP") {
    // IMPORTANT: sandbox only accepts pre-approved template — free-form ticket replies need real template
    const mobile = (ticket as any).contactMobile || (ticket.institute as any).mobile;
    if (!mobile) return NextResponse.json({ error: "No mobile number available for this ticket raiser" }, { status: 400 });
    if (!isWhatsAppConfigured()) {
      sendResult = { sent: false, reason: "not_configured", details: "WhatsApp not configured or sandbox template not approved for ticket replies — requires approved template/upgraded sender" };
    } else {
      sendResult = await sendSupportTicketWhatsAppReply({ to: mobile, ticketId: ticket.id, message: String(message).trim() });
      if (!sendResult.sent) {
        // Check if failure due to sandbox template mismatch
        sendResult.details = "WhatsApp send failed — ticket replies require a real approved WhatsApp template (sandbox only allows appointment pattern). Upgrade Twilio sender or add template.";
      }
    }
  } else {
    // IN_APP — just record, no external send, but create notification
    sendResult = { sent: true, inApp: true };
  }

  // Record reply thread
  const reply = await prisma.supportTicketReply.create({
    data: {
      ticketId: ticket.id,
      sentByAdminId: adminId,
      channel: ch,
      message: String(message).trim(),
      subject: subject?.trim() || null,
    },
    include: { sentByAdmin: { select: { name: true, email: true } } },
  });

  // Update ticket status if provided, or auto-set to IN_PROGRESS if was OPEN
  let newStatus = status;
  if (!newStatus && ticket.status === "OPEN") newStatus = "IN_PROGRESS";
  if (newStatus) {
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (validStatuses.includes(newStatus)) {
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: newStatus } });
    }
  }

  // Notify raiser in-app (bell)
  try {
    await prisma.platformNotification.create({
      data: {
        instituteId: ticket.instituteId,
        type: "SUPPORT_REPLY",
        message: `Support ticket "${ticket.subject}" received a reply via ${ch}: ${String(message).trim().slice(0, 120)}`,
      },
    });
  } catch {}

  return NextResponse.json({
    success: true,
    reply: {
      id: reply.id,
      channel: reply.channel,
      message: reply.message,
      subject: reply.subject,
      sentAt: reply.sentAt.toISOString(),
      sentByAdmin: reply.sentByAdmin,
    },
    sendResult,
    // Flag for UI to show not-configured warning
    warning: sendResult.reason === "not_configured" ? `${ch} not configured — reply recorded but not sent. Configure ${ch === "EMAIL" ? "SMTP" : "Twilio WhatsApp"} in .env` : sendResult.details || null,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      institute: { select: { id: true, name: true, email: true, mobile: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
      branch: { select: { id: true, name: true } },
      replies: { orderBy: { sentAt: "asc" }, include: { sentByAdmin: { select: { name: true, email: true } } } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json(ticket);
}
