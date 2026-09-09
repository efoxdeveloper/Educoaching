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
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";

type Student = {
  id: string;
  name: string;
  totalFee: string;
  paidFee: string;
  dueDate: string | null;
  course: { name: string };
  courseId: string;
  batchId: string | null;
  plan: string;
  subscriptionStatus: string;
  demoExpiresAt: string | null;
  currentPeriodEnd: string | null;
  monthlyAmount: string | null;
  quarterlyAmount?: string | null;
  installmentPlan?: any;
};

type CourseOpt = { id: string; name: string };
type BatchOpt = { id: string; name: string; courseId: string };

const planTone: Record<ComputedPlanStatus, "success" | "warn" | "danger" | "neutral"> = {
  TRIAL_ACTIVE: "warn",
  TRIAL_EXPIRED: "danger",
  SUBSCRIBED: "success",
  SUBSCRIPTION_EXPIRED: "danger",
};

export function FeesView({ students, courses = [], batches = [] }: { students: Student[]; courses?: CourseOpt[]; batches?: BatchOpt[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
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

  const availableBatches = useMemo(() => {
    if (!courseFilter) return batches;
    return batches.filter((b) => b.courseId === courseFilter);
  }, [batches, courseFilter]);

  const filtered = rows.filter((s) => {
    const matchesQuery = query.trim() === "" || s.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !statusFilter || s.status === statusFilter;
    const matchesPlan = !planFilter || s.plan === planFilter;
    const matchesCourse = !courseFilter || s.courseId === courseFilter;
    const matchesBatch = !batchFilter || s.batchId === batchFilter;
    return matchesQuery && matchesStatus && matchesPlan && matchesCourse && matchesBatch;
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
      <Box sx={{ mb: 2, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiCard label="Total Collected" value={formatCurrency(totalCollected)} iconName="IndianRupee" accent="marigold" />
        <KpiCard label="Total Pending" value={formatCurrency(totalPending)} iconName="Wallet" accent="scholar" />
        <KpiCard label="Overdue Students" value={overdueCount.toString()} iconName="AlertTriangle" accent="scholar" trendTone="danger" trend={overdueCount > 0 ? "Needs follow-up" : undefined} />
        <KpiCard label="Renewals Due" value={renewalsDue.toString()} iconName="RefreshCw" accent="marigold" trendTone={renewalsDue > 0 ? "danger" : "success"} trend={renewalsDue > 0 ? "Demo ended or subscription lapsed" : "All caught up"} />
      </Box>

      <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2, width: "100%", minWidth: 0 }}>
        {/* Row 1: Filters — consistent height, gap, alignment */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ flexWrap: "wrap", alignItems: { xs: "stretch", sm: "center" }, gap: 1.5 }}
          useFlexGap
        >
          <TextField
            size="small"
            placeholder="Search by student name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} style={{ color: "#7E9BBC" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: { sm: "1 1 200px" }, minWidth: { xs: "100%", sm: 200 }, maxWidth: { sm: 260 }, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.875rem", height: 40 } }}
          />
          <FormControl size="small" sx={{ flex: "1 1 130px", minWidth: { xs: "100%", sm: 140 } }}>
            <InputLabel id="fee-status-label" sx={{ fontSize: "0.75rem" }}>Status</InputLabel>
            <Select
              labelId="fee-status-label"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 600, height: 40 }}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="PAID">Paid</MenuItem>
              <MenuItem value="PARTIAL">Partial</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="OVERDUE">Overdue</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: "1 1 150px", minWidth: { xs: "100%", sm: 150 } }}>
            <InputLabel id="fee-plan-label" sx={{ fontSize: "0.75rem" }}>Payment Plan</InputLabel>
            <Select
              labelId="fee-plan-label"
              label="Payment Plan"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 600, height: 40 }}
            >
              <MenuItem value="">All Payment Plans</MenuItem>
              <MenuItem value="INSTALLMENTS">Installment Plan</MenuItem>
              <MenuItem value="ONE_TIME">One-Time Fee</MenuItem>
              <MenuItem value="QUARTERLY">Quarterly Recurring</MenuItem>
              <MenuItem value="MONTHLY">Monthly Recurring</MenuItem>
              <MenuItem value="DEMO">Free 7-Day Demo</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: "1 1 130px", minWidth: { xs: "100%", sm: 140 } }}>
            <InputLabel id="fee-course-label" sx={{ fontSize: "0.75rem" }}>Course</InputLabel>
            <Select
              labelId="fee-course-label"
              label="Course"
              value={courseFilter}
              onChange={(e) => {
                const v = e.target.value;
                setCourseFilter(v);
                setBatchFilter("");
              }}
              sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 600, height: 40 }}
            >
              <MenuItem value="">All Courses</MenuItem>
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.75rem" }}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: "1 1 130px", minWidth: { xs: "100%", sm: 140 } }}>
            <InputLabel id="fee-batch-label" sx={{ fontSize: "0.75rem" }}>Batch</InputLabel>
            <Select
              labelId="fee-batch-label"
              label="Batch"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              disabled={availableBatches.length === 0}
              sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 600, height: 40 }}
            >
              <MenuItem value="">All Batches</MenuItem>
              {availableBatches.map((b) => (
                <MenuItem key={b.id} value={b.id} sx={{ fontSize: "0.75rem" }}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Row 2: Actions — separate group, wraps gracefully */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ flexWrap: "wrap", alignItems: { xs: "stretch", sm: "center" }, gap: 1 }}
          useFlexGap
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const params = new URLSearchParams();
              if (statusFilter) params.set("status", statusFilter);
              if (planFilter) params.set("plan", planFilter);
              if (courseFilter) params.set("courseId", courseFilter);
              if (batchFilter) params.set("batchId", batchFilter);
              if (query) params.set("q", query);
              params.set("format", "xlsx");
              window.location.href = `/api/fees/export?${params.toString()}`;
            }}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", px: 1.5, py: 0.75, height: 36, width: { xs: "100%", sm: "auto" } }}
          >
            Export Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const params = new URLSearchParams();
              if (statusFilter) params.set("status", statusFilter);
              if (planFilter) params.set("plan", planFilter);
              if (courseFilter) params.set("courseId", courseFilter);
              if (batchFilter) params.set("batchId", batchFilter);
              if (query) params.set("q", query);
              params.set("format", "pdf");
              window.location.href = `/api/fees/export?${params.toString()}`;
            }}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", px: 1.5, py: 0.75, height: 36, width: { xs: "100%", sm: "auto" } }}
          >
            Export PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Bell size={14} />}
            onClick={() => setRemindersOpen(true)}
            sx={{ borderRadius: "12px", borderColor: "#fde68a", bgcolor: "#FFFBEB", color: "#92400e", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", px: 1.5, py: 0.75, height: 36, width: { xs: "100%", sm: "auto" }, "&:hover": { bgcolor: "#FEF3C7", borderColor: "#fcd34d" } }}
          >
            Fee Reminders
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShieldCheck size={14} />}
            onClick={() => setReconcileOpen(true)}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", color: "#334155", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", px: 1.5, py: 0.75, height: 36, width: { xs: "100%", sm: "auto" }, "&:hover": { bgcolor: "#F8FAFC" } }}
          >
            Reconcile
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RotateCcw size={14} />}
            onClick={() => { setRefundTargetStudent(undefined); setRefundOpen(true); }}
            sx={{ borderRadius: "12px", borderColor: "#fecaca", bgcolor: "#FEF2F2", color: "#b91c1c", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", px: 1.5, py: 0.75, height: 36, width: { xs: "100%", sm: "auto" }, "&:hover": { bgcolor: "#FEE2E2", borderColor: "#fca5a5" } }}
          >
            Refund / Credit
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<RefreshCw size={14} />}
            onClick={() => { setRenewTarget(undefined); setRenewOpen(true); }}
            sx={{ borderRadius: "12px", bgcolor: "#E8A33D", color: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", px: 1.5, py: 0.75, height: 36, width: { xs: "100%", sm: "auto" }, boxShadow: "none", "&:hover": { bgcolor: "#D68F26" } }}
          >
            Renew
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={14} />}
            onClick={() => setPaymentOpen(true)}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", px: 2, py: 0.75, height: 36, width: { xs: "100%", sm: "auto" }, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
          >
            Record Payment
          </Button>
        </Stack>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "12px", borderColor: "#D6E0EB", boxShadow: "none", minWidth: 0, width: "100%" }}>
          <Table sx={{ minWidth: 960 }} size="small">
            <TableHead>
              <TableRow sx={{ "& th": { borderBottom: "1px solid #D6E0EB", py: 1.5, fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", whiteSpace: "nowrap" } }}>
                <TableCell>Student</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Total Fee</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Pending</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => {
                const relevantDate = s.plan === "DEMO" ? s.demoExpiresAt : s.currentPeriodEnd;
                const left = daysLeft(relevantDate);
                const total = Number(s.totalFee) || 0;
                const paid = Number(s.paidFee) || 0;
                const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;
                const barColor =
                  s.status === "PAID" ? "#10b981" : s.status === "OVERDUE" ? "#f43f5e" : s.status === "PARTIAL" ? "#f59e0b" : "#94a3b8";
                return (
                  <TableRow key={s.id} hover sx={{ "&:last-child td": { borderBottom: 0 }, "& td": { borderBottom: "1px solid #F1F5F9", py: 1.75, pr: 2 } }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93", fontSize: "0.70rem", fontWeight: 700 }}>
                          {initials(s.name)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{s.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: "#64748b", fontSize: "0.80rem" }}>{s.course.name}</TableCell>
                    <TableCell sx={{ fontSize: "0.80rem", color: "#64748b" }} className="tabular-nums">{formatCurrency(s.totalFee)}</TableCell>
                    <TableCell sx={{ fontSize: "0.80rem", color: "#059669", fontWeight: 600 }} className="tabular-nums">{formatCurrency(s.paidFee)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, minWidth: 120 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }} className="tabular-nums">{formatCurrency(s.pending)}</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Box sx={{ height: 6, flex: 1, borderRadius: 999, bgcolor: "#F1F5F9", overflow: "hidden" }}>
                            <Box sx={{ height: 6, borderRadius: 999, width: `${pct}%`, bgcolor: barColor, transition: "width 0.3s" }} />
                          </Box>
                          <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "#64748b" }} className="tabular-nums">{pct}%</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.80rem", color: "#64748b" }}>{s.dueDate ? formatDate(s.dueDate) : "—"}</TableCell>
                    <TableCell>
                      <Badge tone={feeStatusTone(s.status)} dot>{feeStatusLabel(s.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {s.plan === "INSTALLMENTS" ? (
                          <>
                            <Chip label="Installment Plan" size="small" sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#EEF2F7", color: "#1E3A5F", border: "1px solid #D6E0EB", height: 20, borderRadius: "6px", width: "fit-content" }} />
                            {Array.isArray(s.installmentPlan) && (
                              <Typography variant="caption" sx={{ fontSize: "10px", color: "#64748b", fontWeight: 500 }}>
                                {s.installmentPlan.filter((i: any) => i.status === "PAID").length}/{s.installmentPlan.length} Cleared
                              </Typography>
                            )}
                          </>
                        ) : s.plan === "ONE_TIME" ? (
                          <Chip label="One-Time Full" size="small" sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", height: 20, borderRadius: "6px", width: "fit-content" }} />
                        ) : (
                          <>
                            <Badge tone={planTone[s.planStatus]} dot>
                              {s.plan === "QUARTERLY" ? `Quarterly (${planStatusLabel(s.planStatus)})` : planStatusLabel(s.planStatus)}
                            </Badge>
                            {left !== null && (
                              <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>
                                {left >= 0 ? `${left} day${left === 1 ? "" : "s"} left` : `${Math.abs(left)} day${Math.abs(left) === 1 ? "" : "s"} overdue`}
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.75} sx={{ justifyContent: "flex-end" }}>
                        {s.pending > 0 && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openPaymentFor(s.id)}
                            sx={{ borderRadius: "8px", borderColor: "#D6E0EB", bgcolor: "#F8FAFC", color: "#334155", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", px: 1.5, py: 0.5, minWidth: 0, "&:hover": { bgcolor: "#EEF2F7" } }}
                          >
                            Collect
                          </Button>
                        )}
                        {(s.plan === "DEMO" || s.plan === "MONTHLY" || s.plan === "QUARTERLY") && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openRenewFor(s.id)}
                            sx={{ borderRadius: "8px", borderColor: "#E8A33D", color: "#92400e", fontWeight: 600, fontSize: "0.70rem", textTransform: "none", px: 1.5, py: 0.5, minWidth: 0, bgcolor: "#FFFBEB", "&:hover": { bgcolor: "#FEF3C7" } }}
                          >
                            Renew
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5, color: "#94a3b8", fontSize: "0.875rem" }}>
                    No students match your search or filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
          </Box>
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
