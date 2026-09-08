"use client";

import { useState } from "react";
import { Search, Building2, Mail, MessageCircle, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";

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

  const getStatusChip = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Chip label={status} size="small" sx={{ bgcolor: "#FFFBEB", color: "#92400e", border: "1px solid #FDE68A", fontWeight: 700, fontSize: "10px", height: 20 }} />;
      case "IN_PROGRESS":
        return <Chip label={status} size="small" sx={{ bgcolor: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE", fontWeight: 700, fontSize: "10px", height: 20 }} />;
      case "RESOLVED":
        return <Chip label={status} size="small" sx={{ bgcolor: "#ECFDF5", color: "#065f46", border: "1px solid #A7F3D0", fontWeight: 700, fontSize: "10px", height: 20 }} />;
      case "CLOSED":
        return <Chip label={status} size="small" sx={{ bgcolor: "#F1F5F9", color: "#475569", border: "1px solid #D6E0EB", fontWeight: 700, fontSize: "10px", height: 20 }} />;
      default:
        return <Chip label={status} size="small" sx={{ bgcolor: "#F1F5F9", color: "#475569", border: "1px solid #D6E0EB", fontWeight: 600, fontSize: "10px", height: 20 }} />;
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Search & Status Filters — MUI TextField/Select */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <TextField
          size="small"
          placeholder="Search tickets by institute, subject, user..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} style={{ color: "#7E9BBC" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, maxWidth: { sm: 360 }, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem" } }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="admin-tickets-status-label" sx={{ fontSize: "0.75rem" }}>Status</InputLabel>
          <Select
            labelId="admin-tickets-status-label"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 500 }}
          >
            <MenuItem value="ALL">All Statuses ({tickets.length})</MenuItem>
            <MenuItem value="OPEN">Open</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
            <MenuItem value="RESOLVED">Resolved</MenuItem>
            <MenuItem value="CLOSED">Closed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Stack spacing={1.5}>
        {filtered.length === 0 ? (
          <Card sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>No support tickets found matching the selected filter.</Typography>
          </Card>
        ) : (
          filtered.map((ticket) => (
            <Card key={ticket.id} sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93" }}>
                    <Building2 size={15} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem" }}>{ticket.institute.name}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>Owner: {ticket.institute.ownerName}</Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8" }}>•</Typography>
                      <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>{ticket.institute.mobile}</Typography>
                      {ticket.user && (
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
                          • Submitter: {ticket.user.name} ({ticket.user.email})
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  {getStatusChip(ticket.status)}
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{formatDate(new Date(ticket.createdAt))}</Typography>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <Select
                      value={ticket.status}
                      disabled={updatingId === ticket.id}
                      onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                      sx={{ borderRadius: "8px", bgcolor: "white", fontSize: "0.70rem", fontWeight: 700, height: 28, "& .MuiSelect-select": { py: 0.5 } }}
                    >
                      <MenuItem value="OPEN">OPEN</MenuItem>
                      <MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem>
                      <MenuItem value="RESOLVED">RESOLVED</MenuItem>
                      <MenuItem value="CLOSED">CLOSED</MenuItem>
                    </Select>
                  </FormControl>
                  {updatingId === ticket.id && <CircularProgress size={14} sx={{ color: "#4E6E93" }} />}
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem", mb: 0.5 }}>{ticket.subject}</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.4)", borderColor: "#D6E0EB" }}>
                  <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ticket.description}</Typography>
                </Paper>
              </Box>

              {/* Contact & branch context */}
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                <Chip icon={<Mail size={11} />} label={ticket.contactEmail || ticket.user?.email || ticket.institute.email} size="small" sx={{ height: 20, fontSize: "11px", bgcolor: "white", border: "1px solid #D6E0EB" }} />
                <Chip icon={<MessageCircle size={11} />} label={ticket.contactMobile || ticket.institute.mobile} size="small" sx={{ height: 20, fontSize: "11px", bgcolor: "white", border: "1px solid #D6E0EB" }} />
                {ticket.userRole && <Chip label={ticket.userRole} size="small" sx={{ height: 20, fontSize: "11px", fontWeight: 700, bgcolor: "#EEF2F7", border: "1px solid #D6E0EB" }} />}
                {ticket.branch && <Chip label={ticket.branch.name} size="small" sx={{ height: 20, fontSize: "11px", fontWeight: 700, bgcolor: "#F5F3FF", color: "#6D28D9", border: "1px solid #DDD6FE" }} />}
              </Paper>

              {/* Reply thread — Card/Paper */}
              {ticket.replies && ticket.replies.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#334155", fontSize: "11px" }}>Reply history ({ticket.replies.length}):</Typography>
                  {ticket.replies.map((r) => (
                    <Paper key={r.id} variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white" }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                        <Chip
                          icon={r.channel === "EMAIL" ? <Mail size={10} /> : r.channel === "WHATSAPP" ? <MessageCircle size={10} /> : undefined}
                          label={r.channel}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "10px",
                            fontWeight: 700,
                            border: "1px solid",
                            borderColor: r.channel === "EMAIL" ? "#BFDBFE" : r.channel === "WHATSAPP" ? "#A7F3D0" : "#D6E0EB",
                            bgcolor: r.channel === "EMAIL" ? "#EFF6FF" : r.channel === "WHATSAPP" ? "#ECFDF5" : "#F8FAFC",
                            color: r.channel === "EMAIL" ? "#1E40AF" : r.channel === "WHATSAPP" ? "#065f46" : "#475569",
                          }}
                        />
                        <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{formatDate(new Date(r.sentAt))} {r.sentByAdmin ? `• ${r.sentByAdmin.name}` : ""}</Typography>
                      </Box>
                      {r.subject && <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.75rem" }}>{r.subject}</Typography>}
                      <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "#334155", whiteSpace: "pre-wrap" }}>{r.message}</Typography>
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Reply actions — TextField for reply box */}
              <ReplyForm ticket={ticket} onReplied={(updated) => setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...(updated as any) } : t))} />
            </Card>
          ))
        )}
      </Stack>
    </Box>
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
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white", display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id={`reply-channel-${ticket.id}`} sx={{ fontSize: "0.75rem" }}>Channel</InputLabel>
          <Select
            labelId={`reply-channel-${ticket.id}`}
            label="Channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as any)}
            sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 700 }}
          >
            <MenuItem value="EMAIL">Reply via Email</MenuItem>
            <MenuItem value="WHATSAPP">Reply via WhatsApp</MenuItem>
            <MenuItem value="IN_APP">In-app reply</MenuItem>
          </Select>
        </FormControl>
        {channel === "WHATSAPP" && (
          <Chip label="Requires approved WhatsApp template — sandbox will log only" size="small" sx={{ height: 20, fontSize: "10px", bgcolor: "#FFFBEB", color: "#92400e", border: "1px solid #FDE68A" }} />
        )}
      </Box>
      {channel === "EMAIL" && (
        <TextField
          size="small"
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem" } }}
        />
      )}
      <TextField
        size="small"
        multiline
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={channel === "EMAIL" ? "Write email reply..." : channel === "WHATSAPP" ? "Short WhatsApp message..." : "In-app reply..."}
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem" } }}
      />
      {feedback && (
        <Alert
          severity={feedback.type === "success" ? "success" : "error"}
          icon={feedback.type === "success" ? <Send size={12} /> : <AlertCircle size={12} />}
          sx={{ borderRadius: "12px", fontSize: "0.75rem", py: 0.5 }}
        >
          {feedback.text}
        </Alert>
      )}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          size="small"
          disabled={sending || !message.trim()}
          onClick={handleSend}
          startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <Send size={12} />}
          sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", py: 1, px: 2.5, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
        >
          {sending ? "Sending..." : `Send ${channel === "EMAIL" ? "Email" : channel === "WHATSAPP" ? "WhatsApp" : "Reply"}`}
        </Button>
      </Box>
    </Paper>
  );
}
