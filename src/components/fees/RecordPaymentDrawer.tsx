"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Split } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { formatCurrency } from "@/lib/utils";
import { useRazorpayCheckout } from "@/lib/useRazorpayCheckout";
import type { FeeInstallment } from "@/lib/installments";
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
  totalFee: string;
  paidFee: string;
  installmentPlan?: any;
};

export function RecordPaymentDrawer({
  open,
  onClose,
  students,
  preselectedInstallmentNumber,
}: {
  open: boolean;
  onClose: () => void;
  students: Student[];
  preselectedInstallmentNumber?: number;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [targetInstallment, setTargetInstallment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { pay, processing, payError } = useRazorpayCheckout();

  useEffect(() => {
    if (students.length > 0 && !studentId) {
      setStudentId(students[0].id);
    }
  }, [students, studentId]);

  const selected = students.find((s) => s.id === studentId);
  const outstanding = selected ? Math.max(Number(selected.totalFee) - Number(selected.paidFee), 0) : 0;

  const rawInstallments = selected?.installmentPlan;
  const installmentsList: FeeInstallment[] = Array.isArray(rawInstallments) ? rawInstallments : [];

  // When preselectedInstallmentNumber or selected student changes
  useEffect(() => {
    if (preselectedInstallmentNumber && installmentsList.length > 0) {
      const match = installmentsList.find((i) => i.installmentNumber === preselectedInstallmentNumber);
      if (match) {
        setTargetInstallment(String(match.installmentNumber));
        const rem = Math.max(0, match.amount - match.paidAmount);
        setAmount(String(rem));
        setNote(`Payment for ${match.title}`);
        return;
      }
    }

    // Default to first pending installment if available
    if (installmentsList.length > 0) {
      const firstPending = installmentsList.find((i) => i.status !== "PAID");
      if (firstPending) {
        setTargetInstallment(String(firstPending.installmentNumber));
        const rem = Math.max(0, firstPending.amount - firstPending.paidAmount);
        setAmount(String(rem));
        setNote(`Payment for ${firstPending.title}`);
      }
    } else {
      setTargetInstallment("");
    }
  }, [selected?.id, preselectedInstallmentNumber, open]);

  const handleInstallmentSelect = (instNumStr: string) => {
    setTargetInstallment(instNumStr);
    if (!instNumStr) return;
    const match = installmentsList.find((i) => i.installmentNumber === Number(instNumStr));
    if (match) {
      const rem = Math.max(0, match.amount - match.paidAmount);
      setAmount(String(rem));
      setNote(`Payment for ${match.title}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!studentId || !amount || Number(amount) <= 0) {
      setError("Choose a student and enter a valid amount.");
      return;
    }
    setLoading(true);
    try {
      const targetInst = installmentsList.find((i) => i.installmentNumber === Number(targetInstallment));

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          amount: Number(amount),
          method,
          note: note || null,
          installmentNumber: targetInst ? targetInst.installmentNumber : null,
          installmentTitle: targetInst ? targetInst.title : null,
        }),
      });
      if (!res.ok) throw new Error();
      setAmount("");
      setNote("");
      onClose();
      router.refresh();
    } catch {
      setError("Could not record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async () => {
    setError("");
    if (!studentId || !amount || Number(amount) <= 0) {
      setError("Choose a student and enter a valid amount before paying online.");
      return;
    }
    await pay({
      studentId,
      studentName: selected?.name ?? "Student",
      amount: Number(amount),
      purpose: "fee",
      onSuccess: () => {
        setAmount("");
        setNote("");
        onClose();
        router.refresh();
      },
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title="Record Student Payment">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
        {(error || payError) && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.875rem" }}>
            {error || payError}
          </Alert>
        )}

        <FormControl fullWidth size="small" required>
          <InputLabel id="record-student-label">Student</InputLabel>
          <Select
            labelId="record-student-label"
            label="Student"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setAmount("");
            }}
            sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem" }}
          >
            {students.map((s) => (
              <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.875rem" }}>
                {s.name} (Outstanding: {formatCurrency(Math.max(0, Number(s.totalFee) - Number(s.paidFee)))})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selected && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#FFF8E1", borderColor: "#FFE082", display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600 }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#795548" }}>Total Course Fee:</Typography>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#1E3A5F" }}>{formatCurrency(selected.totalFee)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, color: "#1F9D66" }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#1F9D66" }}>Paid So Far:</Typography>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#1F9D66" }}>{formatCurrency(selected.paidFee)}</Typography>
            </Box>
            <Divider sx={{ borderColor: "rgba(121,85,72,0.15)" }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#171A21" }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#171A21" }}>Outstanding Due:</Typography>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#D64545" }}>{formatCurrency(outstanding)}</Typography>
            </Box>
          </Paper>
        )}

        {installmentsList.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", borderColor: "#D6E0EB", display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Split size={14} style={{ color: "#64748b" }} />
              Apply Payment to Installment:
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="installment-label">Installment</InputLabel>
              <Select
                labelId="installment-label"
                label="Installment"
                value={targetInstallment}
                onChange={(e) => handleInstallmentSelect(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem" }}
              >
                <MenuItem value="">Auto-allocate (Earliest Unpaid)</MenuItem>
                {installmentsList.map((inst) => {
                  const balance = Math.max(0, inst.amount - inst.paidAmount);
                  return (
                    <MenuItem key={inst.id} value={String(inst.installmentNumber)} sx={{ fontSize: "0.75rem" }}>
                      {inst.title} — Due: {formatCurrency(balance)} [{inst.status}]
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Paper>
        )}

        <TextField
          label="Amount Received (₹)"
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
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontWeight: 600 } }}
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
          {processing ? "Opening Razorpay..." : "Pay Online via Razorpay / UPI"}
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
          <Divider sx={{ flex: 1, borderColor: "#D6E0EB" }} />
          <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC", whiteSpace: "nowrap" }}>or record offline / manual payment</Typography>
          <Divider sx={{ flex: 1, borderColor: "#D6E0EB" }} />
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel id="pay-method-label">Payment Method</InputLabel>
          <Select
            labelId="pay-method-label"
            label="Payment Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem" }}
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="UPI">UPI / QR Code</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</MenuItem>
            <MenuItem value="Cheque">Cheque / DD</MenuItem>
            <MenuItem value="Card">Credit / Debit Card</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Note / Remarks (Optional)"
          fullWidth
          size="small"
          multiline
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Installment 1 receipt #4829"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
          <Button type="button" variant="outlined" fullWidth onClick={onClose} sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#64748b", fontWeight: 600, textTransform: "none", py: 1.25 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}>
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
