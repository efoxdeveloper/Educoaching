import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCustomAlert } from "@/lib/whatsapp";
import { sendBroadcastEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

/**
 * Automated Cron Job: Dispatches live class reminders 15 minutes before scheduledAt.
 * Guaranteed idempotency via `reminderSent: true` flag.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron access" }, { status: 401 });
  }

  const now = new Date();
  const fifteenMinutesLater = new Date(now.getTime() + 16 * 60 * 1000); // 16 mins buffer

  // Find classes scheduled between now and 16 minutes from now that haven't been reminded
  const upcomingClasses = await prisma.liveClass.findMany({
    where: {
      status: "SCHEDULED",
      reminderSent: false,
      scheduledAt: {
        gte: now,
        lte: fifteenMinutesLater,
      },
    },
    include: {
      institute: { select: { id: true, name: true, status: true } },
      batch: {
        include: {
          students: {
            where: { status: "ACTIVE" },
            select: { id: true, name: true, mobile: true, email: true, parentMobile: true },
          },
        },
      },
      faculty: { select: { id: true, name: true } },
    },
  });

  let totalNotified = 0;
  const processedClasses: string[] = [];

  for (const liveClass of upcomingClasses) {
    if (liveClass.institute.status !== "ACTIVE") continue;

    // Mark reminderSent atomically first to avoid race conditions
    await prisma.liveClass.update({
      where: { id: liveClass.id },
      data: { reminderSent: true, status: "LIVE" },
    });

    const students = liveClass.batch?.students || [];
    const facultyName = liveClass.faculty?.name || "Teacher";
    const className = liveClass.title;
    const meetingLink = liveClass.meetingLink;
    const subject = liveClass.subject || "Class Lecture";

    for (const student of students) {
      const recipientPhone = student.parentMobile || student.mobile;
      if (recipientPhone) {
        try {
          await sendCustomAlert(
            recipientPhone,
            student.name,
            `🔴 LIVE CLASS STARTING in 15 mins!\nSubject: ${subject}\nTopic: ${className}\nFaculty: ${facultyName}\nJoin Link: ${meetingLink}`
          );
          totalNotified++;
        } catch (err) {
          console.error(`[cron/live-class-reminders] WhatsApp failed for ${student.name}:`, err);
        }
      }

      if (student.email) {
        try {
          await sendBroadcastEmail({
            to: student.email,
            subject: `🔴 Live Class Starting in 15 mins: ${subject} — ${className}`,
            message: `Hello ${student.name},\n\nYour live class on "${className}" (${subject}) conducted by ${facultyName} is starting in 15 minutes.\n\nClick here to join:\n${meetingLink}\n\nPlease join on time with your notes and pen ready.`,
            recipientName: student.name,
            instituteName: liveClass.institute.name,
          });
        } catch (err) {
          console.error(`[cron/live-class-reminders] Email failed for ${student.name}:`, err);
        }
      }
    }

    processedClasses.push(liveClass.id);

    await logAudit({
      instituteId: liveClass.instituteId,
      actor: { name: "Live Class Reminder Cron", role: "SYSTEM" },
      action: "LIVE_CLASS_REMINDERS_SENT",
      entityType: "LiveClass",
      entityId: liveClass.id,
      metadata: {
        title: liveClass.title,
        studentsNotified: students.length,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    processedCount: upcomingClasses.length,
    classesReminded: processedClasses,
    totalStudentsNotified: totalNotified,
  });
}
