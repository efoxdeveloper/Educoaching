"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import DrawerMUI from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

type Transaction = {
  id: string;
  orderId: string;
  paymentId: string | null;
  amount: string;
  purpose: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  method: string | null;
  failureReason: string | null;
  reconciled: boolean;
  reconciledAt: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    mobile: string;
    course: { name: string };
  };
};

type ReconciliationStats = {
  total: number;
  pending: number;
  success: number;
  failed: number;
  reconciliationRate: number;
};

export function ReconciliationDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/reconcile");
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
      if (data.stats) setStats(data.stats);
    } catch {
      setStatusMessage("Failed to load payment transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open]);

  const handleReconcile = async () => {
    setReconciling(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/payments/reconcile", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(
          `Reconciliation completed: ${data.reconciled} reconciled, ${data.failed} marked failed, ${data.stillPending} pending.`
        );
      } else {
        setStatusMessage(data.error || "Reconciliation failed");
      }
      fetchTransactions();
    } catch {
      setStatusMessage("Error running reconciliation job");
    } finally {
      setReconciling(false);
    }
  };

  return (
    <DrawerMUI
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { bgcolor: "rgba(13,26,42,0.4)" } } }}
      sx={{
        zIndex: 50,
        "& .MuiDrawer-paper": {
          width: "100%",
          maxWidth: 760,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          boxShadow: "0 8px 30px rgba(13,26,42,0.12)",
          borderLeft: "1px solid #D6E0EB",
          boxSizing: "border-box",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", px: 3, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "#E9F7EF", color: "#1F9D66", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={18} style={{ animation: reconciling ? "spin 1s linear infinite" : undefined } as any} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontSize: "1.125rem", fontWeight: 600, color: "#171A21" }}>Payment Reconciliation</Typography>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>Audit Razorpay gateway orders, sync webhooks, and auto-settle pending student dues</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: "#7E9BBC", "&:hover": { color: "#171A21", bgcolor: "rgba(0,0,0,0.04)" } }}>
          <X size={20} />
        </IconButton>
      </Box>

      {statusMessage && (
        <Alert severity="info" sx={{ borderRadius: 0, borderBottom: "1px solid #D6E0EB", fontSize: "0.75rem", bgcolor: "#EEF2F7", color: "#4E6E93", py: 1 }}>
          {statusMessage}
        </Alert>
      )}

      {stats && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5, p: 2, borderBottom: "1px solid #D6E0EB", bgcolor: "rgba(238,242,247,0.5)" }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#7E9BBC" }}>Total Online Orders</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#171A21", fontSize: "1.125rem" }}>{stats.total}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#A7F3D0", bgcolor: "#ECFDF5" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#047857" }}>Settled (Success)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#047857", fontSize: "1.125rem" }}>{stats.success}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#FDE68A", bgcolor: "#FFFBEB" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#92400e" }}>Pending Gateway</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#92400e", fontSize: "1.125rem" }}>{stats.pending}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#FECACA", bgcolor: "#FEF2F2" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#B91C1C" }}>Failed / Dropouts</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#B91C1C", fontSize: "1.125rem" }}>{stats.failed}</Typography>
          </Paper>
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", px: 3, py: 1.5 }}>
        <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>
          Webhook endpoint: <Box component="code" sx={{ borderRadius: "6px", bgcolor: "#EEF2F7", px: 0.5, py: 0.25, fontFamily: "monospace", fontSize: "11px" }}>/api/webhooks/razorpay</Box>
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={fetchTransactions}
            disabled={loading || reconciling}
            startIcon={<RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : undefined } as any} />}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#334155", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 0.75 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleReconcile}
            disabled={reconciling}
            startIcon={<RefreshCw size={14} style={{ animation: reconciling ? "spin 1s linear infinite" : undefined } as any} />}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", boxShadow: "none", py: 0.75, "&:hover": { bgcolor: "#182F4C" } }}
          >
            {reconciling ? "Reconciling..." : "Run Auto-Reconciliation"}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
        {transactions.length === 0 ? (
          <Box sx={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#94A3B8", gap: 1 }}>
            <Clock size={32} style={{ color: "#CBD5E1" }} />
            <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#64748b" }}>No online transactions recorded yet.</Typography>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#94A3B8" }}>Online payments via Razorpay checkout will automatically appear here.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 500 }}>
              <TableHead>
                <TableRow sx={{ "& th": { fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", borderBottom: "1px solid #D6E0EB", py: 1 } }}>
                  <TableCell>Student</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Order / Payment ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Gateway Sync</TableCell>
                  <TableCell align="right">Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.25 } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{tx.student?.name}</Typography>
                      <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{tx.student?.course?.name}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{formatCurrency(Number(tx.amount))}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "11px" }}>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#334155", fontSize: "11px", display: "block" }}>{tx.orderId}</Typography>
                      {tx.paymentId && <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#94A3B8", fontSize: "11px" }}>{tx.paymentId}</Typography>}
                    </TableCell>
                    <TableCell>
                      {tx.status === "SUCCESS" && <Chip icon={<CheckCircle2 size={12} />} label="Success" size="small" sx={{ bgcolor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", fontWeight: 600, fontSize: "11px", height: 22 }} />}
                      {tx.status === "PENDING" && <Chip icon={<Clock size={12} />} label="Pending" size="small" sx={{ bgcolor: "#FFFBEB", color: "#92400e", border: "1px solid #FDE68A", fontWeight: 600, fontSize: "11px", height: 22 }} />}
                      {tx.status === "FAILED" && <Chip icon={<AlertCircle size={12} />} label="Failed" size="small" sx={{ bgcolor: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", fontWeight: 600, fontSize: "11px", height: 22 }} />}
                    </TableCell>
                    <TableCell>
                      {tx.reconciled ? (
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>Reconciled</Typography>
                      ) : (
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#94A3B8" }}>Unsettled</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{formatDate(tx.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </DrawerMUI>
  );
}
