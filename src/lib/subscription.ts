export type ComputedPlanStatus = "TRIAL_ACTIVE" | "TRIAL_EXPIRED" | "SUBSCRIBED" | "SUBSCRIPTION_EXPIRED";

export function computePlanStatus(params: {
  plan: "DEMO" | "MONTHLY" | "QUARTERLY" | "INSTALLMENTS" | "ONE_TIME" | string;
  demoExpiresAt: Date | string | null;
  currentPeriodEnd: Date | string | null;
}): ComputedPlanStatus {
  const now = new Date();

  if (params.plan === "DEMO") {
    const expiry = params.demoExpiresAt ? new Date(params.demoExpiresAt) : null;
    if (expiry && expiry > now) return "TRIAL_ACTIVE";
    return "TRIAL_EXPIRED";
  }

  if (params.plan === "INSTALLMENTS" || params.plan === "ONE_TIME") {
    return "SUBSCRIBED";
  }

  const periodEnd = params.currentPeriodEnd ? new Date(params.currentPeriodEnd) : null;
  if (periodEnd && periodEnd > now) return "SUBSCRIBED";
  return "SUBSCRIPTION_EXPIRED";
}

export function planStatusLabel(status: ComputedPlanStatus) {
  const map: Record<ComputedPlanStatus, string> = {
    TRIAL_ACTIVE: "Demo (trial)",
    TRIAL_EXPIRED: "Demo expired",
    SUBSCRIBED: "Active",
    SUBSCRIPTION_EXPIRED: "Renewal due",
  };
  return map[status];
}

export function daysLeft(date: Date | string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const DEMO_PERIOD_DAYS = 7;
export const RENEWAL_PERIOD_DAYS = 30; // 1 month
export const QUARTERLY_RENEWAL_PERIOD_DAYS = 90; // 1 quarter / 3 months
export const ANNUAL_RENEWAL_PERIOD_DAYS = 365; // 1 year

// Adds calendar months to a date - used for platform subscription periods
// (quarterly/yearly), where "30 days x 3" would drift from real billing
// months. JS Date handles month overflow (e.g. Jan 31 + 1 month) correctly.
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Pure function to determine if an institute's platform subscription or free trial
 * has elapsed. Safe for Edge runtime and middleware (no database/Prisma imports).
 *
 * Rules:
 * - TRIAL: checks trialEndsAt < now
 * - MONTHLY / QUARTERLY / YEARLY: checks currentPeriodEnd < now
 * - Fails open (returns false) if no end-date is set
 */
export function isInstituteSubscriptionExpired(params: {
  billingCycle?: "TRIAL" | "MONTHLY" | "QUARTERLY" | "YEARLY" | string | null;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  now?: Date;
}): boolean {
  const now = params.now ? new Date(params.now) : new Date();
  const cycle = params.billingCycle ? String(params.billingCycle).toUpperCase() : "TRIAL";

  if (cycle === "TRIAL") {
    if (!params.trialEndsAt) {
      return false; // fail open if no end-date set
    }
    const trialEnd = new Date(params.trialEndsAt);
    if (isNaN(trialEnd.getTime())) return false;
    return trialEnd.getTime() < now.getTime();
  }

  // Paid plans (MONTHLY, QUARTERLY, YEARLY, etc.)
  if (!params.currentPeriodEnd) {
    return false; // fail open if no end-date set
  }
  const periodEnd = new Date(params.currentPeriodEnd);
  if (isNaN(periodEnd.getTime())) return false;
  return periodEnd.getTime() < now.getTime();
}

/**
 * Pure route-gate function for middleware.
 * Confines expired institute staff (OWNER, ADMIN, STAFF, FACULTY, ACCOUNTANT, COUNSELLOR, TECHNICIAN)
 * to only /plans and /settings.
 *
 * Rules:
 * - If not expired -> false (not restricted)
 * - Never restricts STUDENT, PARENT, or PLATFORM_ADMIN -> false
 * - Never restricts when platform admin is impersonating an institute -> false
 * - Never restricts /plans or /settings routes (or their subpaths) -> false
 * - Allows essential subscription & settings APIs -> false
 * - Restricts all other routes -> true (caller should redirect to /plans?expired=1 or return 402)
 */
export function isRouteRestrictedBySubscription(params: {
  pathname: string;
  role?: string | null;
  isImpersonating?: boolean;
  isExpired: boolean;
}): boolean {
  if (!params.isExpired) {
    return false;
  }

  const role = String(params.role || "").toUpperCase();

  // Never apply to STUDENT, PARENT, or PLATFORM_ADMIN
  if (role === "STUDENT" || role === "PARENT" || role === "PLATFORM_ADMIN") {
    return false;
  }

  // Never apply while platform admin is impersonating an institute
  if (params.isImpersonating) {
    return false;
  }

  const path = params.pathname;

  // Never block /plans or /settings (or subpaths)
  if (
    path === "/plans" ||
    path.startsWith("/plans/") ||
    path === "/settings" ||
    path.startsWith("/settings/")
  ) {
    return false;
  }

  // Whitelist essential APIs for subscription viewing, renewing, and settings
  if (
    path.startsWith("/api/institutes/me") ||
    path.startsWith("/api/institutes/subscribe") ||
    path.startsWith("/api/plans") ||
    path.startsWith("/api/settings")
  ) {
    return false;
  }

  return true;
}
