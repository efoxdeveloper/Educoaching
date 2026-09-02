import { prisma } from "@/lib/prisma";
import { sendFeeReminder } from "@/lib/whatsapp";
import { sendFeeReminderEmail } from "@/lib/email";
import { logAudit, type AuditActor } from "@/lib/audit";

export type ReminderCandidate = {
  id: string;
  name: string;
  mobile: string;
  parentMobile: string | null;
  email: string | null;
  parentEmail: string | null;
  courseName: string;
  totalFee: number;
  paidFee: number;
  dueAmount: number;
  dueDate: string | null;
  status: "OVERDUE" | "DUE_SOON" | "PENDING";
  lastReminderSentAt?: string | null;
};

/**
 * Identifies active students who have outstanding dues.
 */
export async function getFeeReminderCandidates(instituteId: string): Promise<ReminderCandidate[]> {
  const students = await prisma.student.findMany({
    where: {
      instituteId,
      status: "ACTIVE",
    },
    include: {
      course: { select: { name: true } },
      feeReminderLogs: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { sentAt: true },
      },
    },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threeDaysAhead = new Date(today);
  threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);

  const candidates: ReminderCandidate[] = [];

  for (const s of students) {
    const total = Number(s.totalFee);
    const paid = Number(s.paidFee);
    const dueAmount = Math.max(total - paid, 0);

    if (dueAmount <= 0) continue; // no balance due

    let status: "OVERDUE" | "DUE_SOON" | "PENDING" = "PENDING";
    if (s.dueDate) {
      const d = new Date(s.dueDate);
      const dueDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (dueDateOnly < today) {
        status = "OVERDUE";
      } else if (dueDateOnly <= threeDaysAhead) {
        status = "DUE_SOON";
      }
    }

    candidates.push({
      id: s.id,
      name: s.name,
      mobile: s.mobile,
      parentMobile: s.parentMobile,
      email: s.email,
      parentEmail: s.parentEmail,
      courseName: s.course.name,
      totalFee: total,
      paidFee: paid,
      dueAmount,
      dueDate: s.dueDate ? s.dueDate.toISOString() : null,
      status,
      lastReminderSentAt: s.feeReminderLogs[0]?.sentAt ? s.feeReminderLogs[0].sentAt.toISOString() : null,
    });
  }

  // Sort by priority: OVERDUE first, then DUE_SOON, then largest due amount
  return candidates.sort((a, b) => {
    const priority = { OVERDUE: 0, DUE_SOON: 1, PENDING: 2 };
    if (priority[a.status] !== priority[b.status]) {
      return priority[a.status] - priority[b.status];
    }
    return b.dueAmount - a.dueAmount;
  });
}

/**
 * Dispatches automated fee reminders to candidate students.
 */
export async function dispatchFeeReminders(params: {
  instituteId: string;
  studentIds?: string[];
  channel: "WHATSAPP" | "EMAIL" | "ALL";
  filter?: "OVERDUE" | "DUE_SOON" | "ALL";
  actor?: AuditActor;
}) {
  const { instituteId, studentIds, channel, filter = "ALL", actor } = params;

  const candidates = await getFeeReminderCandidates(instituteId);

  // Filter candidates
  const eligible = candidates.filter((c) => {
    if (studentIds && studentIds.length > 0) {
      return studentIds.includes(c.id);
    }
    if (filter === "OVERDUE") return c.status === "OVERDUE";
    if (filter === "DUE_SOON") return c.status === "DUE_SOON" || c.status === "OVERDUE";
    return true;
  });

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { name: true },
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const logs: Array<{ studentId: string; studentName: string; channel: string; status: string }> = [];

  for (const item of eligible) {
    const dueDateStr = item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-IN") : null;
    let didSend = false;

    // WhatsApp Dispatch
    if (channel === "WHATSAPP" || channel === "ALL") {
      const targetPhone = item.parentMobile || item.mobile;
      if (targetPhone) {
        try {
          const res = await sendFeeReminder(targetPhone, item.name, item.dueAmount, dueDateStr);
          await prisma.feeReminderLog.create({
            data: {
              instituteId,
              studentId: item.id,
              channel: "WHATSAPP",
              recipient: targetPhone,
              amountDue: item.dueAmount,
              dueDate: item.dueDate ? new Date(item.dueDate) : null,
              status: res.sent ? "SENT" : "FAILED",
              message: `WhatsApp fee reminder of Rs.${item.dueAmount}`,
            },
          });
          if (res.sent) {
            didSend = true;
            logs.push({ studentId: item.id, studentName: item.name, channel: "WHATSAPP", status: "SENT" });
          } else {
            logs.push({ studentId: item.id, studentName: item.name, channel: "WHATSAPP", status: "FAILED" });
          }
        } catch {
          logs.push({ studentId: item.id, studentName: item.name, channel: "WHATSAPP", status: "ERROR" });
        }
      }
    }

    // Email Dispatch
    if (channel === "EMAIL" || channel === "ALL") {
      const targetEmail = item.parentEmail || item.email;
      if (targetEmail) {
        try {
          const res = await sendFeeReminderEmail({
            to: targetEmail,
            studentName: item.name,
            courseName: item.courseName,
            dueAmount: item.dueAmount,
            dueDate: dueDateStr,
            instituteName: institute?.name || "Vidyalaya Institute",
          });
          await prisma.feeReminderLog.create({
            data: {
              instituteId,
              studentId: item.id,
              channel: "EMAIL",
              recipient: targetEmail,
              amountDue: item.dueAmount,
              dueDate: item.dueDate ? new Date(item.dueDate) : null,
              status: res.sent ? "SENT" : "FAILED",
              message: `Email reminder for ${item.name} (${item.courseName}) of Rs.${item.dueAmount}`,
            },
          });
          if (res.sent) {
            didSend = true;
            logs.push({ studentId: item.id, studentName: item.name, channel: "EMAIL", status: "SENT" });
          } else {
            logs.push({ studentId: item.id, studentName: item.name, channel: "EMAIL", status: "FAILED" });
          }
        } catch {
          logs.push({ studentId: item.id, studentName: item.name, channel: "EMAIL", status: "ERROR" });
        }
      }
    }

    if (didSend) {
      sentCount++;
    } else if (!item.parentMobile && !item.mobile && !item.parentEmail && !item.email) {
      skippedCount++;
    } else {
      failedCount++;
    }
  }

  await logAudit({
    instituteId,
    actor: actor || { name: "Fee Reminder Engine", role: "SYSTEM" },
    action: "FEE_REMINDERS_SENT",
    entityType: "FeeReminder",
    metadata: {
      channel,
      filter,
      totalTargeted: eligible.length,
      sentCount,
      failedCount,
      skippedCount,
    },
  });

  return {
    totalEligible: eligible.length,
    sentCount,
    failedCount,
    skippedCount,
    logs,
  };
}
