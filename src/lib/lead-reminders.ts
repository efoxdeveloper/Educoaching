import { prisma } from "@/lib/prisma";
import { sendLeadFollowUpReminder } from "@/lib/whatsapp";
import { sendLeadFollowUpReminderEmail } from "@/lib/email";
import { logAudit, type AuditActor } from "@/lib/audit";

export type LeadReminderCandidate = {
  id: string;
  applicantName: string;
  mobile: string;
  email: string | null;
  assignedTo: string | null;
  courseName: string;
  priority: string;
  stage: string;
  nextFollowUpDate: string | null;
  lastFollowUpNote: string | null;
  isOverdue: boolean;
  isToday: boolean;
};

/**
 * Finds all active Admission leads where nextFollowUpDate is today or overdue
 * and status is not final (ENROLLED / REJECTED).
 */
export async function getLeadReminderCandidates(instituteId: string): Promise<LeadReminderCandidate[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const admissions = await prisma.admission.findMany({
    where: {
      instituteId,
      status: {
        notIn: ["ENROLLED", "REJECTED"],
      },
      nextFollowUpDate: {
        lte: todayEnd,
        not: null,
      },
    },
    include: {
      course: { select: { name: true } },
      followUps: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { notes: true, counsellor: true },
      },
    },
    orderBy: {
      nextFollowUpDate: "asc",
    },
  });

  const candidates: LeadReminderCandidate[] = admissions.map((a) => {
    const followUpDate = a.nextFollowUpDate ? new Date(a.nextFollowUpDate) : null;
    const isOverdue = followUpDate ? followUpDate < todayStart : false;
    const isToday = followUpDate ? followUpDate >= todayStart && followUpDate <= todayEnd : false;

    return {
      id: a.id,
      applicantName: a.applicantName,
      mobile: a.mobile,
      email: a.email,
      assignedTo: a.assignedTo || null,
      courseName: a.course?.name || "General Course",
      priority: a.priority,
      stage: a.stage,
      nextFollowUpDate: a.nextFollowUpDate ? a.nextFollowUpDate.toISOString() : null,
      lastFollowUpNote: a.followUps[0]?.notes || a.note || null,
      isOverdue,
      isToday,
    };
  });

  // Sort by priority: HOT first, then WARM, then COLD, with Overdue prioritized
  const priorityScore = { HOT: 0, WARM: 1, COLD: 2 };
  return candidates.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) {
      return a.isOverdue ? -1 : 1;
    }
    const pA = priorityScore[a.priority as keyof typeof priorityScore] ?? 1;
    const pB = priorityScore[b.priority as keyof typeof priorityScore] ?? 1;
    return pA - pB;
  });
}

/**
 * Dispatches automated or manual lead follow-up reminders to counsellors.
 */
export async function dispatchLeadReminders(params: {
  instituteId: string;
  channel?: "WHATSAPP" | "EMAIL" | "ALL";
  actor?: AuditActor;
}) {
  const { instituteId, channel = "ALL", actor } = params;

  const [candidates, institute, facultyList] = await Promise.all([
    getLeadReminderCandidates(instituteId),
    prisma.institute.findUnique({
      where: { id: instituteId },
      select: { id: true, name: true, email: true, mobile: true, ownerName: true },
    }),
    prisma.faculty.findMany({
      where: { instituteId, status: "ACTIVE" },
      select: { id: true, name: true, email: true, mobile: true, roleType: true },
    }),
  ]);

  if (candidates.length === 0) {
    return {
      totalEligible: 0,
      sentCount: 0,
      failedCount: 0,
      candidates: [],
    };
  }

  const instName = institute?.name || "Vidyalaya Institute";

  // Group candidates by counsellor name (or "Unassigned")
  const groups = new Map<string, LeadReminderCandidate[]>();
  for (const c of candidates) {
    const key = c.assignedTo?.trim() || "Unassigned";
    const list = groups.get(key) || [];
    list.push(c);
    groups.set(key, list);
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const [counsellorKey, leads] of Array.from(groups.entries())) {
    // Find matching staff contact
    const matchingStaff = facultyList.find(
      (f) => f.name.toLowerCase() === counsellorKey.toLowerCase()
    );

    const targetEmail = matchingStaff?.email || (counsellorKey === "Unassigned" ? institute?.email : null);
    const targetMobile = matchingStaff?.mobile || (counsellorKey === "Unassigned" ? institute?.mobile : null);
    const displayName = matchingStaff?.name || (counsellorKey === "Unassigned" ? `${institute?.ownerName || "Admissions Team"} (Unassigned Leads)` : counsellorKey);

    let counsellorNotified = false;

    // 1. Email Dispatch
    if ((channel === "EMAIL" || channel === "ALL") && targetEmail) {
      try {
        const res = await sendLeadFollowUpReminderEmail({
          to: targetEmail,
          counsellorName: displayName,
          instituteName: instName,
          leads: leads.map((l) => ({
            applicantName: l.applicantName,
            mobile: l.mobile,
            courseName: l.courseName,
            priority: l.priority,
            dueDate: l.isOverdue ? "OVERDUE" : "Today",
            note: l.lastFollowUpNote,
          })),
        });
        if (res.sent) {
          counsellorNotified = true;
        }
      } catch (err) {
        console.error(`[lead-reminders] Failed to send email to ${targetEmail}:`, err);
      }
    }

    // 2. WhatsApp Dispatch
    if ((channel === "WHATSAPP" || channel === "ALL") && targetMobile) {
      try {
        const leadsSummary = leads
          .slice(0, 5)
          .map((l, idx) => `${idx + 1}. ${l.applicantName} (${l.courseName}) - Ph: ${l.mobile} [${l.priority}]`)
          .join("\n") + (leads.length > 5 ? `\n...and ${leads.length - 5} more.` : "");

        const res = await sendLeadFollowUpReminder({
          counsellorMobile: targetMobile,
          counsellorName: displayName,
          instituteName: instName,
          leadsCount: leads.length,
          leadsSummary,
        });
        if (res.sent) {
          counsellorNotified = true;
        }
      } catch (err) {
        console.error(`[lead-reminders] Failed to send WhatsApp to ${targetMobile}:`, err);
      }
    }

    if (counsellorNotified) {
      sentCount += leads.length;
    } else {
      failedCount += leads.length;
    }
  }

  await logAudit({
    instituteId,
    actor: actor || { name: "Lead Reminder Engine", role: "SYSTEM" },
    action: "LEAD_REMINDERS_SENT",
    entityType: "LeadReminder",
    metadata: {
      channel,
      totalTargeted: candidates.length,
      sentCount,
      failedCount,
      groupsCount: groups.size,
    },
  });

  return {
    totalEligible: candidates.length,
    sentCount,
    failedCount,
    candidates,
  };
}
