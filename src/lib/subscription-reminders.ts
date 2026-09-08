import { prisma } from "@/lib/prisma";
import { daysLeft } from "@/lib/subscription";
import { sendSubscriptionExpiryEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

/**
 * Finds institutes whose free trial or paid subscription period is ending within 3 days
 * (or already past) and hasn't yet received an expiry reminder this billing cycle.
 *
 * Sends a reminder email, sets expiryReminderSentAt = now(), and writes an audit log.
 * Also flips platformSubscriptionStatus to EXPIRED for institutes whose trial or paid period
 * has already passed.
 */
export async function processSubscriptionExpiryReminders() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // 1. Find ACTIVE institutes eligible for an expiry reminder
  const institutesToRemind = await prisma.institute.findMany({
    where: {
      status: "ACTIVE",
      expiryReminderSentAt: null,
      OR: [
        {
          billingCycle: "TRIAL",
          trialEndsAt: { lte: threeDaysFromNow },
        },
        {
          billingCycle: { in: ["MONTHLY", "QUARTERLY", "YEARLY"] },
          currentPeriodEnd: { not: null, lte: threeDaysFromNow },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      ownerName: true,
      email: true,
      billingCycle: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      platformSubscriptionStatus: true,
    },
  });

  const reminderResults = [];

  for (const inst of institutesToRemind) {
    const isTrial = inst.billingCycle === "TRIAL";
    const endDate = isTrial ? inst.trialEndsAt : inst.currentPeriodEnd;

    if (!endDate) continue;

    const remaining = daysLeft(endDate) ?? 0;
    const daysRemaining = Math.max(0, remaining);

    let emailSent = false;
    let emailError: string | null = null;

    try {
      const emailRes = await sendSubscriptionExpiryEmail({
        to: inst.email,
        ownerName: inst.ownerName,
        instituteName: inst.name,
        billingCycle: inst.billingCycle,
        endDate: new Date(endDate),
        daysRemaining,
        isTrial,
      });
      emailSent = Boolean(emailRes.sent);
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Email sending error";
    }

    // Set expiryReminderSentAt so it only sends once per billing cycle
    await prisma.institute.update({
      where: { id: inst.id },
      data: { expiryReminderSentAt: now },
    });

    await logAudit({
      instituteId: inst.id,
      actor: { name: "Automated Daily Cron", role: "CRON" },
      action: isTrial ? "TRIAL_EXPIRY_REMINDER_SENT" : "SUBSCRIPTION_EXPIRY_REMINDER_SENT",
      entityType: "Institute",
      entityId: inst.id,
      metadata: {
        billingCycle: inst.billingCycle,
        endDate: endDate.toISOString(),
        daysRemaining,
        emailSent,
        emailError,
      },
    });

    reminderResults.push({
      instituteId: inst.id,
      name: inst.name,
      email: inst.email,
      billingCycle: inst.billingCycle,
      daysRemaining,
      emailSent,
    });
  }

  // 2. For institutes whose trial or subscription period has elapsed, flip status to EXPIRED in the DB
  const expiredTrialsResult = await prisma.institute.updateMany({
    where: {
      status: "ACTIVE",
      platformSubscriptionStatus: { not: "EXPIRED" },
      billingCycle: "TRIAL",
      trialEndsAt: { lt: now },
    },
    data: {
      platformSubscriptionStatus: "EXPIRED",
    },
  });

  const expiredPaidResult = await prisma.institute.updateMany({
    where: {
      status: "ACTIVE",
      platformSubscriptionStatus: { not: "EXPIRED" },
      billingCycle: { in: ["MONTHLY", "QUARTERLY", "YEARLY"] },
      currentPeriodEnd: { not: null, lt: now },
    },
    data: {
      platformSubscriptionStatus: "EXPIRED",
    },
  });

  const totalStatusExpired = expiredTrialsResult.count + expiredPaidResult.count;

  return {
    remindersSent: reminderResults.length,
    reminders: reminderResults,
    statusFlippedToExpired: totalStatusExpired,
    expiredTrials: expiredTrialsResult.count,
    expiredPaid: expiredPaidResult.count,
  };
}
