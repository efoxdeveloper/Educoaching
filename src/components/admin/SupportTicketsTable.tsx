"use client";

import { useState } from "react";
import { Search, Building2, Mail, MessageCircle, Send, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface AdminTicket {
  id: string;
  instituteId: string;
  branchId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  subject: string;
  description: string;
  contactEmail?: string | null;
  contactMobile?: string | null;
  status: string;
  createdAt: string;
  institute: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    ownerName: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  branch?: { id: string; name: string } | null;
  replies?: Array<{
    id: string;
    channel: string;
    message: string;
    subject?: string | null;
    sentAt: string;
    sentByAdmin?: { name: string; email: string } | null;
  }>;
}

export function SupportTicketsTable({ initialTickets }: { initialTickets: AdminTicket[] }) {
  const [tickets, setTickets] = useState<AdminTicket[]>(initialTickets);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchInst = t.institute.name.toLowerCase().includes(q);
      const matchSubject = t.subject.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchUser = (t.user?.name || "").toLowerCase().includes(q);
      if (!matchInst && !matchSubject && !matchDesc && !matchUser) return false;
    }
    return true;
  });

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: data.ticket.status } : t))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "RESOLVED":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "CLOSED":
        return "bg-white/10 text-white/70 border-white/20";
      default:
        return "bg-white/10 text-white/70 border-white/20";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" size={14} />
          <input
            type="text"
            placeholder="Search tickets by institute, subject, user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-scholar-200 bg-white pl-9 pr-3 py-2 text-xs text-ink placeholder:text-scholar-400 focus:outline-none focus:border-scholar-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-medium text-scholar-700 shadow-2xs outline-none"
          >
            <option value="ALL">All Statuses ({tickets.length})</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-xs text-scholar-500">
            No support tickets found matching the selected filter.
          </Card>
        ) : (
          filtered.map((ticket) => (
            <Card key={ticket.id} className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-scholar-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-100 text-scholar-700 font-bold text-xs">
                    <Building2 size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-ink">{ticket.institute.name}</span>
                    <div className="flex items-center gap-2 text-[11px] text-scholar-500">
                      <span>Owner: {ticket.institute.ownerName}</span>
                      <span>• {ticket.institute.mobile}</span>
                      {ticket.user && (
                        <span>
                          • Submitter: {ticket.user.name} ({ticket.user.email})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>
                  <span className="text-[11px] text-scholar-400">
                    {formatDate(new Date(ticket.createdAt))}
                  </span>
                  <select
                    value={ticket.status}
                    disabled={updatingId === ticket.id}
                    onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                    className="rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-xs font-bold text-scholar-800 outline-none"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-ink mb-1">{ticket.subject}</h4>
                <p className="text-xs text-scholar-700 whitespace-pre-wrap bg-scholar-50/70 p-3 rounded-xl border border-scholar-100 font-normal leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {/* Contact & branch context — admin doesn't have to hunt */}
              <div className="flex flex-wrap gap-2 text-[11px] text-scholar-600 bg-white border border-scholar-100 rounded-xl p-2.5">
                <span className="inline-flex items-center gap-1"><Mail size={11} /> {ticket.contactEmail || ticket.user?.email || ticket.institute.email}</span>
                <span className="inline-flex items-center gap-1"><MessageCircle size={11} /> {ticket.contactMobile || ticket.institute.mobile}</span>
                {ticket.userRole && <span className="rounded-md bg-scholar-100 px-2 py-0.5 font-bold">{ticket.userRole}</span>}
                {ticket.branch && <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 font-bold text-purple-800">{ticket.branch.name}</span>}
              </div>

              {/* Reply thread */}
              {ticket.replies && ticket.replies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-scholar-700">Reply history ({ticket.replies.length}):</p>
                  {ticket.replies.map((r) => (
                    <div key={r.id} className="rounded-xl border p-3 text-xs bg-white">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${r.channel === "EMAIL" ? "bg-blue-50 text-blue-700 border-blue-200" : r.channel === "WHATSAPP" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-scholar-50 text-scholar-700 border-scholar-200"}`}>
                          {r.channel === "EMAIL" ? <Mail size={10} /> : r.channel === "WHATSAPP" ? <MessageCircle size={10} /> : <span>💬</span>} {r.channel}
                        </span>
                        <span className="text-[11px] text-scholar-400">{formatDate(new Date(r.sentAt))} {r.sentByAdmin ? `• ${r.sentByAdmin.name}` : ""}</span>
                      </div>
                      {r.subject && <p className="font-bold text-ink text-xs">{r.subject}</p>}
                      <p className="whitespace-pre-wrap text-scholar-700">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply actions */}
              <ReplyForm ticket={ticket} onReplied={(updated) => setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...(updated as any) } : t))} />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function ReplyForm({ ticket, onReplied }: { ticket: AdminTicket; onReplied: (t: any) => void }) {
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP" | "IN_APP">("EMAIL");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState(`Re: ${ticket.subject} [#${ticket.id.slice(-6).toUpperCase()}]`);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) {
      setFeedback({ type: "error", text: "Message is required" });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, message: message.trim(), subject: channel === "EMAIL" ? subject.trim() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply");
      setFeedback({ type: "success", text: `Reply sent via ${channel}${data.warning ? ` — ${data.warning}` : ""}` });
      setMessage("");
      // Refresh ticket
      const refreshed = await fetch(`/api/admin/support-tickets/${ticket.id}/reply`).then(r => r.json()).catch(() => null);
      if (refreshed && refreshed.id) {
        onReplied(refreshed);
      } else {
        // Optimistically append
        onReplied({ replies: [...(ticket.replies || []), { id: Date.now().toString(), channel, message, subject, sentAt: new Date().toISOString(), sentByAdmin: { name: "You" } }], status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status });
      }
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Failed to send" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-scholar-200 bg-white p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select value={channel} onChange={(e) => setChannel(e.target.value as any)} className="rounded-lg border border-scholar-200 bg-white px-2 py-1.5 text-xs font-bold">
          <option value="EMAIL">Reply via Email</option>
          <option value="WHATSAPP">Reply via WhatsApp</option>
          <option value="IN_APP">In-app reply</option>
        </select>
        {channel === "WHATSAPP" && (
          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">Requires approved WhatsApp template — sandbox will log only</span>
        )}
      </div>
      {channel === "EMAIL" && (
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-xl border border-scholar-200 px-3 py-2 text-xs outline-none focus:border-scholar-400" />
      )}
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={channel === "EMAIL" ? "Write email reply..." : channel === "WHATSAPP" ? "Short WhatsApp message..." : "In-app reply..."} rows={3} className="w-full rounded-xl border border-scholar-200 px-3 py-2 text-xs outline-none focus:border-scholar-400 resize-y" />
      {feedback && (
        <div className={`flex items-center gap-1.5 rounded-xl border p-2 text-xs ${feedback.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
          {feedback.type === "success" ? <Send size={12} /> : <AlertCircle size={12} />} <span>{feedback.text}</span>
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={handleSend} disabled={sending || !message.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-700 px-4 py-2 text-xs font-bold text-white hover:bg-scholar-800 disabled:opacity-50">
          {sending ? "Sending..." : <><Send size={12} /> Send {channel === "EMAIL" ? "Email" : channel === "WHATSAPP" ? "WhatsApp" : "Reply"}</>}
        </button>
      </div>
    </div>
  );
}
