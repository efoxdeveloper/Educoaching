"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  Wallet,
  CalendarCheck,
  Award,
  CreditCard,
  Pencil,
  Archive,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Plus,
  MessageSquare,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, studentStatusTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { EditStudentDrawer, type EditableStudent } from "./EditStudentDrawer";
import { RecordPaymentDrawer } from "@/components/fees/RecordPaymentDrawer";
import { Split } from "lucide-react";
import type { FeeInstallment } from "@/lib/installments";

type StudentDetails = {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  photoUrl?: string | null;
  parentMobile: string | null;
  admissionDate: string;
  status: string;
  plan: string;
  subscriptionStatus: string;
  demoStartedAt: string | null;
  demoExpiresAt: string | null;
  currentPeriodEnd: string | null;
  monthlyAmount: number | null;
  quarterlyAmount: number | null;
  courseDuration?: string | null;
  courseEndDate?: string | null;
  installmentPlan?: FeeInstallment[] | null;
  registrationFee?: number | null;
  isSeatBooked?: boolean;
  discountPercent?: number | null;
  discountApprovalStatus?: string | null;
  branch?: { id: string; name: string; city: string | null } | null;
  course: { id: string; name: string; fee: number; duration?: string | null };
  batch: { id: string; name: string; timing: string } | null;
  feeStats: {
    totalFee: number;
    paidFee: number;
    pendingFee: number;
    dueDate: string | null;
    isOverdue: boolean;
  };
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
    isLow: boolean;
  };
  academicStats: {
    totalTests: number;
    testsAppeared: number;
    testsAbsent: number;
    testsPassed: number;
    passRate: number;
    averagePercentage: number;
    highestPercentage: number;
  };
  payments: {
    id: string;
    amount: number;
    method: string;
    paidAt: string;
    note: string | null;
    installmentNumber?: number | null;
    installmentTitle?: string | null;
  }[];
  renewals: {
    id: string;
    amount: number;
    method: string;
    renewedAt: string;
    validFrom: string;
    validUntil: string;
    note: string | null;
    planType?: string;
  }[];
  attendance: {
    id: string;
    date: string;
    status: string;
    batchName: string;
  }[];
  testResults: {
    id: string;
    testId: string;
    title: string;
    subject: string;
    testDate: string;
    totalMarks: number;
    passingMarks: number;
    marksObtained: number | null;
    percentage: number | null;
    status: "PASSED" | "FAILED" | "ABSENT";
    remarks: string | null;
  }[];
};

export function StudentProfileDrawer({
  studentId,
  open,
  onClose,
  courses,
  batches,
  onRefreshParent,
}: {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
  courses: { id: string; name: string; fee: string; duration?: string | null }[];
  batches: { id: string; name: string; courseId: string }[];
  onRefreshParent?: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"fees" | "attendance" | "tests" | "profile" | "installments">("fees");

  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [preselectedInstallmentNumber, setPreselectedInstallmentNumber] = useState<number | undefined>(undefined);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}`);
      if (!res.ok) throw new Error("Failed to load student");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error loading student profile:", err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (open && studentId) {
      loadDetails();
    } else {
      setData(null);
    }
  }, [open, studentId, loadDetails]);

  const confirmArchiveToggle = async () => {
    if (!data) return;
    const isInactive = data.status === "INACTIVE";
    const nextStatus = isInactive ? "ACTIVE" : "INACTIVE";

    setArchiveBusy(true);
    try {
      const res = await fetch(`/api/students/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      setConfirmArchiveOpen(false);
      await loadDetails();
      if (onRefreshParent) onRefreshParent();
      router.refresh();
    } catch {
      console.error("Could not update student status.");
    } finally {
      setArchiveBusy(false);
    }
  };

  const editableStudent: EditableStudent | null = data
    ? {
        id: data.id,
        name: data.name,
        mobile: data.mobile,
        email: data.email,
        parentMobile: data.parentMobile,
        courseId: data.course.id,
        batchId: data.batch?.id,
        status: data.status,
        totalFee: data.feeStats.totalFee,
        dueDate: data.feeStats.dueDate,
        plan: data.plan,
        courseDuration: data.courseDuration,
        monthlyAmount: data.monthlyAmount,
        installmentPlan: data.installmentPlan,
      }
    : null;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Student 360° Dossier"
        maxWidth="max-w-2xl lg:max-w-3xl"
      >
        {loading && !data && (
          <div className="flex h-64 items-center justify-center text-scholar-400">
            <RotateCw size={24} className="animate-spin text-scholar-600 mr-2" />
            <span>Loading student profile...</span>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Header Profile Card */}
            <div className="rounded-2xl border border-scholar-100 bg-scholar-50/50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.photoUrl}
                      alt={data.name}
                      className="h-13 w-13 shrink-0 rounded-2xl object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-scholar-600 font-display text-lg font-bold text-white shadow-sm">
                      {initials(data.name)}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-ink">{data.name}</h2>
                      <Badge tone={studentStatusTone(data.status)} dot>
                        {data.status}
                      </Badge>
                      <span className="rounded-full bg-scholar-100 border border-scholar-200 px-2 py-0.5 text-[10px] font-bold text-scholar-800">
                        {data.plan === "DEMO"
                          ? "7-Day Trial"
                          : data.plan === "INSTALLMENTS"
                          ? "Installment Plan"
                          : data.plan === "QUARTERLY"
                          ? "Quarterly Recurring"
                          : data.plan === "ONE_TIME"
                          ? "Full Course Fee"
                          : "Regular Monthly"}
                      </span>
                      {data.courseDuration && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          <Clock size={11} /> {data.courseDuration}
                        </span>
                      )}

                      {data.isSeatBooked && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          🎫 Seat Booked {data.registrationFee ? `(₹${formatCurrency(data.registrationFee)})` : ""}
                        </span>
                      )}

                      {data.discountApprovalStatus === "PENDING_OWNER_APPROVAL" && (
                        <span className="rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                          ⏳ Special Discount ({data.discountPercent}%) Pending Approval
                        </span>
                      )}

                      {data.discountApprovalStatus === "APPROVED" && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          ✓ {data.discountPercent}% Discount Allowed by Owner
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-scholar-500">
                      <span>{data.course.name}</span>
                      <span>•</span>
                      <span>{data.batch ? `${data.batch.name} (${data.batch.timing})` : "Unassigned Batch"}</span>
                      {data.branch && (
                        <>
                          <span>•</span>
                          <span className="text-scholar-700 font-medium">📍 {data.branch.name}</span>
                        </>
                      )}
                      {data.courseEndDate && (
                        <>
                          <span>•</span>
                          <span className="text-scholar-700 font-medium">Valid until {formatDate(data.courseEndDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setPaymentOpen(true)}
                    className="flex items-center gap-1 rounded-xl bg-success-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-success-700 transition-colors"
                  >
                    <Plus size={13} />
                    Record Payment
                  </button>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1 rounded-xl border border-scholar-100 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 shadow-sm hover:bg-scholar-50 transition-colors"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmArchiveOpen(true)}
                    disabled={archiveBusy}
                    className={`flex items-center gap-1 rounded-xl border border-scholar-100 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                      data.status === "INACTIVE"
                        ? "text-success-700 hover:bg-success-50"
                        : "text-danger-600 hover:bg-danger-50"
                    }`}
                  >
                    <Archive size={13} />
                    {data.status === "INACTIVE" ? "Re-activate" : "Archive"}
                  </button>
                </div>
              </div>

              {/* Quick Contacts Bar */}
              <div className="mt-4 pt-3 border-t border-scholar-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-scholar-600">
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-scholar-400" />
                  <span>Student: <a href={`tel:${data.mobile}`} className="font-semibold text-ink hover:underline">{data.mobile}</a></span>
                  <a
                    href={`https://wa.me/91${data.mobile}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-success-600 hover:opacity-80"
                    title="Send WhatsApp"
                  >
                    <MessageSquare size={13} />
                  </a>
                </div>

                {data.parentMobile && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-scholar-400" />
                    <span>Parent: <a href={`tel:${data.parentMobile}`} className="font-semibold text-ink hover:underline">{data.parentMobile}</a></span>
                    <a
                      href={`https://wa.me/91${data.parentMobile}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-success-600 hover:opacity-80"
                      title="Send WhatsApp to Parent"
                    >
                      <MessageSquare size={13} />
                    </a>
                  </div>
                )}

                {data.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-scholar-400" />
                    <a href={`mailto:${data.email}`} className="text-scholar-600 truncate hover:underline">
                      {data.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 3 Summary Metric Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Fee Card */}
              <Card className="p-3.5 bg-white">
                <div className="flex items-center justify-between text-scholar-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Fee Balance</span>
                  <Wallet size={15} className="text-marigold-500" />
                </div>
                <p className="mt-1 font-display text-xl font-bold text-ink">
                  {data.feeStats.pendingFee > 0 ? (
                    <span className="text-danger-600">{formatCurrency(data.feeStats.pendingFee)}</span>
                  ) : (
                    <span className="text-success-600">All Paid</span>
                  )}
                </p>
                <div className="mt-1 text-[11px] text-scholar-400 flex items-center justify-between">
                  <span>Paid: {formatCurrency(data.feeStats.paidFee)}</span>
                  {data.feeStats.isOverdue && (
                    <span className="text-danger-600 font-bold">OVERDUE</span>
                  )}
                </div>
              </Card>

              {/* Attendance Card */}
              <Card className="p-3.5 bg-white">
                <div className="flex items-center justify-between text-scholar-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Attendance</span>
                  <CalendarCheck size={15} className="text-scholar-500" />
                </div>
                <p className="mt-1 font-display text-xl font-bold text-ink">
                  {data.attendanceStats.rate}%
                </p>
                <div className="mt-1 text-[11px] text-scholar-400 flex items-center justify-between">
                  <span>{data.attendanceStats.present} present of {data.attendanceStats.total}</span>
                  {data.attendanceStats.isLow && (
                    <span className="text-danger-600 font-bold">LOW</span>
                  )}
                </div>
              </Card>

              {/* Exam Results Card */}
              <Card className="p-3.5 bg-white">
                <div className="flex items-center justify-between text-scholar-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Academic Score</span>
                  <Award size={15} className="text-scholar-500" />
                </div>
                <p className="mt-1 font-display text-xl font-bold text-ink">
                  {data.academicStats.averagePercentage}%
                </p>
                <div className="mt-1 text-[11px] text-scholar-400 flex items-center justify-between">
                  <span>Pass Rate: {data.academicStats.passRate}%</span>
                  <span>{data.academicStats.testsPassed}/{data.academicStats.testsAppeared} passed</span>
                </div>
              </Card>
            </div>

            {/* Dossier Tabs */}
            <div className="flex rounded-xl bg-scholar-50 p-1 border border-scholar-100">
              <button
                type="button"
                onClick={() => setActiveTab("fees")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === "fees"
                    ? "bg-white text-scholar-900 shadow-sm"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                Payment Ledger ({data.payments.length})
              </button>
              {data.installmentPlan && data.installmentPlan.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("installments")}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    activeTab === "installments"
                      ? "bg-white text-scholar-900 shadow-sm"
                      : "text-scholar-600 hover:text-scholar-900"
                  }`}
                >
                  Installments ({data.installmentPlan.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === "attendance"
                    ? "bg-white text-scholar-900 shadow-sm"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                Attendance ({data.attendance.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tests")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === "tests"
                    ? "bg-white text-scholar-900 shadow-sm"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                Tests ({data.testResults.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === "profile"
                    ? "bg-white text-scholar-900 shadow-sm"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                Profile & Bio
              </button>
            </div>

            {/* Tab 1: Payment Ledger */}
            {activeTab === "fees" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Recorded Payment Receipts</span>
                  <button
                    onClick={() => {
                      setPreselectedInstallmentNumber(undefined);
                      setPaymentOpen(true);
                    }}
                    className="text-xs font-semibold text-scholar-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Payment
                  </button>
                </div>

                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">Date</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                          <th className="px-3 py-2.5 font-semibold">Method</th>
                          <th className="px-3 py-2.5 font-semibold">Note / Allocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-scholar-50">
                        {data.payments.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-scholar-400">
                              No payments recorded yet for this student.
                            </td>
                          </tr>
                        ) : (
                          data.payments.map((p) => (
                            <tr key={p.id} className="hover:bg-scholar-50/40">
                              <td className="px-3 py-2.5 text-scholar-600 whitespace-nowrap">
                                {formatDate(p.paidAt)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-display font-semibold text-success-700 tabular-nums">
                                +{formatCurrency(p.amount)}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-scholar-100 px-2 py-0.5 text-[11px] font-medium text-scholar-700">
                                  <CreditCard size={10} />
                                  {p.method}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col">
                                  <span className="text-scholar-600 truncate max-w-xs">{p.note || "—"}</span>
                                  {(p.installmentTitle || p.installmentNumber) && (
                                    <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded bg-scholar-100 px-1.5 py-0.5 text-[10px] font-bold text-scholar-700">
                                      <Split size={10} /> {p.installmentTitle || `Installment ${p.installmentNumber}`}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Subscriptions / Renewals */}
                {data.renewals.length > 0 && (
                  <div>
                    <span className="font-semibold text-xs text-ink mb-2 block">Monthly Subscription Renewals</span>
                    <Card className="overflow-hidden">
                      <table className="w-full text-left text-xs divide-y divide-scholar-50">
                        <thead className="bg-scholar-50/70 text-scholar-500">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Renewed Date</th>
                            <th className="px-3 py-2 font-semibold text-right">Amount</th>
                            <th className="px-3 py-2 font-semibold">Valid Period</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.renewals.map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-2 text-scholar-600">{formatDate(r.renewedAt)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-ink">{formatCurrency(r.amount)}</td>
                              <td className="px-3 py-2 text-scholar-500">{formatDate(r.validFrom)} - {formatDate(r.validUntil)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Installment Schedule */}
            {activeTab === "installments" && data.installmentPlan && (
              <div className="space-y-4">
                {/* Summary card */}
                {(() => {
                  const plan = data.installmentPlan;
                  const totalInst = plan.length;
                  const paidInst = plan.filter((i) => i.status === "PAID").length;
                  const pct = totalInst > 0 ? Math.round((paidInst / totalInst) * 100) : 0;
                  const pendingTotal = Math.max(0, data.feeStats.totalFee - data.feeStats.paidFee);

                  return (
                    <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
                            <Split size={14} className="text-scholar-600" />
                            Installment Schedule & Relaxation
                          </span>
                          <p className="text-[11px] text-scholar-500 mt-0.5">
                            Fee split into {totalInst} relaxation installments
                          </p>
                        </div>
                        <span className="text-sm font-bold text-scholar-800 tabular-nums">
                          {paidInst} of {totalInst} Cleared ({pct}%)
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2.5 w-full rounded-full bg-scholar-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-success-600 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs pt-1 text-scholar-700">
                        <span>Paid: <strong>{formatCurrency(data.feeStats.paidFee)}</strong></span>
                        <span>Pending: <strong className="text-danger-700">{formatCurrency(pendingTotal)}</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {/* List of Installments */}
                <div className="space-y-2.5">
                  {data.installmentPlan.map((inst) => {
                    const isPaid = inst.status === "PAID";
                    const isOverdue = inst.status === "OVERDUE";
                    const isPartial = inst.status === "PARTIAL";
                    const remaining = Math.max(0, inst.amount - inst.paidAmount);

                    return (
                      <Card key={inst.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-scholar-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-scholar-200 text-[10px] font-bold text-scholar-800">
                              {inst.installmentNumber}
                            </span>
                            <span className="font-semibold text-xs text-ink">{inst.title}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                isPaid
                                  ? "bg-success-50 text-success-700 border-success-200"
                                  : isOverdue
                                  ? "bg-danger-50 text-danger-700 border-danger-200"
                                  : isPartial
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-scholar-50 text-scholar-700 border-scholar-200"
                              }`}
                            >
                              {inst.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-scholar-500 pl-7">
                            <span>Amount: <strong className="text-ink">{formatCurrency(inst.amount)}</strong></span>
                            <span>Due Date: <strong>{formatDate(inst.dueDate)}</strong></span>
                            {inst.paidAmount > 0 && (
                              <span className="text-success-700">Paid: {formatCurrency(inst.paidAmount)}</span>
                            )}
                          </div>
                        </div>

                        {!isPaid && (
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <span className="text-xs font-bold text-danger-700">
                              Due: {formatCurrency(remaining)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPreselectedInstallmentNumber(inst.installmentNumber);
                                setPaymentOpen(true);
                              }}
                              className="flex items-center gap-1 rounded-xl bg-scholar-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-scholar-700 transition-colors shadow-xs"
                            >
                              <CreditCard size={12} />
                              Pay Installment
                            </button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Attendance History */}
            {activeTab === "attendance" && (
              <div className="space-y-4">
                {/* Attendance rate bar */}
                <div className="rounded-xl border border-scholar-100 bg-scholar-50/40 p-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-ink">Attendance Fulfillment</span>
                    <span className="font-bold text-ink">{data.attendanceStats.rate}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-scholar-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        data.attendanceStats.isLow ? "bg-danger-500" : "bg-success-600"
                      }`}
                      style={{ width: `${data.attendanceStats.rate}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-scholar-500">
                    <span>Target: 75% minimum</span>
                    <span>{data.attendanceStats.present} Present • {data.attendanceStats.absent} Absent • {data.attendanceStats.late} Late</span>
                  </div>
                </div>

                <Card className="overflow-hidden">
                  <table className="w-full text-left text-xs divide-y divide-scholar-50">
                    <thead className="bg-scholar-50/70 text-scholar-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attendance.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-scholar-400">
                            No attendance records on file.
                          </td>
                        </tr>
                      ) : (
                        data.attendance.map((a) => (
                          <tr key={a.id}>
                            <td className="px-3 py-2 text-scholar-600">{formatDate(a.date)}</td>
                            <td className="px-3 py-2">
                              <Badge
                                tone={
                                  a.status === "PRESENT"
                                    ? "success"
                                    : a.status === "LATE"
                                    ? "warning"
                                    : "danger"
                                }
                              >
                                {a.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-scholar-500">{a.batchName}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}

            {/* Tab 3: Academic Tests */}
            {activeTab === "tests" && (
              <div className="space-y-4">
                <Card className="overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-scholar-100 bg-scholar-50/70 text-scholar-500">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Test Title & Subject</th>
                        <th className="px-3 py-2.5 font-semibold">Test Date</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Score</th>
                        <th className="px-3 py-2.5 font-semibold">Outcome</th>
                        <th className="px-3 py-2.5 font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-scholar-50">
                      {data.testResults.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-scholar-400">
                            No test results evaluated yet.
                          </td>
                        </tr>
                      ) : (
                        data.testResults.map((r) => (
                          <tr key={r.id} className="hover:bg-scholar-50/40">
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-ink block">{r.title}</span>
                              <span className="text-[11px] text-scholar-400">{r.subject}</span>
                            </td>
                            <td className="px-3 py-2.5 text-scholar-600 whitespace-nowrap">
                              {formatDate(r.testDate)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                              {r.marksObtained !== null ? (
                                <span>
                                  {r.marksObtained} / {r.totalMarks}{" "}
                                  <span className="text-scholar-400 font-normal">({r.percentage}%)</span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {r.status === "PASSED" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-bold text-success-700">
                                  <CheckCircle2 size={10} /> PASSED
                                </span>
                              ) : r.status === "FAILED" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-bold text-danger-700">
                                  <XCircle size={10} /> FAILED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-scholar-100 px-2 py-0.5 text-[10px] font-semibold text-scholar-600">
                                  <Clock size={10} /> ABSENT
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-scholar-500 max-w-xs truncate">
                              {r.remarks || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}

            {/* Tab 4: Profile & Bio */}
            {activeTab === "profile" && (
              <Card className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-scholar-400 block mb-0.5">Enrolled Course</span>
                    <span className="font-semibold text-ink text-sm">{data.course.name}</span>
                  </div>
                  <div>
                    <span className="text-scholar-400 block mb-0.5">Assigned Batch</span>
                    <span className="font-semibold text-ink text-sm">
                      {data.batch ? `${data.batch.name} (${data.batch.timing})` : "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-scholar-400 block mb-0.5">Course Duration</span>
                    <span className="font-semibold text-ink flex items-center gap-1">
                      <Clock size={12} className="text-scholar-500" />
                      {data.courseDuration || data.course.duration || "1 Year"}
                    </span>
                  </div>
                  <div>
                    <span className="text-scholar-400 block mb-0.5">Expected Course Finish</span>
                    <span className="font-semibold text-ink">
                      {data.courseEndDate ? formatDate(data.courseEndDate) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-scholar-400 block mb-0.5">Admission Date</span>
                    <span className="font-semibold text-ink">{formatDate(data.admissionDate)}</span>
                  </div>
                  <div>
                    <span className="text-scholar-400 block mb-0.5">Total Course Fee</span>
                    <span className="font-semibold text-ink">{formatCurrency(data.feeStats.totalFee)}</span>
                  </div>
                  <div>
                    <span className="text-scholar-400 block mb-0.5">Next Due Date</span>
                    <span className="font-semibold text-ink">
                      {data.feeStats.dueDate ? formatDate(data.feeStats.dueDate) : "Not set"}
                    </span>
                  </div>
                  <div>
                    <span className="text-scholar-400 block mb-0.5">Payment Billing Model</span>
                    <span className="font-semibold text-ink">
                      {data.plan === "DEMO"
                        ? "Free 7-Day Demo"
                        : data.plan === "INSTALLMENTS"
                        ? "Relaxation Installment Plan"
                        : data.plan === "QUARTERLY"
                        ? "Quarterly Recurring Subscription"
                        : data.plan === "ONE_TIME"
                        ? "Full One-Time Payment"
                        : "Regular Monthly Subscription"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-scholar-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700 transition-colors"
                  >
                    <Pencil size={13} />
                    Edit Student Information
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* Edit Drawer */}
      <EditStudentDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={editableStudent}
        courses={courses}
        batches={batches}
        onUpdated={() => {
          loadDetails();
          if (onRefreshParent) onRefreshParent();
        }}
      />

      {/* Payment Drawer */}
      {data && (
        <RecordPaymentDrawer
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false);
            setPreselectedInstallmentNumber(undefined);
            loadDetails();
            if (onRefreshParent) onRefreshParent();
          }}
          preselectedInstallmentNumber={preselectedInstallmentNumber}
          students={[
            {
              id: data.id,
              name: data.name,
              totalFee: String(data.feeStats.totalFee),
              paidFee: String(data.feeStats.paidFee),
              installmentPlan: data.installmentPlan,
            },
          ]}
        />
      )}

      {data && (
        <ConfirmDialog
          open={confirmArchiveOpen}
          onClose={() => setConfirmArchiveOpen(false)}
          onConfirm={confirmArchiveToggle}
          title={data.status === "INACTIVE" ? "Re-activate Student" : "Archive Student"}
          message={
            data.status === "INACTIVE" ? (
              <span>
                Are you sure you want to re-activate <strong>{data.name}</strong>? Their status will change to Active and they will regain access to active classes.
              </span>
            ) : (
              <span>
                Are you sure you want to archive <strong>{data.name}</strong>? They will be marked as Inactive.
              </span>
            )
          }
          confirmLabel={data.status === "INACTIVE" ? "Re-activate Student" : "Archive Student"}
          cancelLabel="Cancel"
          tone={data.status === "INACTIVE" ? "success" : "warn"}
          loading={archiveBusy}
        />
      )}
    </>
  );
}
