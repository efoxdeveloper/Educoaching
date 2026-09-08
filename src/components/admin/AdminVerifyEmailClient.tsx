"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";

type VerifyData = {
  valid: boolean;
  targetEmail: string | null;
  currentEmail?: string;
  adminName?: string;
  expiresAt?: string;
};

export function AdminVerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerifyData | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No verification token found in URL. Please check the link from your email.");
      setLoading(false);
      return;
    }
    const check = async () => {
      try {
        const res = await fetch(`/api/admin/me/verify-email-change?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) setError(json.error || "Invalid or expired link.");
        else setData(json);
      } catch {
        setError("Network error while validating link.");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/me/verify-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Failed to update email.");
      else setSuccess(json.message || "Email successfully updated!");
    } catch {
      setError("Failed to update email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#F7F5F0", p: 2 }}>
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 448,
          p: 4,
          borderRadius: "16px",
          borderColor: "#D6E0EB",
          boxShadow: "0 1px 2px rgba(13,26,42,0.04), 0 1px 8px rgba(13,26,42,0.06)",
        }}
      >
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Avatar variant="rounded" sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: "#EEF2F7", color: "#1E3A5F", mx: "auto", mb: 1.5 }}>
            <ShieldCheck size={24} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#171A21", fontSize: "1.25rem", fontFamily: "var(--font-sora)" }}>Platform Admin Email Verification</Typography>
          {data?.adminName && <Typography variant="caption" sx={{ mt: 0.5, display: "block", fontSize: "0.75rem", fontWeight: 500, color: "#7E9BBC" }}>{data.adminName}</Typography>}
        </Box>

        {loading && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} sx={{ color: "#1E3A5F", mb: 1 }} />
            <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>Verifying authorization link…</Typography>
          </Box>
        )}

        {error && !loading && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error" icon={<AlertCircle size={16} />} sx={{ borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#991b1b", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 0.75 }}>
                <AlertCircle size={16} /> Verification Error
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#991b1b", display: "block", mt: 0.5 }}>{error}</Typography>
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Button component={Link} href="/login" size="small" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155", textTransform: "none" }}>
                  Back to Sign In
                </Button>
              </Box>
            </Alert>
          </Box>
        )}

        {success && (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: "12px",
              borderColor: "#A7F3D0",
              bgcolor: "#ECFDF5",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <CheckCircle2 size={36} style={{ color: "#059669", marginBottom: 8 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#065f46", fontSize: "1rem", mb: 0.5 }}>Email Updated!</Typography>
            <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "#047857", lineHeight: 1.6 }}>{success}</Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#059669", mt: 1 }}>Confirmation has been sent to both your old and new email addresses.</Typography>
            <Button
              component={Link}
              href="/login?portal=admin"
              fullWidth
              variant="contained"
              sx={{ mt: 2, borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
            >
              Sign In with New Email
            </Button>
          </Paper>
        )}

        {!loading && !error && !success && data && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert
              severity="warning"
              icon={<Mail size={16} />}
              sx={{ borderRadius: "12px", bgcolor: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400e", fontSize: "0.75rem" }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#92400e", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 0.75 }}>
                <Mail size={16} /> Confirm Platform Admin Email Change
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", display: "block", mt: 1 }}>You requested to change your account email from:</Typography>
              <Paper variant="outlined" sx={{ mt: 0.5, px: 1, py: 0.5, borderRadius: "8px", bgcolor: "white", borderColor: "#FDE68A" }}>
                <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.75rem", color: "#171A21", textDecoration: "line-through", opacity: 0.7 }}>{data.currentEmail}</Typography>
              </Paper>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", display: "block", mt: 1 }}>To new email address:</Typography>
              <Paper variant="outlined" sx={{ mt: 0.5, px: 1, py: 0.5, borderRadius: "8px", bgcolor: "white", borderColor: "#A7F3D0" }}>
                <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.75rem", color: "#065f46" }}>{data.targetEmail}</Typography>
              </Paper>
            </Alert>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC", lineHeight: 1.6 }}>
              Click below to approve this change. This link expires in 1 hour, can be used only once, and is tied to your admin account.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              disabled={submitting}
              onClick={handleConfirm}
              startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
            >
              Approve Email Change
            </Button>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC", textAlign: "center" }}>
              If you did not request this, ignore this page — your account will remain unchanged.
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}
