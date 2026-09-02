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
