"use client";

import { useState } from "react";
import { Search, Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface AdminTicket {
  id: string;
  instituteId: string;
  userId?: string | null;
  subject: string;
  description: string;
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
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
