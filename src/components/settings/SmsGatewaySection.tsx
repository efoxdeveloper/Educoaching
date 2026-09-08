"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Send,
  ShieldCheck,
  HelpCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { PublicSmsConfig, SmsProviderType } from "@/lib/institute-settings";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";

export function SmsGatewaySection({ canManage }: { canManage: boolean }) {
  const [config, setConfig] = useState<PublicSmsConfig>({
    provider: "MSG91",
    senderId: "",
    dltTemplateIds: {},
    enabled: false,
    isConfigured: false,
  });

  const [provider, setProvider] = useState<SmsProviderType>("MSG91");
  const [senderId, setSenderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isReplacingKey, setIsReplacingKey] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dltTemplateIds, setDltTemplateIds] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test SMS State
  const [testMobile, setTestMobile] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/institutes/sms-config");
      if (!res.ok) throw new Error("Failed to load SMS gateway settings");
      const data: PublicSmsConfig = await res.json();
      setConfig(data);
      setProvider(data.provider || "MSG91");
      setSenderId(data.senderId || "");
      setEnabled(data.enabled || false);
      setDltTemplateIds(data.dltTemplateIds || {});
      setIsReplacingKey(!data.isConfigured);
    } catch {
      setError("Unable to load SMS gateway configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSavedSuccess(false);

    if (enabled && !config.isConfigured && !apiKey.trim()) {
      setError("Please provide an API Key before enabling the SMS Gateway.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        provider,
        senderId: senderId.trim(),
        dltTemplateIds,
        enabled,
      };

      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }

      const res = await fetch("/api/institutes/sms-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save SMS gateway settings.");

      setSavedSuccess(true);
      setApiKey("");
      setShowApiKey(false);
      setIsReplacingKey(false);
      fetchConfig();
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save SMS configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testMobile || !testMobile.trim()) {
      setTestResult({ success: false, message: "Please enter a test recipient mobile number." });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/institutes/sms-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: testMobile.trim(),
          provider,
          senderId: senderId.trim(),
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.reason || data.error || "Provider rejected the test SMS dispatch.");
      }

      setTestResult({
        success: true,
        message: data.message || `Test SMS delivered successfully to ${testMobile.trim()}!`,
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Test SMS dispatch failed.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "#7E9BBC" }}>
          <CircularProgress size={16} sx={{ color: "#4E6E93" }} />
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>Loading SMS Gateway configuration...</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Section Header */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, justifyContent: "space-between", gap: 2, borderBottom: "1px solid #D6E0EB", pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" }}>
            <Smartphone size={20} />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "1rem" }}>
              SMS Gateway (BYOK — Bring Your Own Key)
            </Typography>
            <Typography variant="caption" sx={{ color: "#7E9BBC", fontSize: "0.75rem" }}>
              Send promotional & transactional SMS via your own MSG91, Textlocal, or Fast2SMS account.
            </Typography>
          </Box>
        </Box>

        <Box>
          {config.isConfigured ? (
            <Chip icon={<ShieldCheck size={14} />} label="Key Configured" size="small" sx={{ bgcolor: "#ECFDF5", color: "#065f46", border: "1px solid #A7F3D0", fontWeight: 700, fontSize: "0.75rem", height: 26 }} />
          ) : (
            <Chip label="Not Configured" size="small" sx={{ bgcolor: "#F1F5F9", color: "#475569", border: "1px solid #D6E0EB", fontWeight: 600, fontSize: "0.75rem", height: 26 }} />
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" icon={<AlertCircle size={16} />} sx={{ borderRadius: "12px", fontSize: "0.875rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>
          {error}
        </Alert>
      )}

      {savedSuccess && (
        <Alert severity="success" icon={<CheckCircle2 size={16} />} sx={{ borderRadius: "12px", fontSize: "0.875rem", border: "1px solid #A7F3D0", bgcolor: "#ECFDF5" }}>
          SMS Gateway settings saved securely!
        </Alert>
      )}

      <Box component="form" onSubmit={handleSave} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Enable Gateway Toggle */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21", display: "block" }}>Enable SMS Channel</Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
              When enabled, SMS option appears in broadcast communications and alerts.
            </Typography>
          </Box>
          <FormControlLabel
            control={<Switch checked={enabled} disabled={!canManage} onChange={(e) => setEnabled(e.target.checked)} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#E8A33D" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#E8A33D" } }} />}
            label=""
            sx={{ m: 0 }}
          />
        </Paper>

        {/* Provider & Sender ID */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="sms-provider-label">SMS Provider</InputLabel>
            <Select
              labelId="sms-provider-label"
              label="SMS Provider"
              value={provider}
              disabled={!canManage}
              onChange={(e) => setProvider(e.target.value as SmsProviderType)}
              sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem" }}
            >
              <MenuItem value="MSG91">MSG91 (Flow API & Transactional)</MenuItem>
              <MenuItem value="TEXTLOCAL">Textlocal India</MenuItem>
              <MenuItem value="FAST2SMS">Fast2SMS (Quick DLT / Transactional)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="DLT-Approved Sender ID / Header"
            fullWidth
            size="small"
            value={senderId}
            disabled={!canManage}
            onChange={(e) => setSenderId(e.target.value.toUpperCase())}
            placeholder="e.g. VIDYAL / APEXAC"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        <Alert severity="warning" icon={<HelpCircle size={15} />} sx={{ borderRadius: "12px", bgcolor: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400e", fontSize: "11px", py: 1 }}>
          <Typography variant="caption" sx={{ fontSize: "11px", color: "#92400e" }}>
            <Box component="span" sx={{ fontWeight: 700 }}>TRAI DLT Compliance Note:</Box> In India, SMS headers (Sender IDs) and message templates must be registered on your telecom DLT portal (e.g. Jio / Airtel / Vodafone). Unregistered headers will be rejected by carriers.
          </Typography>
        </Alert>

        {/* API Key Input — sensitive, masked with Eye toggle */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#1E293b" }}>
            Provider Auth Key / API Secret (Write-Only & Encrypted)
          </Typography>

          {config.isConfigured && !isReplacingKey ? (
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.5)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <KeyRound size={15} style={{ color: "#7E9BBC" }} />
                <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.75rem", color: "#171A21" }}>•••••••••••••••••••••••• (Encrypted at rest)</Typography>
              </Box>
              {canManage && (
                <Button size="small" onClick={() => setIsReplacingKey(true)} sx={{ fontSize: "0.70rem", fontWeight: 700, color: "#475569", textTransform: "none" }}>
                  Replace Key
                </Button>
              )}
            </Paper>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <TextField
                fullWidth
                size="small"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                disabled={!canManage}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config.isConfigured ? "Enter new API key to replace..." : "Paste your provider API auth key here..."}
                autoComplete="new-password"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowApiKey(!showApiKey)}
                          edge="end"
                          aria-label={showApiKey ? "Hide API key" : "Show API key"}
                          sx={{ color: "#7E9BBC", "&:hover": { color: "#1E3A5F" } }}
                        >
                          {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
              />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>Encrypted via AES-256-GCM. Never transmitted back to browsers.</Typography>
                {config.isConfigured && (
                  <Button size="small" onClick={() => { setIsReplacingKey(false); setApiKey(""); setShowApiKey(false); }} sx={{ fontSize: "11px", fontWeight: 600, color: "#475569", textTransform: "none", p: 0, minWidth: 0 }}>
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* DLT Template IDs Map */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#1E293b" }}>
            DLT Template IDs (Optional mapping for pre-approved templates)
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            {[
              { key: "GENERAL_BROADCAST", label: "General Announcements Template ID" },
              { key: "FEE_REMINDER", label: "Fee Reminder Template ID" },
              { key: "ADMISSION_INQUIRY", label: "Admission Follow-up Template ID" },
              { key: "TEST_SCORE", label: "Exam / Marks Alert Template ID" },
            ].map((tpl) => (
              <Box key={tpl.key} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569", fontWeight: 500 }}>{tpl.label}</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={dltTemplateIds[tpl.key] || ""}
                  disabled={!canManage}
                  onChange={(e) =>
                    setDltTemplateIds((prev) => ({
                      ...prev,
                      [tpl.key]: e.target.value.trim(),
                    }))
                  }
                  placeholder="e.g. 1707161829384729102"
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Save Button */}
        {canManage && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <ShieldCheck size={14} />}
              sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", px: 3, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
            >
              {saving ? "Saving Credentials..." : "Save SMS Gateway Config"}
            </Button>
          </Box>
        )}
      </Box>

      {/* Test SMS Dispatch Card */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: "16px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.4)", display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.875rem", color: "#171A21", display: "flex", alignItems: "center", gap: 0.75 }}>
              <Send size={13} style={{ color: "#4E6E93" }} />
              Live Test SMS Dispatch
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>
              Send a test SMS to verify your sender ID and API credentials before live broadcasting.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.25, alignItems: { sm: "center" } }}>
          <TextField
            fullWidth
            size="small"
            value={testMobile}
            onChange={(e) => setTestMobile(e.target.value)}
            placeholder="Enter 10-digit test mobile number (e.g. 9876543210)"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <Button
            variant="contained"
            disabled={sendingTest || (!config.isConfigured && !apiKey.trim())}
            onClick={handleSendTestSms}
            startIcon={sendingTest ? <CircularProgress size={13} color="inherit" /> : <Send size={13} />}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", px: 2.5, py: 1.25, boxShadow: "none", whiteSpace: "nowrap", "&:hover": { bgcolor: "#182F4C" } }}
          >
            {sendingTest ? "Dispatching..." : "Send Test SMS"}
          </Button>
        </Box>

        {testResult && (
          <Alert
            severity={testResult.success ? "success" : "error"}
            icon={testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            sx={{ borderRadius: "12px", fontSize: "0.75rem", border: testResult.success ? "1px solid #A7F3D0" : "1px solid #FECACA", bgcolor: testResult.success ? "#ECFDF5" : "#FEF2F2" }}
          >
            {testResult.message}
          </Alert>
        )}
      </Paper>
    </Card>
  );
}
