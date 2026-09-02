"use client";

import { useEffect, useState } from "react";
import { X, Bell, Send, CheckCircle2, AlertTriangle, MessageSquare, Mail, History } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Candidate = {
  id: string;
  name: string;
  mobile: string;
  parentMobile: string | null;
  email: string | null;
  courseName: string;
  totalFee: number;
  paidFee: number;
  dueAmount: number;
  dueDate: string | null;
  status: "OVERDUE" | "DUE_SOON" | "PENDING";
  lastReminderSentAt?: string | null;
};

type ReminderLog = {
  id: string;
  channel: string;
  recipient: string;
  amountDue: string;
  status: string;
  sentAt: string;
  student: { name: string };
};

export function FeeRemindersDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"candidates" | "history">("candidates");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [history, setHistory] = useState<ReminderLog[]>([]);
  const [stats, setStats] = useState<{ totalCandidates: number; overdueCount: number; dueSoonCount: number; totalDue: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<"WHATSAPP" | "EMAIL" | "ALL">("ALL");
  const [filter, setFilter] = useState<"ALL" | "OVERDUE" | "DUE_SOON">("ALL");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fees/reminders");
      const data = await res.json();
      if (data.candidates) {
        setCandidates(data.candidates);
        // Pre-select overdue & due soon by default
        const defaultSelected = new Set<string>(
          data.candidates.filter((c: Candidate) => c.status !== "PENDING").map((c: Candidate) => c.id)
        );
        setSelectedIds(defaultSelected);
      }
      if (data.recentLogs) setHistory(data.recentLogs);
      if (data.stats) setStats(data.stats);
    } catch {
      setStatusMessage("Failed to load fee reminder data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCandidates();
    }
  }, [open]);

  const toggleSelectAll = () => {
    const visible = filteredCandidates;
    if (selectedIds.size >= visible.length && visible.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((c) => c.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/fees/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          channel,
        }),
      });
      const data = await res.json();
      setStatusMessage(
        `Dispatched successfully: ${data.sentCount} sent, ${data.failedCount} failed, ${data.skippedCount} skipped (no contact).`
      );
      fetchCandidates();
    } catch {
      setStatusMessage("Error sending reminders");
    } finally {
      setSending(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (filter === "OVERDUE") return c.status === "OVERDUE";
    if (filter === "DUE_SOON") return c.status === "DUE_SOON";
    return true;
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-scholar-950/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-3xl flex-col bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-scholar-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Automated Fee Reminders</h2>
              <p className="text-xs text-scholar-500">
                Notify students & parents of upcoming or overdue payments via WhatsApp & Email
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

        {/* Tab switcher */}
        <div className="flex border-b border-scholar-100 px-6 pt-2">
          <button
            onClick={() => setTab("candidates")}
            className={`border-b-2 px-4 py-2 text-xs font-semibold ${
              tab === "candidates"
                ? "border-scholar-600 text-scholar-900"
                : "border-transparent text-scholar-400 hover:text-scholar-600"
            }`}
          >
            Reminder Candidates ({loading ? "..." : filteredCandidates.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold ${
              tab === "history"
                ? "border-scholar-600 text-scholar-900"
                : "border-transparent text-scholar-400 hover:text-scholar-600"
            }`}
          >
            <History size={13} /> Dispatch History ({history.length})
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div className="border-b border-scholar-100 bg-scholar-50 px-6 py-2.5 text-xs text-scholar-700">
            {statusMessage}
          </div>
        )}

        {/* Stats Row */}
        {stats && tab === "candidates" && (
          <div className="grid grid-cols-4 gap-3 border-b border-scholar-100 bg-scholar-50/50 p-4">
            <div className="rounded-lg border border-scholar-100 bg-white p-3">
              <p className="text-[11px] font-medium text-scholar-400">Total Unpaid Balance</p>
              <p className="text-base font-bold text-ink">{formatCurrency(stats.totalDue)}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
              <p className="text-[11px] font-medium text-rose-700">Overdue Students</p>
              <p className="text-base font-bold text-rose-800">{stats.overdueCount}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              <p className="text-[11px] font-medium text-amber-700">Due in 3 Days</p>
              <p className="text-base font-bold text-amber-800">{stats.dueSoonCount}</p>
            </div>
            <div className="rounded-lg border border-scholar-200 bg-white p-3">
              <p className="text-[11px] font-medium text-scholar-400">Target Selected</p>
              <p className="text-base font-bold text-scholar-700">{selectedIds.size}</p>
            </div>
          </div>
        )}

        {tab === "candidates" ? (
          <>
            {/* Filters & Channel Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-scholar-100 px-6 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-scholar-500">Filter:</span>
                <button
                  onClick={() => setFilter("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    filter === "ALL"
                      ? "bg-scholar-700 text-white"
                      : "border border-scholar-200 bg-white text-scholar-600 hover:bg-scholar-50"
                  }`}
                >
                  All ({candidates.length})
                </button>
                <button
                  onClick={() => setFilter("OVERDUE")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    filter === "OVERDUE"
                      ? "bg-rose-600 text-white"
                      : "border border-scholar-200 bg-white text-scholar-600 hover:bg-scholar-50"
                  }`}
                >
                  Overdue ({stats?.overdueCount || 0})
                </button>
                <button
                  onClick={() => setFilter("DUE_SOON")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    filter === "DUE_SOON"
                      ? "bg-amber-600 text-white"
                      : "border border-scholar-200 bg-white text-scholar-600 hover:bg-scholar-50"
                  }`}
                >
                  Due Soon ({stats?.dueSoonCount || 0})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-scholar-500">Channel:</span>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as "WHATSAPP" | "EMAIL" | "ALL")}
                  className="rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-xs font-medium text-scholar-700 outline-none"
                >
                  <option value="ALL">WhatsApp & Email (Both)</option>
                  <option value="WHATSAPP">WhatsApp Only</option>
                  <option value="EMAIL">Email Only</option>
                </select>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              {filteredCandidates.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-scholar-400">
                  <CheckCircle2 size={32} className="mb-2 text-emerald-500" />
                  <p>All clear! No students match this fee filter.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-scholar-100 text-[11px] font-semibold uppercase tracking-wider text-scholar-400">
                      <th className="w-8 pb-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.size >= filteredCandidates.length && filteredCandidates.length > 0}
                          onChange={toggleSelectAll}
                          className="h-3.5 w-3.5 rounded border-scholar-300 text-scholar-600"
                        />
                      </th>
                      <th className="pb-2">Student / Course</th>
                      <th className="pb-2">Contact</th>
                      <th className="pb-2">Pending Due</th>
                      <th className="pb-2">Due Date</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Last Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-scholar-50">
                    {filteredCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-scholar-50/50">
                        <td className="py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleStudent(c.id)}
                            className="h-3.5 w-3.5 rounded border-scholar-300 text-scholar-600"
                          />
                        </td>
                        <td className="py-2.5">
                          <p className="font-semibold text-ink">{c.name}</p>
                          <p className="text-[11px] text-scholar-400">{c.courseName}</p>
                        </td>
                        <td className="py-2.5">
                          <div className="flex flex-col text-[11px] text-scholar-600">
                            <span>{c.parentMobile ? `Parent: ${c.parentMobile}` : c.mobile}</span>
                            {c.email && <span className="text-[10px] text-scholar-400">{c.email}</span>}
                          </div>
                        </td>
                        <td className="py-2.5 font-bold text-ink">
                          {formatCurrency(c.dueAmount)}
                        </td>
                        <td className="py-2.5 text-scholar-500">
                          {c.dueDate ? formatDate(c.dueDate) : "—"}
                        </td>
                        <td className="py-2.5">
                          {c.status === "OVERDUE" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">
                              <AlertTriangle size={11} /> Overdue
                            </span>
                          )}
                          {c.status === "DUE_SOON" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                              Due Soon
                            </span>
                          )}
                          {c.status === "PENDING" && (
                            <span className="rounded-full bg-scholar-50 px-2 py-0.5 font-medium text-scholar-600">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-[11px] text-scholar-400">
                          {c.lastReminderSentAt ? formatDate(c.lastReminderSentAt) : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Dispatch Action */}
            <div className="flex items-center justify-between border-t border-scholar-100 bg-scholar-50/60 px-6 py-4">
              <p className="text-xs text-scholar-500">
                {selectedIds.size} student{selectedIds.size === 1 ? "" : "s"} selected for dispatch
              </p>
              <button
                onClick={handleSend}
                disabled={sending || selectedIds.size === 0}
                className="flex items-center gap-2 rounded-xl bg-scholar-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700 disabled:opacity-50"
              >
                <Send size={15} />
                {sending ? "Sending Reminders..." : `Send Reminders (${selectedIds.size})`}
              </button>
            </div>
          </>
        ) : (
          /* History View */
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {history.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-scholar-400">
                <History size={32} className="mb-2 text-scholar-300" />
                <p>No reminders sent yet.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-scholar-100 text-[11px] font-semibold uppercase tracking-wider text-scholar-400">
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Channel</th>
                    <th className="pb-2">Recipient</th>
                    <th className="pb-2">Due Amount</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-scholar-50">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-scholar-50/50">
                      <td className="py-2.5 font-semibold text-ink">{h.student?.name}</td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 rounded bg-scholar-100 px-1.5 py-0.5 font-mono text-[10px] text-scholar-700">
                          {h.channel === "WHATSAPP" ? <MessageSquare size={11} /> : <Mail size={11} />}
                          {h.channel}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-scholar-600">{h.recipient}</td>
                      <td className="py-2.5 font-semibold text-ink">{formatCurrency(Number(h.amountDue))}</td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            h.status === "SENT"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-[11px] text-scholar-400">{formatDate(h.sentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
