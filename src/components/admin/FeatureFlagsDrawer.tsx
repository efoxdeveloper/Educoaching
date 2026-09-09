"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { type FeatureFlags, DEFAULT_FEATURE_FLAGS } from "@/lib/institute-settings";
import { SlidersHorizontal } from "lucide-react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

type InstituteTarget = {
  id: string;
  name: string;
};

const FEATURE_DESCRIPTIONS: Record<keyof FeatureFlags, { label: string; desc: string }> = {
  onlineTests: {
    label: "Academic Exams & Results",
    desc: "Create tests, record evaluations, pass rates, and student exam scorecards.",
  },
  attendance: {
    label: "Attendance Tracking & Reports",
    desc: "Daily student attendance marking, low-attendance alerts, and trends.",
  },
  admissions: {
    label: "Admission Inquiries Pipeline",
    desc: "Track prospective student applications and convert inquiries into enrolled students.",
  },
  timetable: {
    label: "Timetable & Scheduling",
    desc: "Weekly schedule grid, classroom room assignments, and conflict clash prevention.",
  },
  reports: {
    label: "Executive Analytics & Reports",
    desc: "Full-stack basic reports hub with KPI cards, Recharts visualizations, and CSV exports.",
  },
  onlinePayments: {
    label: "Razorpay Online Payments",
    desc: "Allow students to pay course fees directly via credit/debit card and UPI checkout.",
  },
  multiBranch: {
    label: "Multi-Branch Management",
    desc: "Configure multiple branch locations under this institute.",
  },
  expenses: {
    label: "Expense Management & Outflow",
    desc: "Log operational expenditures, category allocations, vendor payments, and CSV export.",
  },
  communication: {
    label: "Bulk Broadcasts & Notifications",
    desc: "Multi-channel broadcast messaging (WhatsApp, SMS, Email) with audience segmentation.",
  },
};

export function FeatureFlagsDrawer({
  institute,
  open,
  onClose,
  onUpdated,
}: {
  institute: InstituteTarget | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && institute) {
      setLoading(true);
      setError("");
      setSuccess(false);
      fetch(`/api/admin/institutes/${institute.id}/features`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load feature flags");
          return res.json();
        })
        .then((data) => {
          if (data.featureFlags) setFlags(data.featureFlags);
        })
        .catch(() => {
          setError("Could not load feature flags for this institute.");
        })
        .finally(() => setLoading(false));
    }
  }, [open, institute]);

  const handleToggle = (key: keyof FeatureFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!institute) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/institutes/${institute.id}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureFlags: flags }),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
      if (onUpdated) onUpdated();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch {
      setError("Failed to update feature flags.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={institute ? `Feature Controls: ${institute.name}` : "Feature Controls"}
      maxWidth="max-w-md"
    >
      {loading ? (
        <Box sx={{ height: 256, display: "flex", alignItems: "center", justifyContent: "center", gap: 1, color: "#7E9BBC" }}>
          <CircularProgress size={20} sx={{ color: "#4E6E93" }} />
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>Loading module permissions...</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.5 }}>
            Control which functional modules are enabled or disabled for this institute based on their subscription tier or custom contract.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.75rem" }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ borderRadius: "12px", fontSize: "0.75rem", border: "1px solid #A7F3D0", bgcolor: "#ECFDF5" }}>
              Feature flags updated successfully!
            </Alert>
          )}

          <Paper variant="outlined" sx={{ borderRadius: "16px", borderColor: "#D6E0EB", overflow: "hidden", divideY: "1px solid #D6E0EB" }}>
            {(Object.keys(FEATURE_DESCRIPTIONS) as (keyof FeatureFlags)[]).map((key) => {
              const info = FEATURE_DESCRIPTIONS[key];
              const enabled = flags[key];

              return (
                <Box key={key} sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, p: 1.75, "&:hover": { bgcolor: "rgba(238,242,247,0.3)" }, borderBottom: "1px solid #F1F5F9", "&:last-child": { borderBottom: "none" } }}>
                  <Box sx={{ flex: 1, pr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>{info.label}</Typography>
                    <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC", display: "block", mt: 0.25 }}>{info.desc}</Typography>
                  </Box>
                  <Switch
                    checked={enabled}
                    onChange={() => handleToggle(key)}
                    size="small"
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color: "#1E3A5F" },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#1E3A5F" },
                    }}
                  />
                </Box>
              );
            })}
          </Paper>

          <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={onClose}
              sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#64748b", fontWeight: 600, textTransform: "none", py: 1.25 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={13} color="inherit" /> : <SlidersHorizontal size={13} />}
              sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, textTransform: "none", py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
            >
              {saving ? "Saving..." : "Apply Feature Flags"}
            </Button>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}
