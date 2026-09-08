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
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";

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
          <Box sx={{ height: 256, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, color: "#7E9BBC" }}>
            <CircularProgress size={24} sx={{ color: "#1E3A5F" }} />
            <Typography variant="body2" sx={{ color: "#7E9BBC" }}>Loading student profile...</Typography>
          </Box>
        )}

        {data && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Header Profile Card */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)" }}>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  {data.photoUrl ? (
                    <Avatar src={data.photoUrl} alt={data.name} sx={{ width: 52, height: 52, borderRadius: "12px", border: "2px solid white", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} variant="rounded" />
                  ) : (
                    <Avatar sx={{ width: 52, height: 52, borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 700, fontSize: "1.125rem" }} variant="rounded">
                      {initials(data.name)}
                    </Avatar>
                  )}
                  <Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "#171A21", fontSize: "1.125rem" }}>{data.name}</Typography>
                      <Badge tone={studentStatusTone(data.status)} dot>
                        {data.status}
                      </Badge>
                      <Chip
                        label={
                          data.plan === "DEMO"
                            ? "7-Day Trial"
                            : data.plan === "INSTALLMENTS"
                            ? "Installment Plan"
                            : data.plan === "QUARTERLY"
                            ? "Quarterly Recurring"
                            : data.plan === "ONE_TIME"
                            ? "Full Course Fee"
                            : "Regular Monthly"
                        }
                        size="small"
                        sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#EEF2F7", border: "1px solid #D6E0EB", height: 20 }}
                      />
                      {data.courseDuration && (
                        <Chip icon={<Clock size={11} />} label={data.courseDuration} size="small" sx={{ fontSize: "10px", fontWeight: 600, bgcolor: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", height: 20 }} />
                      )}

                      {data.isSeatBooked && (
                        <Chip label={`🎫 Seat Booked ${data.registrationFee ? `(₹${formatCurrency(data.registrationFee)})` : ""}`} size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", height: 20 }} />
                      )}

                      {data.discountApprovalStatus === "PENDING_OWNER_APPROVAL" && (
                        <Chip label={`⏳ Special Discount (${data.discountPercent}%) Pending Approval`} size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#FFFBEB", color: "#92400e", border: "1px solid #FDE68A", height: 20 }} />
                      )}

                      {data.discountApprovalStatus === "APPROVED" && (
                        <Chip label={`✓ ${data.discountPercent}% Discount Allowed by Owner`} size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", height: 20 }} />
                      )}
                    </Box>
                    <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, fontSize: "0.75rem", color: "#64748b" }}>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>{data.course.name}</Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8" }}>•</Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>{data.batch ? `${data.batch.name} (${data.batch.timing})` : "Unassigned Batch"}</Typography>
                      {data.branch && (
                        <>
                          <Typography variant="caption" sx={{ color: "#94A3B8" }}>•</Typography>
                          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#1E3A5F", fontWeight: 600 }}>📍 {data.branch.name}</Typography>
                        </>
                      )}
                      {data.courseEndDate && (
                        <>
                          <Typography variant="caption" sx={{ color: "#94A3B8" }}>•</Typography>
                          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#1E3A5F", fontWeight: 600 }}>Valid until {formatDate(data.courseEndDate)}</Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Header Action Buttons */}
                <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Plus size={13} />}
                    onClick={() => setPaymentOpen(true)}
                    sx={{ borderRadius: "12px", bgcolor: "#1F9D66", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 0.75, px: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#188050" } }}
                  >
                    Record Payment
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Pencil size={13} />}
                    onClick={() => setEditOpen(true)}
                    sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#334155", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 0.75, px: 1.5, bgcolor: "white", "&:hover": { bgcolor: "#F8FAFC" } }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Archive size={13} />}
                    onClick={() => setConfirmArchiveOpen(true)}
                    disabled={archiveBusy}
                    sx={{
                      borderRadius: "12px",
                      borderColor: "#D6E0EB",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      textTransform: "none",
                      py: 0.75,
                      px: 1.5,
                      bgcolor: "white",
                      color: data.status === "INACTIVE" ? "#1F9D66" : "#DC2626",
                      "&:hover": { bgcolor: data.status === "INACTIVE" ? "#ECFDF5" : "#FEF2F2" },
                    }}
                  >
                    {data.status === "INACTIVE" ? "Re-activate" : "Archive"}
                  </Button>
                </Stack>
              </Box>

              {/* Quick Contacts Bar */}
              <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #D6E0EB", display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.75rem", color: "#475569" }}>
                  <Phone size={13} style={{ color: "#94A3B8" }} />
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569" }}>
                    Student: <Box component="a" href={`tel:${data.mobile}`} sx={{ fontWeight: 600, color: "#171A21", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{data.mobile}</Box>
                  </Typography>
                  <Box component="a" href={`https://wa.me/91${data.mobile}`} target="_blank" rel="noreferrer" sx={{ color: "#1F9D66", display: "flex" }} title="Send WhatsApp">
                    <MessageSquare size={13} />
                  </Box>
                </Box>

                {data.parentMobile && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.75rem", color: "#475569" }}>
                    <Phone size={13} style={{ color: "#94A3B8" }} />
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569" }}>
                      Parent: <Box component="a" href={`tel:${data.parentMobile}`} sx={{ fontWeight: 600, color: "#171A21", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{data.parentMobile}</Box>
                    </Typography>
                    <Box component="a" href={`https://wa.me/91${data.parentMobile}`} target="_blank" rel="noreferrer" sx={{ color: "#1F9D66", display: "flex" }} title="Send WhatsApp to Parent">
                      <MessageSquare size={13} />
                    </Box>
                  </Box>
                )}

                {data.email && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Mail size={13} style={{ color: "#94A3B8" }} />
                    <Typography variant="caption" component="a" href={`mailto:${data.email}`} sx={{ fontSize: "0.75rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                      {data.email}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* 3 Summary Metric Cards */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
              <Card sx={{ p: 1.75, bgcolor: "white" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#94A3B8" }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#94A3B8" }}>Fee Balance</Typography>
                  <Wallet size={15} style={{ color: "#E8A33D" }} />
                </Box>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, color: "#171A21", fontSize: "1.25rem" }}>
                  {data.feeStats.pendingFee > 0 ? (
                    <Box component="span" sx={{ color: "#DC2626" }}>{formatCurrency(data.feeStats.pendingFee)}</Box>
                  ) : (
                    <Box component="span" sx={{ color: "#16a34a" }}>All Paid</Box>
                  )}
                </Typography>
                <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#94A3B8" }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8" }}>Paid: {formatCurrency(data.feeStats.paidFee)}</Typography>
                  {data.feeStats.isOverdue && (
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#DC2626", fontWeight: 700 }}>OVERDUE</Typography>
                  )}
                </Box>
              </Card>

              <Card sx={{ p: 1.75, bgcolor: "white" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#94A3B8" }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#94A3B8" }}>Attendance</Typography>
                  <CalendarCheck size={15} style={{ color: "#64748b" }} />
                </Box>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, color: "#171A21", fontSize: "1.25rem" }}>
                  {data.attendanceStats.rate}%
                </Typography>
                <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#94A3B8" }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8" }}>{data.attendanceStats.present} present of {data.attendanceStats.total}</Typography>
                  {data.attendanceStats.isLow && (
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#DC2626", fontWeight: 700 }}>LOW</Typography>
                  )}
                </Box>
              </Card>

              <Card sx={{ p: 1.75, bgcolor: "white" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#94A3B8" }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#94A3B8" }}>Academic Score</Typography>
                  <Award size={15} style={{ color: "#64748b" }} />
                </Box>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, color: "#171A21", fontSize: "1.25rem" }}>
                  {data.academicStats.averagePercentage}%
                </Typography>
                <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#94A3B8" }}>
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8" }}>Pass Rate: {data.academicStats.passRate}%</Typography>
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8" }}>{data.academicStats.testsPassed}/{data.academicStats.testsAppeared} passed</Typography>
                </Box>
              </Card>
            </Box>

            {/* Dossier Tabs */}
            <Paper variant="outlined" sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "#F8FAFC", p: 0.5, display: "flex", gap: 0.5 }}>
              {[
                { id: "fees", label: `Payment Ledger (${data.payments.length})` },
                ...(data.installmentPlan && data.installmentPlan.length > 0 ? [{ id: "installments", label: `Installments (${data.installmentPlan.length})` }] : []),
                { id: "attendance", label: `Attendance (${data.attendance.length})` },
                { id: "tests", label: `Tests (${data.testResults.length})` },
                { id: "profile", label: "Profile & Bio" },
              ].map((t) => (
                <Button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  variant={activeTab === t.id ? "contained" : "text"}
                  size="small"
                  sx={{
                    flex: 1,
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.70rem",
                    textTransform: "none",
                    py: 1,
                    bgcolor: activeTab === t.id ? "white" : "transparent",
                    color: activeTab === t.id ? "#1E3A5F" : "#64748b",
                    boxShadow: activeTab === t.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    border: activeTab === t.id ? "1px solid #D6E0EB" : "1px solid transparent",
                    "&:hover": { bgcolor: activeTab === t.id ? "white" : "#EEF2F7" },
                  }}
                >
                  {t.label}
                </Button>
              ))}
            </Paper>

            {/* Tab 1: Payment Ledger */}
            {activeTab === "fees" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>Recorded Payment Receipts</Typography>
                  <Button
                    size="small"
                    startIcon={<Plus size={13} />}
                    onClick={() => {
                      setPreselectedInstallmentNumber(undefined);
                      setPaymentOpen(true);
                    }}
                    sx={{ fontSize: "0.70rem", fontWeight: 600, color: "#475569", textTransform: "none" }}
                  >
                    Add Payment
                  </Button>
                </Box>

                <Card sx={{ overflow: "hidden" }}>
                  <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, color: "#64748b", py: 1.25, borderBottom: "1px solid #D6E0EB" } }}>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Note / Allocation</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.payments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: "#94A3B8", fontSize: "0.875rem" }}>
                              No payments recorded yet for this student.
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.payments.map((p) => (
                            <TableRow key={p.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9" } }}>
                              <TableCell sx={{ fontSize: "0.75rem", color: "#64748b", whiteSpace: "nowrap" }}>{formatDate(p.paidAt)}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600, color: "#059669", fontSize: "0.75rem" }}>+{formatCurrency(p.amount)}</TableCell>
                              <TableCell>
                                <Chip icon={<CreditCard size={10} />} label={p.method} size="small" sx={{ fontSize: "11px", fontWeight: 500, bgcolor: "#EEF2F7", color: "#334155", border: "1px solid #D6E0EB", height: 20 }} />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", flexDirection: "column" }}>
                                  <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{p.note || "—"}</Typography>
                                  {(p.installmentTitle || p.installmentNumber) && (
                                    <Chip icon={<Split size={10} />} label={p.installmentTitle || `Installment ${p.installmentNumber}`} size="small" sx={{ mt: 0.5, fontSize: "10px", fontWeight: 700, bgcolor: "#EEF2F7", color: "#334155", border: "1px solid #D6E0EB", height: 18, width: "fit-content" }} />
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>

                {data.renewals.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem", mb: 1, display: "block" }}>Monthly Subscription Renewals</Typography>
                    <Card sx={{ overflow: "hidden" }}>
                      <TableContainer sx={{ overflowX: "auto" }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, color: "#64748b", py: 1 } }}>
                              <TableCell>Renewed Date</TableCell>
                              <TableCell align="right">Amount</TableCell>
                              <TableCell>Valid Period</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {data.renewals.map((r) => (
                              <TableRow key={r.id} hover>
                                <TableCell sx={{ fontSize: "0.75rem", color: "#475569" }}>{formatDate(r.renewedAt)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>{formatCurrency(r.amount)}</TableCell>
                                <TableCell sx={{ fontSize: "0.75rem", color: "#64748b" }}>{formatDate(r.validFrom)} - {formatDate(r.validUntil)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Card>
                  </Box>
                )}
              </Box>
            )}

            {/* Tab: Installment Schedule */}
            {activeTab === "installments" && data.installmentPlan && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {(() => {
                  const plan = data.installmentPlan;
                  const totalInst = plan.length;
                  const paidInst = plan.filter((i) => i.status === "PAID").length;
                  const pct = totalInst > 0 ? Math.round((paidInst / totalInst) * 100) : 0;
                  const pendingTotal = Math.max(0, data.feeStats.totalFee - data.feeStats.paidFee);
                  return (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Split size={14} style={{ color: "#4E6E93" }} />
                            Installment Schedule & Relaxation
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>Fee split into {totalInst} relaxation installments</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293b", fontSize: "0.875rem" }}>{paidInst} of {totalInst} Cleared ({pct}%)</Typography>
                      </Box>
                      <Box sx={{ height: 10, width: "100%", borderRadius: 999, bgcolor: "#E2E8F0", overflow: "hidden" }}>
                        <Box sx={{ height: 10, borderRadius: 999, width: `${pct}%`, bgcolor: "#1F9D66", transition: "width 0.3s" }} />
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569" }}>Paid: <Box component="span" sx={{ fontWeight: 700 }}>{formatCurrency(data.feeStats.paidFee)}</Box></Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#DC2626", fontWeight: 700 }}>Pending: {formatCurrency(pendingTotal)}</Typography>
                      </Box>
                    </Paper>
                  );
                })()}

                <Stack spacing={1.5}>
                  {data.installmentPlan.map((inst) => {
                    const isPaid = inst.status === "PAID";
                    const isOverdue = inst.status === "OVERDUE";
                    const isPartial = inst.status === "PARTIAL";
                    const remaining = Math.max(0, inst.amount - inst.paidAmount);
                    return (
                      <Card key={inst.id} sx={{ p: 1.75, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between", borderColor: "#D6E0EB" }}>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 20, height: 20, fontSize: "10px", fontWeight: 700, bgcolor: "#D6E0EB", color: "#1E3A5F" }}>{inst.installmentNumber}</Avatar>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>{inst.title}</Typography>
                            <Chip
                              label={inst.status}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "10px",
                                fontWeight: 700,
                                border: "1px solid",
                                borderColor: isPaid ? "#A7F3D0" : isOverdue ? "#FECACA" : isPartial ? "#FDE68A" : "#D6E0EB",
                                bgcolor: isPaid ? "#ECFDF5" : isOverdue ? "#FEF2F2" : isPartial ? "#FFFBEB" : "#F8FAFC",
                                color: isPaid ? "#065f46" : isOverdue ? "#991b1b" : isPartial ? "#92400e" : "#475569",
                              }}
                            />
                          </Box>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 0.5, pl: 3.5, fontSize: "0.75rem", color: "#64748b" }}>
                            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>Amount: <Box component="span" sx={{ fontWeight: 700, color: "#171A21" }}>{formatCurrency(inst.amount)}</Box></Typography>
                            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>Due Date: <Box component="span" sx={{ fontWeight: 700 }}>{formatDate(inst.dueDate)}</Box></Typography>
                            {inst.paidAmount > 0 && (
                              <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#059669" }}>Paid: {formatCurrency(inst.paidAmount)}</Typography>
                            )}
                          </Box>
                        </Box>
                        {!isPaid && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, alignSelf: { xs: "flex-end", sm: "center" } }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "#DC2626", fontSize: "0.75rem" }}>Due: {formatCurrency(remaining)}</Typography>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CreditCard size={12} />}
                              onClick={() => {
                                setPreselectedInstallmentNumber(inst.installmentNumber);
                                setPaymentOpen(true);
                              }}
                              sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", py: 0.75, px: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
                            >
                              Pay Installment
                            </Button>
                          </Box>
                        )}
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {activeTab === "attendance" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.3)" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>Attendance Fulfillment</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem" }}>{data.attendanceStats.rate}%</Typography>
                  </Box>
                  <Box sx={{ height: 10, width: "100%", borderRadius: 999, bgcolor: "#E2E8F0", overflow: "hidden" }}>
                    <Box sx={{ height: 10, borderRadius: 999, width: `${data.attendanceStats.rate}%`, bgcolor: data.attendanceStats.isLow ? "#DC2626" : "#1F9D66" }} />
                  </Box>
                  <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#7E9BBC" }}>
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>Target: 75% minimum</Typography>
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{data.attendanceStats.present} Present • {data.attendanceStats.absent} Absent • {data.attendanceStats.late} Late</Typography>
                  </Box>
                </Paper>

                <Card sx={{ overflow: "hidden" }}>
                  <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, color: "#64748b", py: 1 } }}>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Batch</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.attendance.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#94A3B8" }}>No attendance records on file.</TableCell>
                          </TableRow>
                        ) : (
                          data.attendance.map((a) => (
                            <TableRow key={a.id} hover>
                              <TableCell sx={{ fontSize: "0.75rem", color: "#475569" }}>{formatDate(a.date)}</TableCell>
                              <TableCell>
                                <Badge tone={a.status === "PRESENT" ? "success" : a.status === "LATE" ? "warn" : "danger"}>{a.status}</Badge>
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.75rem", color: "#64748b" }}>{a.batchName}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {activeTab === "tests" && (
              <Card sx={{ overflow: "hidden" }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "rgba(238,242,247,0.7)", "& th": { fontSize: "0.70rem", fontWeight: 600, color: "#64748b", py: 1.25, borderBottom: "1px solid #D6E0EB" } }}>
                        <TableCell>Test Title & Subject</TableCell>
                        <TableCell>Test Date</TableCell>
                        <TableCell align="right">Score</TableCell>
                        <TableCell>Outcome</TableCell>
                        <TableCell>Remarks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.testResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4, color: "#94A3B8" }}>No test results evaluated yet.</TableCell>
                        </TableRow>
                      ) : (
                        data.testResults.map((r) => (
                          <TableRow key={r.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9" } }}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{r.title}</Typography>
                              <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{r.subject}</Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap" }}>{formatDate(r.testDate)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                              {r.marksObtained !== null ? (
                                <Box>
                                  {r.marksObtained} / {r.totalMarks} <Box component="span" sx={{ color: "#94A3B8", fontWeight: 400 }}>({r.percentage}%)</Box>
                                </Box>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {r.status === "PASSED" ? (
                                <Chip icon={<CheckCircle2 size={10} />} label="PASSED" size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#ECFDF5", color: "#065f46", border: "1px solid #A7F3D0", height: 20 }} />
                              ) : r.status === "FAILED" ? (
                                <Chip icon={<XCircle size={10} />} label="FAILED" size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#FEF2F2", color: "#991b1b", border: "1px solid #FECACA", height: 20 }} />
                              ) : (
                                <Chip icon={<Clock size={10} />} label="ABSENT" size="small" sx={{ fontSize: "10px", fontWeight: 600, bgcolor: "#F1F5F9", color: "#475569", border: "1px solid #D6E0EB", height: 20 }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.75rem", color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.remarks || "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )}

            {activeTab === "profile" && (
              <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.70rem" }}>Enrolled Course</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{data.course.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.70rem" }}>Assigned Batch</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{data.batch ? `${data.batch.name} (${data.batch.timing})` : "Unassigned"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.70rem" }}>Course Duration</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 0.5 }}><Clock size={12} style={{ color: "#64748b" }} />{data.courseDuration || data.course.duration || "1 Year"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.70rem" }}>Expected Course Finish</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{data.courseEndDate ? formatDate(data.courseEndDate) : "—"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.70rem" }}>Admission Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{formatDate(data.admissionDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.70rem" }}>Total Course Fee</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{formatCurrency(data.feeStats.totalFee)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.70rem" }}>Next Due Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{data.feeStats.dueDate ? formatDate(data.feeStats.dueDate) : "Not set"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.70rem" }}>Payment Billing Model</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>
                      {data.plan === "DEMO"
                        ? "Free 7-Day Demo"
                        : data.plan === "INSTALLMENTS"
                        ? "Relaxation Installment Plan"
                        : data.plan === "QUARTERLY"
                        ? "Quarterly Recurring Subscription"
                        : data.plan === "ONE_TIME"
                        ? "Full One-Time Payment"
                        : "Regular Monthly Subscription"}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: "#D6E0EB", my: 1 }} />
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    startIcon={<Pencil size={13} />}
                    onClick={() => setEditOpen(true)}
                    sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1, px: 2, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
                  >
                    Edit Student Information
                  </Button>
                </Box>
              </Card>
            )}
          </Box>
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
