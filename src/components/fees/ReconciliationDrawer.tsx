"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-scholar-950/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-3xl flex-col bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-scholar-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <RefreshCw size={18} className={reconciling ? "animate-spin" : ""} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Payment Reconciliation</h2>
              <p className="text-xs text-scholar-500">
                Audit Razorpay gateway orders, sync webhooks, and auto-settle pending student dues
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-50 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status / Alert banner */}
        {statusMessage && (
          <div className="border-b border-scholar-100 bg-scholar-50 px-6 py-2.5 text-xs text-scholar-700">
            {statusMessage}
          </div>
        )}

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 border-b border-scholar-100 bg-scholar-50/50 p-4">
            <div className="rounded-lg border border-scholar-100 bg-white p-3">
              <p className="text-[11px] font-medium text-scholar-400">Total Online Orders</p>
              <p className="text-lg font-bold text-ink">{stats.total}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
              <p className="text-[11px] font-medium text-emerald-700">Settled (Success)</p>
              <p className="text-lg font-bold text-emerald-800">{stats.success}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              <p className="text-[11px] font-medium text-amber-700">Pending Gateway</p>
              <p className="text-lg font-bold text-amber-800">{stats.pending}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
              <p className="text-[11px] font-medium text-rose-700">Failed / Dropouts</p>
              <p className="text-lg font-bold text-rose-800">{stats.failed}</p>
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex items-center justify-between border-b border-scholar-100 px-6 py-3">
          <p className="text-xs text-scholar-500">
            Webhook endpoint: <code className="rounded bg-scholar-100 px-1 py-0.5 font-mono text-[11px]">/api/webhooks/razorpay</code>
          </p>
          <div className="flex gap-2">
            <button
              onClick={fetchTransactions}
              disabled={loading || reconciling}
              className="flex items-center gap-1.5 rounded-lg border border-scholar-200 px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={handleReconcile}
              disabled={reconciling}
              className="flex items-center gap-1.5 rounded-lg bg-scholar-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={reconciling ? "animate-spin" : ""} />
              {reconciling ? "Reconciling..." : "Run Auto-Reconciliation"}
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {transactions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-scholar-400">
              <Clock size={32} className="mb-2 text-scholar-300" />
              <p>No online transactions recorded yet.</p>
              <p className="text-xs">Online payments via Razorpay checkout will automatically appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-scholar-100 text-[11px] font-semibold uppercase tracking-wider text-scholar-400">
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Order / Payment ID</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Gateway Sync</th>
                  <th className="pb-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-scholar-50/50">
                    <td className="py-2.5">
                      <p className="font-semibold text-ink">{tx.student?.name}</p>
                      <p className="text-[11px] text-scholar-400">{tx.student?.course?.name}</p>
                    </td>
                    <td className="py-2.5 font-semibold text-ink">
                      {formatCurrency(Number(tx.amount))}
                    </td>
                    <td className="py-2.5 font-mono text-[11px]">
                      <p className="text-scholar-700">{tx.orderId}</p>
                      {tx.paymentId && <p className="text-scholar-400">{tx.paymentId}</p>}
                    </td>
                    <td className="py-2.5">
                      {tx.status === "SUCCESS" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                          <CheckCircle2 size={12} /> Success
                        </span>
                      )}
                      {tx.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                      {tx.status === "FAILED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">
                          <AlertCircle size={12} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {tx.reconciled ? (
                        <span className="text-[11px] text-emerald-600 font-medium">Reconciled</span>
                      ) : (
                        <span className="text-[11px] text-scholar-400">Unsettled</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-[11px] text-scholar-400">
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
