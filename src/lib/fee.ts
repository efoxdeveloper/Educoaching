export type FeeStatusComputed = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

export function computeFeeStatus(totalFee: number, paidFee: number, dueDate?: Date | null): FeeStatusComputed {
  if (paidFee >= totalFee && totalFee > 0) return "PAID";
  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;
  if (isOverdue && paidFee < totalFee) return "OVERDUE";
  if (paidFee > 0) return "PARTIAL";
  return "PENDING";
}

export function feeStatusLabel(status: FeeStatusComputed) {
  const map: Record<FeeStatusComputed, string> = {
    PAID: "Paid",
    PARTIAL: "Partial",
    PENDING: "Pending",
    OVERDUE: "Overdue",
  };
  return map[status];
}
