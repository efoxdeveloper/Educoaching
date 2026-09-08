"use client";

import { useState } from "react";
import { Mail, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";

export function AdminAccountSettingsClient({ currentEmail, adminName }: { currentEmail: string; adminName: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newEmail || !newEmail.includes("@")) {
      setError("Please enter a valid new email address.");
      return;
    }
    if (newEmail.toLowerCase().trim() === currentEmail.toLowerCase().trim()) {
      setError("New email must be different from current email.");
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch("/api/admin/me/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to send confirmation.");
      else {
        setSuccess(data.message);
        setShowForm(false);
        setNewEmail("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ mb: 2.5, display: "flex", alignItems: "center", gap: 1.25, borderBottom: "1px solid #D6E0EB", pb: 2 }}>
        <Avatar variant="rounded" sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#EEF2F7", color: "#1E3A5F" }}>
          <ShieldCheck size={19} />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Platform Admin Account</Typography>
          <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>Manage your platform admin login email with email verification.</Typography>
        </Box>
      </Box>

      <Alert
        severity="info"
        icon={<ShieldCheck size={14} />}
        sx={{ mb: 2.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.5)", border: "1px solid #D6E0EB", color: "#475569", fontSize: "0.75rem" }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#1E3A5F", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 0.75 }}>
          <ShieldCheck size={14} style={{ color: "#4E6E93" }} />
          Two-step Verification Protection
        </Typography>
        <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", display: "block", mt: 0.5, lineHeight: 1.5 }}>
          For security, changing your email requires approval via a confirmation link sent to your <Box component="span" sx={{ fontWeight: 700 }}>current</Box> email address (<Box component="span" sx={{ fontWeight: 700 }}>{currentEmail}</Box>), not the new one.
        </Typography>
      </Alert>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Avatar variant="rounded" sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#1E3A5F" }}>
            <Mail size={15} />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>Change Login Email</Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>Signed in as {adminName} — Current: {currentEmail}</Typography>
          </Box>
        </Box>
        <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", display: "block", mb: 1.5, lineHeight: 1.5 }}>
          Enter the new email you want to switch to. We’ll send a confirmation link to your <Box component="span" sx={{ fontWeight: 700 }}>existing inbox</Box> to approve the change. No change happens until you click that link.
        </Typography>

        {success && <Alert severity="success" icon={<CheckCircle2 size={15} />} sx={{ mb: 2, borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #A7F3D0", bgcolor: "#ECFDF5" }}>{success}</Alert>}
        {error && <Alert severity="error" icon={<AlertCircle size={15} />} sx={{ mb: 2, borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>{error}</Alert>}

        {!showForm ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Mail size={13} />}
            onClick={() => { setShowForm(true); setError(""); }}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#171A21", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1, px: 1.75, bgcolor: "white", "&:hover": { bgcolor: "#F8FAFC" } }}
          >
            Change Login Email
          </Button>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              label="New Email Address"
              required
              fullWidth
              size="small"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. newadmin@vidyalaya.in"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
            />
            <Stack direction="row" spacing={1}>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={requesting}
                startIcon={requesting ? <CircularProgress size={13} color="inherit" /> : undefined}
                sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1, px: 2, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
              >
                Send Confirmation to Current Email
              </Button>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() => setShowForm(false)}
                sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#475569", fontWeight: 500, fontSize: "0.75rem", textTransform: "none", py: 1, px: 2, bgcolor: "white" }}
              >
                Cancel
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Card>
  );
}
