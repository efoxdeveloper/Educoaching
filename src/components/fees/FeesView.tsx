"use client";

import { useMemo, useState } from "react";
import { Plus, Search, RefreshCw, Bell, ShieldCheck, RotateCcw } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Badge, feeStatusTone } from "@/components/ui/Badge";
import { RecordPaymentDrawer } from "./RecordPaymentDrawer";
import { RenewDrawer } from "./RenewDrawer";
import { ReconciliationDrawer } from "./ReconciliationDrawer";
import { FeeRemindersDrawer } from "./FeeRemindersDrawer";
import { ProcessRefundDrawer } from "./ProcessRefundDrawer";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { computeFeeStatus, feeStatusLabel } from "@/lib/fee";
import { computePlanStatus, planStatusLabel, daysLeft, type ComputedPlanStatus } from "@/lib/subscription";
import { Wallet, IndianRupee, AlertTriangle } from "lucide-react";

type Student = {
  id: string;
  name: string;
  totalFee: string;
  paidFee: string;
  dueDate: string | null;
  course: { name: string };
  plan: string;
  subscriptionStatus: string;
  demoExpiresAt: string | null;
  currentPeriodEnd: string | null;
  monthlyAmount: string | null;
  quarterlyAmount?: string | null;
  installmentPlan?: any;
};

const planTone: Record<ComputedPlanStatus, "success" | "warn" | "danger" | "neutral"> = {
  TRIAL_ACTIVE: "warn",
  TRIAL_EXPIRED: "danger",
  SUBSCRIBED: "success",
  SUBSCRIPTION_EXPIRED: "danger",
};

export function FeesView({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTargetStudent, setPaymentTargetStudent] = useState<string | undefined>(undefined);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<string | undefined>(undefined);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundTargetStudent, setRefundTargetStudent] = useState<string | undefined>(undefined);

  const rows = useMemo(
    () =>
      students.map((s) => {
        const planStatus = computePlanStatus({
          plan: s.plan as any,
          demoExpiresAt: s.demoExpiresAt,
          currentPeriodEnd: s.currentPeriodEnd,
        });
        return {
          ...s,
          pending: Math.max(Number(s.totalFee) - Number(s.paidFee), 0),
          status: computeFeeStatus(Number(s.totalFee), Number(s.paidFee), s.dueDate ? new Date(s.dueDate) : null),
          planStatus,
        };
      }),
    [students]
  );

  const filtered = rows.filter((s) => {
    const matchesQuery = query.trim() === "" || s.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !statusFilter || s.status === statusFilter;
    const matchesPlan = !planFilter || s.plan === planFilter;
    return matchesQuery && matchesStatus && matchesPlan;
  });

  const totalCollected = rows.reduce((sum, s) => sum + Number(s.paidFee), 0);
  const totalPending = rows.reduce((sum, s) => sum + s.pending, 0);
  const overdueCount = rows.filter((s) => s.status === "OVERDUE").length;
  const renewalsDue = rows.filter((s) => s.planStatus === "SUBSCRIPTION_EXPIRED" || s.planStatus === "TRIAL_EXPIRED").length;

  const openRenewFor = (id: string) => {
    setRenewTarget(id);
    setRenewOpen(true);
  };

  const openPaymentFor = (id: string) => {
    setPaymentTargetStudent(id);
    setPaymentOpen(true);
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Collected" value={formatCurrency(totalCollected)} icon={IndianRupee} accent="marigold" />
        <KpiCard label="Total Pending" value={formatCurrency(totalPending)} icon={Wallet} accent="scholar" />
        <KpiCard label="Overdue Students" value={overdueCount.toString()} icon={AlertTriangle} accent="scholar" trendTone="danger" trend={overdueCount > 0 ? "Needs follow-up" : undefined} />
        <KpiCard label="Renewals Due" value={renewalsDue.toString()} icon={RefreshCw} accent="marigold" trendTone={renewalsDue > 0 ? "danger" : "success"} trend={renewalsDue > 0 ? "Demo ended or subscription lapsed" : "All caught up"} />
      </div>

      <Card className="p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 sm:max-w-xs sm:flex-1">
              <Search size={16} className="text-scholar-300" />
              <input
                placeholder="Search by student name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-scholar-300"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 text-sm text-scholar-600 outline-none"
            >
              <option value="">All statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 text-sm text-scholar-600 outline-none"
            >
              <option value="">All Payment Plans</option>
              <option value="INSTALLMENTS">Installment Plan</option>
              <option value="ONE_TIME">One-Time Fee</option>
              <option value="QUARTERLY">Quarterly Recurring</option>
              <option value="MONTHLY">Monthly Recurring</option>
              <option value="DEMO">Free 7-Day Demo</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRemindersOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              <Bell size={14} /> Fee Reminders
            </button>
            <button
              onClick={() => setReconcileOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-scholar-200 bg-paper px-3.5 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
            >
              <ShieldCheck size={14} /> Reconcile
            </button>
            <button
              onClick={() => { setRefundTargetStudent(undefined); setRefundOpen(true); }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-2 text-xs font-semibold text-danger-700 hover:bg-danger-100"
            >
              <RotateCcw size={14} /> Refund / Credit
            </button>
            <button
              onClick={() => { setRenewTarget(undefined); setRenewOpen(true); }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-marigold-400 px-3.5 py-2 text-xs font-semibold text-scholar-900 hover:bg-marigold-500"
            >
              <RefreshCw size={14} /> Renew
            </button>
            <button
              onClick={() => setPaymentOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700"
            >
              <Plus size={14} /> Record Payment
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-scholar-100 text-left text-xs font-medium uppercase tracking-wide text-scholar-400">
                <th className="py-3 pr-4">Student</th>
                <th className="py-3 pr-4">Course</th>
                <th className="py-3 pr-4">Total Fee</th>
                <th className="py-3 pr-4">Paid</th>
                <th className="py-3 pr-4">Pending</th>
                <th className="py-3 pr-4">Due Date</th>
                <th className="py-3 pr-4">Payment Status</th>
                <th className="py-3 pr-4">Plan</th>
                <th className="py-3 pr-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const relevantDate = s.plan === "DEMO" ? s.demoExpiresAt : s.currentPeriodEnd;
                const left = daysLeft(relevantDate);
                return (
                  <tr key={s.id} className="border-b border-scholar-50 last:border-0 hover:bg-paper/60">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-scholar-50 text-xs font-semibold text-scholar-600">
                          {initials(s.name)}
                        </div>
                        <span className="font-medium text-ink">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-scholar-500">{s.course.name}</td>
                    <td className="py-3 pr-4 tabular-nums text-scholar-500">{formatCurrency(s.totalFee)}</td>
                    <td className="py-3 pr-4 tabular-nums text-success-600">{formatCurrency(s.paidFee)}</td>
                    <td className="py-3 pr-4 tabular-nums font-medium text-ink">
                      <div className="flex flex-col gap-1">
                        <span>{formatCurrency(s.pending)}</span>
                        {(() => {
                          const total = Number(s.totalFee) || 0;
                          const paid = Number(s.paidFee) || 0;
                          const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;
                          const barColor =
                            s.status === "PAID" ? "bg-emerald-500" : s.status === "OVERDUE" ? "bg-rose-500" : s.status === "PARTIAL" ? "bg-amber-500" : "bg-scholar-400";
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 flex-1 rounded-full bg-scholar-100">
                                <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold text-scholar-500 tabular-nums">{pct}%</span>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-scholar-500">{s.dueDate ? formatDate(s.dueDate) : "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={feeStatusTone(s.status)} dot>{feeStatusLabel(s.status)}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-0.5">
                        {s.plan === "INSTALLMENTS" ? (
                          <>
                            <span className="inline-flex items-center rounded-md bg-scholar-100 px-2 py-0.5 text-[11px] font-bold text-scholar-800 border border-scholar-200 w-fit">
                              Installment Plan
                            </span>
                            {Array.isArray(s.installmentPlan) && (
                              <span className="text-[10px] text-scholar-500 font-medium">
                                {s.installmentPlan.filter((i: any) => i.status === "PAID").length}/{s.installmentPlan.length} Cleared
                              </span>
                            )}
                          </>
                        ) : s.plan === "ONE_TIME" ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 w-fit">
                            One-Time Full
                          </span>
                        ) : (
                          <>
                            <Badge tone={planTone[s.planStatus]} dot>
                              {s.plan === "QUARTERLY" ? `Quarterly (${planStatusLabel(s.planStatus)})` : planStatusLabel(s.planStatus)}
                            </Badge>
                            {left !== null && (
                              <span className="text-[11px] text-scholar-400">
                                {left >= 0 ? `${left} day${left === 1 ? "" : "s"} left` : `${Math.abs(left)} day${Math.abs(left) === 1 ? "" : "s"} overdue`}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.pending > 0 && (
                          <button
                            onClick={() => openPaymentFor(s.id)}
                            className="rounded-lg border border-scholar-200 bg-scholar-50 px-2.5 py-1 text-xs font-semibold text-scholar-700 hover:bg-scholar-100"
                          >
                            Collect
                          </button>
                        )}
                        {(s.plan === "DEMO" || s.plan === "MONTHLY" || s.plan === "QUARTERLY") && (
                          <button
                            onClick={() => openRenewFor(s.id)}
                            className="rounded-lg border border-marigold-400 px-2.5 py-1 text-xs font-semibold text-marigold-600 hover:bg-marigold-50"
                          >
                            Renew
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-scholar-400">
                    No students match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <RecordPaymentDrawer
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentTargetStudent(undefined);
        }}
        students={
          paymentTargetStudent
            ? [
                ...students.filter((s) => s.id === paymentTargetStudent),
                ...students.filter((s) => s.id !== paymentTargetStudent),
              ]
            : students
        }
      />
      <RenewDrawer open={renewOpen} onClose={() => setRenewOpen(false)} students={students} preselectedStudentId={renewTarget} />
      <ReconciliationDrawer open={reconcileOpen} onClose={() => setReconcileOpen(false)} />
      <FeeRemindersDrawer open={remindersOpen} onClose={() => setRemindersOpen(false)} />
      <ProcessRefundDrawer
        open={refundOpen}
        onClose={() => {
          setRefundOpen(false);
          setRefundTargetStudent(undefined);
        }}
        students={
          refundTargetStudent
            ? [
                ...students.filter((s) => s.id === refundTargetStudent),
                ...students.filter((s) => s.id !== refundTargetStudent),
              ]
            : students
        }
        targetStudentId={refundTargetStudent}
      />
    </>
  );
}
