"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Calendar } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RENEWAL_PERIOD_DAYS, QUARTERLY_RENEWAL_PERIOD_DAYS, ANNUAL_RENEWAL_PERIOD_DAYS } from "@/lib/subscription";
import { useRazorpayCheckout } from "@/lib/useRazorpayCheckout";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";

type Student = {
  id: string;
  name: string;
  monthlyAmount: string | null;
  quarterlyAmount?: string | null;
  currentPeriodEnd: string | null;
  plan: string;
};

export function RenewDrawer({
  open,
  onClose,
  students,
  preselectedStudentId,
}: {
  open: boolean;
  onClose: () => void;
  students: Student[];
  preselectedStudentId?: string;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(preselectedStudentId || students[0]?.id || "");
  const [planType, setPlanType] = useState<"MONTHLY" | "QUARTERLY" | "ANNUAL">("MONTHLY");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { pay, processing, payError } = useRazorpayCheckout();

  const selected = students.find((s) => s.id === studentId);

  useEffect(() => {
    if (selected) {
      if (selected.plan === "QUARTERLY") {
        setPlanType("QUARTERLY");
        setAmount(selected.quarterlyAmount || (selected.monthlyAmount ? String(Number(selected.monthlyAmount) * 3) : ""));
      } else {
        setPlanType("MONTHLY");
        setAmount(selected.monthlyAmount || "");
      }
    }
  }, [selected, open]);

  const handlePlanTypeChange = (type: "MONTHLY" | "QUARTERLY" | "ANNUAL") => {
    setPlanType(type);
    if (!selected) return;
    if (type === "QUARTERLY") {
      setAmount(selected.quarterlyAmount || (selected.monthlyAmount ? String(Number(selected.monthlyAmount) * 3) : ""));
    } else if (type === "MONTHLY") {
      setAmount(selected.monthlyAmount || "");
    } else if (type === "ANNUAL") {
      setAmount(selected.monthlyAmount ? String(Number(selected.monthlyAmount) * 12) : "");
    }
  };

  const periodDays =
    planType === "QUARTERLY"
      ? QUARTERLY_RENEWAL_PERIOD_DAYS
      : planType === "ANNUAL"
      ? ANNUAL_RENEWAL_PERIOD_DAYS
      : RENEWAL_PERIOD_DAYS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!studentId || !amount || Number(amount) <= 0) {
      setError("Choose a student and enter a valid renewal amount.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          amount: Number(amount),
          method,
          planType,
        }),
      });
      if (!res.ok) throw new Error();
      setAmount("");
      onClose();
      router.refresh();
    } catch {
      setError("Could not process renewal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async () => {
    setError("");
    if (!studentId || !amount || Number(amount) <= 0) {
      setError("Choose a student and enter a valid renewal amount before paying online.");
      return;
    }
    await pay({
      studentId,
      studentName: selected?.name ?? "Student",
      amount: Number(amount),
      purpose: "renewal",
      onSuccess: () => {
        setAmount("");
        onClose();
        router.refresh();
      },
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title="Renew Subscription">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
        {(error || payError) && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.875rem" }}>
            {error || payError}
          </Alert>
        )}

        <FormControl fullWidth size="small" required>
          <InputLabel id="renew-student-label">Student</InputLabel>
          <Select
            labelId="renew-student-label"
            label="Student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem" }}
          >
            {students.map((s) => (
              <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.875rem" }}>
                {s.name} ({s.plan === "QUARTERLY" ? "Quarterly" : s.plan === "DEMO" ? "Demo" : "Monthly"})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", borderColor: "#D6E0EB", display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b" }}>Renewal Billing Cycle</Typography>
            <Typography variant="caption" sx={{ fontSize: "10px", color: "#7E9BBC" }}>Extends access by {periodDays} days</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {[
              { id: "MONTHLY", label: "Monthly", sub: "(+30 Days)" },
              { id: "QUARTERLY", label: "Quarterly", sub: "(+90 Days / 3 Mo)" },
              { id: "ANNUAL", label: "Annual", sub: "(+365 Days)" },
            ].map((opt) => (
              <Paper
                key={opt.id}
                variant="outlined"
                onClick={() => handlePlanTypeChange(opt.id as typeof planType)}
                sx={{
                  py: 1.25,
                  px: 1,
                  borderRadius: "12px",
                  textAlign: "center",
                  cursor: "pointer",
                  borderColor: planType === opt.id ? "#1E3A5F" : "#D6E0EB",
                  bgcolor: planType === opt.id ? "#1E3A5F" : "white",
                  color: planType === opt.id ? "white" : "#334155",
                  transition: "all 0.15s",
                  "&:hover": { bgcolor: planType === opt.id ? "#182F4C" : "#F8FAFC" },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: planType === opt.id ? "white" : "#1E293b", display: "block" }}>{opt.label}</Typography>
                <Typography variant="caption" sx={{ fontSize: "10px", color: planType === opt.id ? "rgba(255,255,255,0.7)" : "#7E9BBC" }}>{opt.sub}</Typography>
              </Paper>
            ))}
          </Box>
        </Paper>

        {selected && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#EEF2F7", borderColor: "#D6E0EB", display: "flex", alignItems: "center", gap: 1 }}>
            <Calendar size={14} style={{ color: "#64748b", flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569" }}>
              {selected.plan === "DEMO"
                ? "Currently on 7-Day Demo. "
                : selected.currentPeriodEnd
                ? `Current period ends ${formatDate(selected.currentPeriodEnd)}. `
                : "No active period set. "}
              Renewing will grant <Box component="span" sx={{ fontWeight: 800, color: "#1E3A5F" }}>{periodDays} days</Box> of continuous access.
            </Typography>
          </Paper>
        )}

        <TextField
          label={`Renewal Amount (₹) — ${planType === "QUARTERLY" ? "Quarterly Fee (3 Months)" : planType === "ANNUAL" ? "Annual Fee (1 Year)" : "Monthly Fee"}`}
          required
          fullWidth
          size="small"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: 1, step: 1 },
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontWeight: 700 } }}
        />

        <Button
          type="button"
          variant="outlined"
          fullWidth
          onClick={handlePayOnline}
          disabled={processing}
          startIcon={<CreditCard size={15} />}
          sx={{ borderRadius: "12px", borderWidth: 2, borderColor: "#1E3A5F", color: "#1E3A5F", fontWeight: 600, textTransform: "none", py: 1.25, "&:hover": { bgcolor: "#EEF2F7", borderColor: "#1E3A5F" } }}
        >
          {processing ? "Opening payment gateway..." : "Pay Online via Razorpay / UPI"}
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
          <Divider sx={{ flex: 1, borderColor: "#D6E0EB" }} />
          <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC", whiteSpace: "nowrap" }}>or record offline / manual renewal</Typography>
          <Divider sx={{ flex: 1, borderColor: "#D6E0EB" }} />
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel id="renew-method-label">Payment Method</InputLabel>
          <Select
            labelId="renew-method-label"
            label="Payment Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem" }}
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="UPI">UPI / QR Code</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</MenuItem>
            <MenuItem value="Card">Card</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
          <Button type="button" variant="outlined" fullWidth onClick={onClose} sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#64748b", fontWeight: 600, textTransform: "none", py: 1.25 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}>
            {loading ? "Recording..." : "Confirm Renewal"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
