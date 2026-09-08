"use client";

import { useEffect, useState } from "react";
import { Bell, Send, CheckCircle2, AlertTriangle, MessageSquare, Mail, History, X } from "lucide-react";
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
import Checkbox from "@mui/material/Checkbox";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

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
          <Box sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "#FFFBEB", color: "#92400e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={18} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontSize: "1.125rem", fontWeight: 600, color: "#171A21" }}>Automated Fee Reminders</Typography>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>Notify students & parents of upcoming or overdue payments via WhatsApp & Email</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: "#7E9BBC", "&:hover": { color: "#171A21", bgcolor: "rgba(0,0,0,0.04)" } }}>
          <X size={20} />
        </IconButton>
      </Box>

      <Box sx={{ borderBottom: "1px solid #D6E0EB", px: 3, pt: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.75rem", minHeight: 36, py: 1 } }}
        >
          <Tab value="candidates" label={`Reminder Candidates (${loading ? "..." : filteredCandidates.length})`} />
          <Tab value="history" label={`Dispatch History (${history.length})`} icon={<History size={13} />} iconPosition="start" />
        </Tabs>
      </Box>

      {statusMessage && (
        <Alert severity="info" sx={{ borderRadius: 0, borderBottom: "1px solid #D6E0EB", fontSize: "0.75rem", bgcolor: "#EEF2F7" }}>
          {statusMessage}
        </Alert>
      )}

      {stats && tab === "candidates" && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5, p: 2, borderBottom: "1px solid #D6E0EB", bgcolor: "rgba(238,242,247,0.5)" }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#7E9BBC" }}>Total Unpaid Balance</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#171A21", fontSize: "1rem" }}>{formatCurrency(stats.totalDue)}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#FECACA", bgcolor: "#FEF2F2" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#B91C1C" }}>Overdue Students</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#B91C1C", fontSize: "1rem" }}>{stats.overdueCount}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#FDE68A", bgcolor: "#FFFBEB" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#92400e" }}>Due in 3 Days</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#92400e", fontSize: "1rem" }}>{stats.dueSoonCount}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "white" }}>
            <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 500, color: "#7E9BBC" }}>Target Selected</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#334155", fontSize: "1rem" }}>{selectedIds.size}</Typography>
          </Paper>
        </Box>
      )}

      {tab === "candidates" ? (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5, borderBottom: "1px solid #D6E0EB", px: 3, py: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>Filter:</Typography>
              <Button variant={filter === "ALL" ? "contained" : "outlined"} size="small" onClick={() => setFilter("ALL")} sx={{ borderRadius: "12px", fontSize: "0.70rem", fontWeight: 600, textTransform: "none", py: 0.5, px: 1.5, bgcolor: filter === "ALL" ? "#1E3A5F" : "white", color: filter === "ALL" ? "white" : "#475569", borderColor: "#D6E0EB", boxShadow: "none", "&:hover": { bgcolor: filter === "ALL" ? "#182F4C" : "#F8FAFC" } }}>
                All ({candidates.length})
              </Button>
              <Button variant={filter === "OVERDUE" ? "contained" : "outlined"} size="small" onClick={() => setFilter("OVERDUE")} sx={{ borderRadius: "12px", fontSize: "0.70rem", fontWeight: 600, textTransform: "none", py: 0.5, px: 1.5, bgcolor: filter === "OVERDUE" ? "#DC2626" : "white", color: filter === "OVERDUE" ? "white" : "#475569", borderColor: "#D6E0EB", boxShadow: "none", "&:hover": { bgcolor: filter === "OVERDUE" ? "#B91C1C" : "#F8FAFC" } }}>
                Overdue ({stats?.overdueCount || 0})
              </Button>
              <Button variant={filter === "DUE_SOON" ? "contained" : "outlined"} size="small" onClick={() => setFilter("DUE_SOON")} sx={{ borderRadius: "12px", fontSize: "0.70rem", fontWeight: 600, textTransform: "none", py: 0.5, px: 1.5, bgcolor: filter === "DUE_SOON" ? "#D97706" : "white", color: filter === "DUE_SOON" ? "white" : "#475569", borderColor: "#D6E0EB", boxShadow: "none", "&:hover": { bgcolor: filter === "DUE_SOON" ? "#B45309" : "#F8FAFC" } }}>
                Due Soon ({stats?.dueSoonCount || 0})
              </Button>
            </Stack>

            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel id="reminder-channel-label" sx={{ fontSize: "0.75rem" }}>Channel</InputLabel>
              <Select
                labelId="reminder-channel-label"
                label="Channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as "WHATSAPP" | "EMAIL" | "ALL")}
                sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.75rem", fontWeight: 600 }}
              >
                <MenuItem value="ALL">WhatsApp & Email (Both)</MenuItem>
                <MenuItem value="WHATSAPP">WhatsApp Only</MenuItem>
                <MenuItem value="EMAIL">Email Only</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
            {filteredCandidates.length === 0 ? (
              <Box sx={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#94A3B8", gap: 1 }}>
                <CheckCircle2 size={32} style={{ color: "#10b981" }} />
                <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#64748b" }}>All clear! No students match this fee filter.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 500 }}>
                  <TableHead>
                    <TableRow sx={{ "& th": { fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", borderBottom: "1px solid #D6E0EB", py: 1 } }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selectedIds.size >= filteredCandidates.length && filteredCandidates.length > 0}
                          onChange={toggleSelectAll}
                          sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }}
                        />
                      </TableCell>
                      <TableCell>Student / Course</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Pending Due</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Last Alert</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCandidates.map((c) => (
                      <TableRow key={c.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.25 } }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleStudent(c.id)}
                            sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{c.name}</Typography>
                          <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{c.courseName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569", display: "block" }}>{c.parentMobile ? `Parent: ${c.parentMobile}` : c.mobile}</Typography>
                          {c.email && <Typography variant="caption" sx={{ fontSize: "10px", color: "#94A3B8" }}>{c.email}</Typography>}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#171A21", fontSize: "0.80rem" }}>{formatCurrency(c.dueAmount)}</TableCell>
                        <TableCell sx={{ fontSize: "0.80rem", color: "#64748b" }}>{c.dueDate ? formatDate(c.dueDate) : "—"}</TableCell>
                        <TableCell>
                          {c.status === "OVERDUE" && <Chip icon={<AlertTriangle size={11} />} label="Overdue" size="small" sx={{ bgcolor: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", fontWeight: 600, fontSize: "11px", height: 22 }} />}
                          {c.status === "DUE_SOON" && <Chip label="Due Soon" size="small" sx={{ bgcolor: "#FFFBEB", color: "#92400e", border: "1px solid #FDE68A", fontWeight: 600, fontSize: "11px", height: 22 }} />}
                          {c.status === "PENDING" && <Chip label="Pending" size="small" variant="outlined" sx={{ bgcolor: "#F8FAFC", color: "#475569", borderColor: "#D6E0EB", fontWeight: 600, fontSize: "11px", height: 22 }} />}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{c.lastReminderSentAt ? formatDate(c.lastReminderSentAt) : "Never"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #D6E0EB", bgcolor: "rgba(238,242,247,0.5)", px: 3, py: 2 }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#64748b" }}>
              {selectedIds.size} student{selectedIds.size === 1 ? "" : "s"} selected for dispatch
            </Typography>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0}
              startIcon={<Send size={15} />}
              sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.875rem", textTransform: "none", px: 3, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
            >
              {sending ? "Sending Reminders..." : `Send Reminders (${selectedIds.size})`}
            </Button>
          </Box>
        </>
      ) : (
        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
          {history.length === 0 ? (
            <Box sx={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#94A3B8", gap: 1 }}>
              <History size={32} style={{ color: "#CBD5E1" }} />
              <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#64748b" }}>No reminders sent yet.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", borderBottom: "1px solid #D6E0EB", py: 1 } }}>
                    <TableCell>Student</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Due Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Sent Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.25 } }}>
                      <TableCell sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{h.student?.name}</TableCell>
                      <TableCell>
                        <Chip
                          icon={h.channel === "WHATSAPP" ? <MessageSquare size={11} /> : <Mail size={11} />}
                          label={h.channel}
                          size="small"
                          sx={{ bgcolor: "#EEF2F7", color: "#1E3A5F", border: "1px solid #D6E0EB", fontWeight: 600, fontSize: "11px", height: 22, fontFamily: "monospace" }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "11px", color: "#475569" }}>{h.recipient}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.80rem" }}>{formatCurrency(Number(h.amountDue))}</TableCell>
                      <TableCell>
                        <Chip label={h.status} size="small" sx={{ fontSize: "11px", fontWeight: 600, height: 22, bgcolor: h.status === "SENT" ? "#ECFDF5" : "#FEF2F2", color: h.status === "SENT" ? "#047857" : "#B91C1C", border: h.status === "SENT" ? "1px solid #A7F3D0" : "1px solid #FECACA" }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: "11px", color: "#7E9BBC" }}>{formatDate(h.sentAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </DrawerMUI>
  );
}
