import { addDays, isBefore, startOfDay } from "date-fns";

export type InstallmentStatus = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

export interface FeeInstallment {
  id: string;
  installmentNumber: number;
  title: string;
  amount: number;
  dueDate: string; // ISO date string "YYYY-MM-DD"
  paidAmount: number;
  status: InstallmentStatus;
  paidAt?: string | null;
  note?: string | null;
}

export interface StudentInstallmentPlan {
  mode: "ONE_TIME" | "INSTALLMENTS" | "RECURRING_MONTHLY" | "RECURRING_QUARTERLY" | "RECURRING_ANNUAL";
  numberOfInstallments: number;
  totalAmount: number;
  installments: FeeInstallment[];
  updatedAt: string;
}

/**
 * Pre-configured installment options commonly used in school and coaching admissions.
 */
export const INSTALLMENT_PRESETS = [
  {
    count: 1,
    id: "full_one_time",
    label: "One-Time (100% Upfront)",
    description: "Full course fee cleared at admission",
    splitPercentages: [100],
    defaultIntervalDays: 0,
  },
  {
    count: 2,
    id: "two_installments",
    label: "2 Installments (Relaxation 50% - 50%)",
    description: "50% at admission, 50% after 45/60 days",
    splitPercentages: [50, 50],
    defaultIntervalDays: 60,
  },
  {
    count: 3,
    id: "three_installments",
    label: "3 Installments (Trimester 40% - 30% - 30%)",
    description: "40% admission, 30% mid-term, 30% final term",
    splitPercentages: [40, 30, 30],
    defaultIntervalDays: 45,
  },
  {
    count: 4,
    id: "four_installments",
    label: "4 Installments (Quarterly 25% each)",
    description: "25% every quarter / 90 days",
    splitPercentages: [25, 25, 25, 25],
    defaultIntervalDays: 90,
  },
];

/**
 * Creates an installment schedule for a student based on total fee, number of installments, and start date.
 */
export function generateInstallmentSchedule(params: {
  totalFee: number;
  numberOfInstallments?: number;
  startDate?: Date | string;
  currentDate?: Date | string;
  intervalDays?: number;
  customInstallments?: Array<{
    amount: number;
    dueDate: string;
    title?: string;
  }>;
}): FeeInstallment[] {
  const { totalFee, numberOfInstallments, startDate = new Date(), currentDate, intervalDays, customInstallments } = params;

  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate.getTime());
  const today = startOfDay(currentDate ? (typeof currentDate === "string" ? new Date(currentDate) : currentDate) : start);

  if (customInstallments && customInstallments.length > 0) {
    return customInstallments.map((ci, idx) => {
      const due = new Date(ci.dueDate);
      const isPast = isBefore(due, today);
      return {
        id: `inst_${idx + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        installmentNumber: idx + 1,
        title: ci.title || `Installment ${idx + 1} of ${customInstallments.length}`,
        amount: Math.round(ci.amount),
        dueDate: ci.dueDate.includes("T") ? ci.dueDate.split("T")[0] : ci.dueDate,
        paidAmount: 0,
        status: isPast ? "OVERDUE" : "PENDING",
      };
    });
  }

  const count = Math.max(1, numberOfInstallments ?? 2);
  const matchedPreset = INSTALLMENT_PRESETS.find((p) => p.count === count);

  const daysStep = intervalDays ?? matchedPreset?.defaultIntervalDays ?? 45;
  const percentages = matchedPreset?.splitPercentages ?? Array(count).fill(100 / count);

  const installments: FeeInstallment[] = [];
  let accumulatedAmount = 0;

  for (let i = 0; i < count; i++) {
    const pct = percentages[i] ?? 100 / count;
    let instAmount: number;

    if (i === count - 1) {
      // Ensure final installment absorbs any rounding delta
      instAmount = Math.max(0, Math.round(totalFee - accumulatedAmount));
    } else {
      instAmount = Math.round((totalFee * pct) / 100);
      accumulatedAmount += instAmount;
    }

    const instDueDate = i === 0 ? start : addDays(start, i * daysStep);
    const dueDateStr = instDueDate.toISOString().split("T")[0];
    const isPast = isBefore(instDueDate, today);

    let title = `Installment ${i + 1} of ${count}`;
    if (count === 1) {
      title = "Full Course Fee";
    } else if (i === 0) {
      title = `1st Installment (At Admission - ${pct}%)`;
    } else if (i === 1 && count === 2) {
      title = `2nd Installment (Balance - ${pct}%)`;
    } else if (i === count - 1) {
      title = `Final Installment (${pct}%)`;
    }

    installments.push({
      id: `inst_${i + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      installmentNumber: i + 1,
      title,
      amount: instAmount,
      dueDate: dueDateStr,
      paidAmount: 0,
      status: isPast ? "OVERDUE" : "PENDING",
    });
  }

  return installments;
}

/**
 * Re-evaluates installment statuses against current date and paid amount.
 */
export function recalculateInstallmentStatuses(
  installments: FeeInstallment[],
  referenceDate: Date = new Date()
): FeeInstallment[] {
  const today = startOfDay(referenceDate);

  return installments.map((inst) => {
    const dueDate = startOfDay(new Date(inst.dueDate));
    const isPast = isBefore(dueDate, today);

    let status: InstallmentStatus = "PENDING";
    if (inst.paidAmount >= inst.amount && inst.amount > 0) {
      status = "PAID";
    } else if (inst.paidAmount > 0) {
      status = isPast ? "OVERDUE" : "PARTIAL";
    } else if (isPast) {
      status = "OVERDUE";
    } else {
      status = "PENDING";
    }

    return {
      ...inst,
      status,
    };
  });
}

/**
 * Applies a payment amount to an installment plan.
 * If targetInstallmentNumber is provided, prioritizes that installment;
 * otherwise allocates FIFO across the earliest pending/partial installments.
 */
export function applyPaymentToInstallments(
  installments: FeeInstallment[],
  paymentAmount: number,
  targetInstallmentNumber?: number,
  paidAt: Date = new Date()
): {
  updatedInstallments: FeeInstallment[];
  remainingSurplus: number;
  nextDueDate: string | null;
} {
  let fundsLeft = paymentAmount;
  const updated = installments.map((inst) => ({ ...inst }));

  // If a specific installment was targeted (e.g. parent specifically said "This is for Installment 2")
  if (targetInstallmentNumber) {
    const target = updated.find((i) => i.installmentNumber === targetInstallmentNumber);
    if (target && target.paidAmount < target.amount) {
      const needed = target.amount - target.paidAmount;
      const allocated = Math.min(needed, fundsLeft);
      target.paidAmount += allocated;
      target.paidAt = paidAt.toISOString();
      fundsLeft -= allocated;
    }
  }

  // Allocate remaining funds FIFO across earlier/later unpaid installments
  for (const inst of updated) {
    if (fundsLeft <= 0) break;
    const needed = inst.amount - inst.paidAmount;
    if (needed > 0) {
      const allocated = Math.min(needed, fundsLeft);
      inst.paidAmount += allocated;
      inst.paidAt = paidAt.toISOString();
      fundsLeft -= allocated;
    }
  }

  const finalInstallments = recalculateInstallmentStatuses(updated, paidAt);

  // Find the next upcoming unpaid or partially paid installment for the next due date
  const nextPending = finalInstallments.find((i) => i.status !== "PAID" && i.amount > i.paidAmount);
  const nextDueDate = nextPending ? nextPending.dueDate : null;

  return {
    updatedInstallments: finalInstallments,
    remainingSurplus: Math.max(0, fundsLeft),
    nextDueDate,
  };
}

/**
 * Computes high-level summary metrics for student installment profile.
 */
export function computeInstallmentStats(installments: FeeInstallment[] | null | undefined) {
  if (!installments || installments.length === 0) {
    return {
      hasInstallments: false,
      totalCount: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      percentPaid: 100,
      nextInstallment: null as FeeInstallment | null,
      nextDueInstallment: null as FeeInstallment | null,
    };
  }

  const totalCount = installments.length;
  const paidCount = installments.filter((i) => i.status === "PAID").length;
  const overdueCount = installments.filter((i) => i.status === "OVERDUE").length;
  const pendingCount = installments.filter((i) => i.status !== "PAID").length;

  const totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = installments.reduce((sum, i) => sum + i.paidAmount, 0);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  const percentPaid = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
  const nextInstallment = installments.find((i) => i.status !== "PAID") || null;

  return {
    hasInstallments: totalCount > 1,
    totalCount,
    paidCount,
    pendingCount,
    overdueCount,
    totalAmount,
    paidAmount,
    pendingAmount,
    percentPaid,
    nextInstallment,
    nextDueInstallment: nextInstallment,
  };
}
