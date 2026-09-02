import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { sendCustomAlert } from "@/lib/whatsapp";
import { sendBroadcastEmail } from "@/lib/email";
import { sendInstituteSms } from "@/lib/sms";
import { CommunicationChannel, TargetAudience, Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const ctx = await requirePermission("communication:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    title,
    channel = "WHATSAPP",
    targetAudience = "ALL_STUDENTS",
    filterDetails = {},
    message,
  } = body;

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Title and message content are required." }, { status: 400 });
  }

  const validChannel = Object.values(CommunicationChannel).includes(channel)
    ? (channel as CommunicationChannel)
    : CommunicationChannel.WHATSAPP;

  const validAudience = Object.values(TargetAudience).includes(targetAudience)
    ? (targetAudience as TargetAudience)
    : TargetAudience.ALL_STUDENTS;

  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { name: true },
  });

  const instituteName = institute?.name || "Vidyalaya Institute";

  // Fetch recipients based on audience
  type Recipient = {
    id: string;
    name: string;
    mobile: string;
    parentMobile: string | null;
    email: string | null;
    courseName?: string;
    batchName?: string;
    dueAmount?: number;
  };

  const recipients: Recipient[] = [];
  const { courseId, batchId, leadStage } = filterDetails;

  if (validAudience === "ADMISSION_LEADS") {
    const where: Prisma.AdmissionWhereInput = { instituteId: ctx.instituteId };
    if (leadStage) where.stage = leadStage;
    if (courseId) where.courseId = courseId;

    const leads = await prisma.admission.findMany({
      where,
      include: { course: { select: { name: true } }, batch: { select: { name: true } } },
    });

    for (const l of leads) {
      recipients.push({
        id: l.id,
        name: l.applicantName,
        mobile: l.mobile,
        parentMobile: null,
        email: l.email,
        courseName: l.course?.name,
        batchName: l.batch?.name,
        dueAmount: Number(l.feePlan),
      });
    }
  } else {
    const where: Prisma.StudentWhereInput = {
      instituteId: ctx.instituteId,
      status: "ACTIVE",
    };
    if (courseId) where.courseId = courseId;
    if (batchId) where.batchId = batchId;

    const students = await prisma.student.findMany({
      where,
      include: { course: { select: { name: true } }, batch: { select: { name: true } } },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const s of students) {
      const total = Number(s.totalFee);
      const paid = Number(s.paidFee);
      const due = Math.max(total - paid, 0);

      if (validAudience === "FEE_PENDING" && due <= 0) continue;
      if (validAudience === "FEE_OVERDUE") {
        if (due <= 0) continue;
        if (!s.dueDate || new Date(s.dueDate) >= today) continue;
      }

      recipients.push({
        id: s.id,
        name: s.name,
        mobile: s.mobile,
        parentMobile: s.parentMobile,
        email: s.email,
        courseName: s.course.name,
        batchName: s.batch?.name,
        dueAmount: due,
      });
    }
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const r of recipients) {
    // Interpolate message supporting all new & existing template tags
    const personalizedMessage = message
      .replace(/\{Student Name\}|\{name\}/gi, r.name)
      .replace(/\{Institute Name\}|\{institute_name\}/gi, instituteName)
      .replace(/\{course\}/gi, r.courseName || "your course")
      .replace(/\{batch\}/gi, r.batchName || "your batch")
      .replace(/\{due_amount\}/gi, r.dueAmount ? `₹${r.dueAmount.toLocaleString("en-IN")}` : "₹0")
      .replace(/\{Amount\}/gi, r.dueAmount ? `₹${r.dueAmount.toLocaleString("en-IN")}` : "₹0")
      .replace(/\{Pending\}/gi, r.dueAmount ? `₹${r.dueAmount.toLocaleString("en-IN")}` : "₹0")
      .replace(/\{userid\}/gi, r.email || r.mobile)
      .replace(/\{password\}/gi, "student123");

    try {
      if (validChannel === "WHATSAPP") {
        const phone = r.parentMobile || r.mobile;
        if (phone) {
          const res = await sendCustomAlert(phone, r.name, personalizedMessage);
          if (res.sent) sentCount++;
          else failedCount++;
        } else {
          failedCount++;
        }
      } else if (validChannel === "EMAIL") {
        if (r.email) {
          const res = await sendBroadcastEmail({
            to: r.email,
            subject: `${title} — ${instituteName}`,
            message: personalizedMessage,
            recipientName: r.name,
            instituteName,
          });
          if (res.sent) sentCount++;
          else failedCount++;
        } else {
          failedCount++;
        }
      } else {
        // SMS channel - BYOK provider dispatch
        const phone = r.parentMobile || r.mobile;
        if (phone) {
          const res = await sendInstituteSms(ctx.instituteId, {
            to: phone,
            templateName: "GENERAL_BROADCAST",
            message: personalizedMessage,
            variables: {
              name: r.name,
              institute_name: instituteName,
              due_amount: r.dueAmount ? `₹${r.dueAmount.toLocaleString("en-IN")}` : "₹0",
            },
          });
          if (res.sent) sentCount++;
          else failedCount++;
        } else {
          failedCount++;
        }
      }
    } catch {
      failedCount++;
    }
  }

  const user = ctx.session.user as { id?: string };

  const campaign = await prisma.bulkCommunication.create({
    data: {
      instituteId: ctx.instituteId,
      title: title.trim(),
      channel: validChannel,
      targetAudience: validAudience,
      filterDetails,
      message,
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      senderUserId: user.id || null,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "BROADCAST_SENT",
    entityType: "BulkCommunication",
    entityId: campaign.id,
    metadata: {
      title: campaign.title,
      channel: campaign.channel,
      audience: campaign.targetAudience,
      recipientCount: campaign.recipientCount,
      sentCount,
      failedCount,
    },
  });

  return NextResponse.json({
    ok: true,
    campaign,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
  });
}
