"use client";

import { useState } from "react";
import {
  KeyRound,
  Mail,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
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

type SecurityCredentialsSectionProps = {
  currentEmail: string;
  ownerName: string;
  canManage: boolean;
};

export function SecurityCredentialsSection({
  currentEmail,
  ownerName,
  canManage,
}: SecurityCredentialsSectionProps) {
  // Password change state
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Email change state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [requestingEmail, setRequestingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleRequestPasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    setRequestingPassword(true);

    try {
      const res = await fetch("/api/institutes/me/security/request-password-change", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Failed to send password verification email.");
      } else {
        setPasswordSuccess(data.message);
      }
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setRequestingPassword(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail || !newEmail.includes("@")) {
      setEmailError("Please enter a valid new email address.");
      return;
    }

    setRequestingEmail(true);

    try {
      const res = await fetch("/api/institutes/me/security/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEmailError(data.error || "Failed to send email change verification link.");
      } else {
        setEmailSuccess(data.message);
        setShowEmailDialog(false);
      }
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setRequestingEmail(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ mb: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #D6E0EB", pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Avatar variant="rounded" sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#EEF2F7", color: "#1E3A5F" }}>
            <ShieldCheck size={19} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>
              Security & Credentials
            </Typography>
            <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
              Manage institute owner login email and password with secure email verification.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Global verification notice */}
      <Alert
        severity="info"
        icon={<ShieldCheck size={14} />}
        sx={{ mb: 2.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.5)", border: "1px solid #D6E0EB", color: "#475569", fontSize: "0.75rem" }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#1E3A5F", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 0.75 }}>
          <ShieldCheck size={14} style={{ color: "#4E6E93" }} />
          Two-step Owner Verification Protection
        </Typography>
        <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", display: "block", mt: 0.5, lineHeight: 1.5 }}>
          For your institute&apos;s security, password and email updates require confirmation via a verification link sent to your registered email address (<Box component="span" sx={{ fontWeight: 700 }}>{currentEmail}</Box>).
        </Typography>
      </Alert>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
        {/* Password Change Box */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", bgcolor: "white", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar variant="rounded" sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#1E3A5F" }}>
              <KeyRound size={15} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>Change Password</Typography>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>Account login password for {ownerName}</Typography>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.5 }}>
            Clicking below will send a verification email with a 1-hour secure link to confirm that it is you changing your password.
          </Typography>

          {passwordSuccess && (
            <Alert severity="success" icon={<CheckCircle2 size={15} />} sx={{ borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #A7F3D0", bgcolor: "#ECFDF5" }}>
              {passwordSuccess}
            </Alert>
          )}

          {passwordError && (
            <Alert severity="error" icon={<AlertCircle size={15} />} sx={{ borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>
              {passwordError}
            </Alert>
          )}

          <Button
            variant="outlined"
            size="small"
            disabled={requestingPassword || !canManage}
            onClick={handleRequestPasswordChange}
            startIcon={requestingPassword ? <CircularProgress size={13} color="inherit" /> : <KeyRound size={13} />}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#171A21", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1, px: 1.75, bgcolor: "white", "&:hover": { bgcolor: "#F8FAFC" }, alignSelf: "flex-start" }}
          >
            Request Password Change
          </Button>
        </Paper>

        {/* Email Change Box */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "#D6E0EB", bgcolor: "white", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar variant="rounded" sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#1E3A5F" }}>
              <Mail size={15} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>Change Owner Email</Typography>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>Current: {currentEmail}</Typography>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.5 }}>
            Request an email update. A verification link will be sent to your current email to confirm the change.
          </Typography>

          {emailSuccess && (
            <Alert severity="success" icon={<CheckCircle2 size={15} />} sx={{ borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #A7F3D0", bgcolor: "#ECFDF5" }}>
              {emailSuccess}
            </Alert>
          )}

          {emailError && (
            <Alert severity="error" icon={<AlertCircle size={15} />} sx={{ borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>
              {emailError}
            </Alert>
          )}

          {!showEmailDialog ? (
            <Button
              variant="outlined"
              size="small"
              disabled={!canManage}
              startIcon={<Mail size={13} />}
              onClick={() => {
                setShowEmailDialog(true);
                setEmailError("");
              }}
              sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#171A21", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1, px: 1.75, bgcolor: "white", "&:hover": { bgcolor: "#F8FAFC" }, alignSelf: "flex-start" }}
            >
              Change Login Email
            </Button>
          ) : (
            <Box component="form" onSubmit={handleRequestEmailChange} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <TextField
                label="New Owner Email Address"
                required
                fullWidth
                size="small"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. newowner@institute.com"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
              />

              <Stack direction="row" spacing={1}>
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={requestingEmail}
                  startIcon={requestingEmail ? <CircularProgress size={13} color="inherit" /> : undefined}
                  sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1, px: 2, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
                >
                  Send Confirmation Mail
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => setShowEmailDialog(false)}
                  sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#475569", fontWeight: 500, fontSize: "0.75rem", textTransform: "none", py: 1, px: 2, bgcolor: "white" }}
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Card>
  );
}
