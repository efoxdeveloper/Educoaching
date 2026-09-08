"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { formatCurrency } from "@/lib/utils";
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
import CircularProgress from "@mui/material/CircularProgress";

type Student = {
  id: string;
  name: string;
  totalFee: string;
  paidFee: string;
};

export function ProcessRefundDrawer({
  open,
  onClose,
  students,
  targetStudentId,
}: {
  open: boolean;
  onClose: () => void;
  students: Student[];
  targetStudentId?: string;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(targetStudentId || students[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("Cash Refund");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (targetStudentId) {
      setStudentId(targetStudentId);
    } else if (students.length > 0 && !studentId) {
      setStudentId(students[0].id);
    }
  }, [targetStudentId, students, studentId]);

  const selected = students.find((s) => s.id === studentId);
  const maxRefundable = selected ? Number(selected.paidFee || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const refundNum = Number(amount);
    if (!studentId || !refundNum || refundNum <= 0) {
      setError("Please select a student and enter a valid refund amount.");
      return;
    }

    if (refundNum > maxRefundable) {
      setError(`Cannot refund more than total collected fees (${formatCurrency(maxRefundable)}).`);
      return;
    }

    if (!reason || !reason.trim()) {
      setError("A clear reason for the refund is mandatory.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          amount: refundNum,
          reason: reason.trim(),
          method,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund.");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process refund.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Process Fee Refund / Credit Note">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && (
          <Alert severity="error" icon={<AlertTriangle size={15} />} sx={{ borderRadius: "12px", fontSize: "0.875rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ borderRadius: "12px", fontSize: "0.875rem", border: "1px solid #A7F3D0", bgcolor: "#ECFDF5" }}>
            Refund processed successfully! Credit receipt generated and balance updated.
          </Alert>
        )}

        <FormControl fullWidth size="small">
          <InputLabel id="refund-student-label">Student</InputLabel>
          <Select
            labelId="refund-student-label"
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
                {s.name} (Paid: {formatCurrency(Number(s.paidFee))})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selected && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>Max Refundable Amount:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontFamily: "monospace", fontSize: "0.875rem" }}>{formatCurrency(maxRefundable)}</Typography>
          </Paper>
        )}

        <TextField
          label="Refund Amount (INR)"
          required
          fullWidth
          size="small"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: 1, max: maxRefundable, step: "any" },
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <FormControl fullWidth size="small">
          <InputLabel id="refund-mode-label">Refund Mode</InputLabel>
          <Select
            labelId="refund-mode-label"
            label="Refund Mode"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem" }}
          >
            <MenuItem value="Cash Refund">Cash Refund</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer / NEFT</MenuItem>
            <MenuItem value="UPI Refund">UPI</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
            <MenuItem value="Razorpay Refund">Online Payment Gateway</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Reason for Refund (Mandatory)"
          required
          fullWidth
          size="small"
          multiline
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Course withdrawal within cooling-off period / batch timing conflict..."
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
          <Button type="button" variant="outlined" fullWidth onClick={onClose} sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#475569", fontWeight: 600, textTransform: "none", py: 1.25 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            fullWidth
            disabled={loading || maxRefundable <= 0}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RotateCcw size={14} />}
            sx={{ borderRadius: "12px", fontWeight: 700, textTransform: "none", py: 1.25, boxShadow: "none", bgcolor: "#DC2626", "&:hover": { bgcolor: "#B91C1C" } }}
          >
            {loading ? "Processing..." : "Issue Refund"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
