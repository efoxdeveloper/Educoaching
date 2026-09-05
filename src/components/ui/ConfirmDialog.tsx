"use client";

import { useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2, X } from "lucide-react";

export type ConfirmTone = "danger" | "warn" | "info" | "success";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  const toneConfig = {
    danger: {
      icon: AlertTriangle,
      iconBg: "#FCEBEA",
      iconColor: "#D64545",
      iconBorder: "#FECACA",
      btnColor: "error" as const,
    },
    warn: {
      icon: AlertCircle,
      iconBg: "#FFF6E5",
      iconColor: "#DB9A1F",
      iconBorder: "#FDE68A",
      btnColor: "warning" as const,
    },
    info: {
      icon: HelpCircle,
      iconBg: "#EEF2F7",
      iconColor: "#1E3A5F",
      iconBorder: "#D6E0EB",
      btnColor: "primary" as const,
    },
    success: {
      icon: CheckCircle2,
      iconBg: "#E9F7EF",
      iconColor: "#1F9D66",
      iconBorder: "#A7F3D0",
      btnColor: "success" as const,
    },
  }[tone];

  const Icon = toneConfig.icon;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "18px",
            border: "1px solid #D6E0EB",
            boxShadow: "0 8px 30px rgba(13,26,42,0.12)",
            p: 0,
            overflow: "hidden",
          },
        },
      }}
      sx={{ zIndex: 100 }}
    >
      <IconButton
        onClick={onClose}
        disabled={loading}
        aria-label="Close"
        sx={{ position: "absolute", right: 12, top: 12, color: "text.secondary", "&:hover": { bgcolor: "rgba(0,0,0,0.04)", color: "text.primary" } }}
        size="small"
      >
        <X size={18} />
      </IconButton>

      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, p: 3, pt: 3, pr: 6 }}>
        <Avatar
          variant="rounded"
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: toneConfig.iconBg,
            color: toneConfig.iconColor,
            border: `1px solid ${toneConfig.iconBorder}`,
            flexShrink: 0,
          }}
        >
          <Icon size={22} strokeWidth={2.2} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
          <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontSize: "1rem", fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.6 }}>
            {typeof message === "string" ? message : <Box component="span">{message}</Box>}
          </Typography>
        </Box>
      </Box>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1.25, justifyContent: "flex-end" }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          size="small"
          sx={{
            borderRadius: "12px",
            borderColor: "#D6E0EB",
            color: "text.secondary",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "none",
            px: 2,
            py: 0.75,
            "&:hover": { bgcolor: "#F8FAFC", borderColor: "#D6E0EB" },
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={toneConfig.btnColor}
          size="small"
          startIcon={loading ? <CircularProgress size={13} color="inherit" /> : undefined}
          sx={{
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "none",
            px: 2,
            py: 0.75,
            boxShadow: "none",
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
