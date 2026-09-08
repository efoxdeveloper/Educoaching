"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";

export type BranchItem = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  contact: string | null;
  guidePhone?: string | null;
  inChargeName?: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  isMainBranch?: boolean;
  studentCount?: number;
  batchCount?: number;
  leadCount?: number;
  totalCollected?: number;
  totalPendingFee?: number;
  totalExpenses?: number;
  netProfit?: number;
};

export function CreateBranchDrawer({
  open,
  onClose,
  branchToEdit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  branchToEdit?: BranchItem | null;
  onSaved: (branch: any) => void;
}) {
  const [name, setName] = useState("");
  const [inChargeName, setInChargeName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [guidePhone, setGuidePhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "PENDING_APPROVAL">("ACTIVE");
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branchToEdit) {
      setName(branchToEdit.name);
      setInChargeName(branchToEdit.inChargeName || "");
      setCity(branchToEdit.city || "");
      setState(branchToEdit.state || "");
      setAddress(branchToEdit.address || "");
      setContact(branchToEdit.contact || "");
      setGuidePhone(branchToEdit.guidePhone || "");
      setEmail("");
      setPassword("");
      setStatus(branchToEdit.status);
      setIsMainBranch(Boolean(branchToEdit.isMainBranch));
    } else {
      setName("");
      setInChargeName("");
      setCity("");
      setState("");
      setAddress("");
      setContact("");
      setGuidePhone("");
      setEmail("");
      setPassword("");
      setStatus("ACTIVE");
      setIsMainBranch(false);
    }
  }, [branchToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Branch name is required");
      return;
    }
    // Match setup wizard validation: Branch In-Charge/Owner Name is mandatory
    if (!inChargeName.trim()) {
      setError("Branch Owner Name is required — matches setup wizard requirement");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isEditing = Boolean(branchToEdit);
      const url = isEditing ? `/api/branches/${branchToEdit!.id}` : "/api/branches";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          inChargeName: inChargeName.trim(),
          city: city.trim() || null,
          state: state.trim() || null,
          address: address.trim() || null,
          contact: contact.trim() || null,
          guidePhone: guidePhone.trim() || null,
          status,
          isMainBranch,
          email: email.trim() || undefined,
          password: password.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save branch");
      }

      const data = await res.json().catch(() => ({}));
      onSaved(data.message);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={branchToEdit ? `Edit Branch: ${branchToEdit.name}` : "Create New Institute Branch"}
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "12px", fontSize: "0.875rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            label="Branch / Center Name *"
            required
            fullWidth
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. South Extension Campus, Kota Center"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Branch Owner Name *"
            required
            fullWidth
            size="small"
            value={inChargeName}
            onChange={(e) => setInChargeName(e.target.value)}
            placeholder="e.g. Rajesh Kumar (Branch In-Charge)"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            label="City"
            fullWidth
            size="small"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. New Delhi, Kota, Pune"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="State"
            fullWidth
            size="small"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. Delhi, Rajasthan"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        <TextField
          label="Physical Address / Street"
          fullWidth
          size="small"
          multiline
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Building, Street, Landmark, Pin code..."
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            label="Helpdesk / Contact Phone"
            fullWidth
            size="small"
            type="tel"
            value={contact}
            onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 10, inputMode: "numeric" } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Guide / Counselor Phone"
            fullWidth
            size="small"
            type="tel"
            value={guidePhone}
            onChange={(e) => setGuidePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876500000"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 10, inputMode: "numeric" } as any }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>

        {branchToEdit && (
          <FormControl fullWidth size="small">
            <InputLabel id="branch-status-label">Operational Status</InputLabel>
            <Select
              labelId="branch-status-label"
              label="Operational Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL")}
              sx={{ borderRadius: "12px", bgcolor: "white" }}
            >
              <MenuItem value="ACTIVE">Active Operating Branch</MenuItem>
              <MenuItem value="INACTIVE">Inactive / Temporarily Closed</MenuItem>
              {branchToEdit.status === "PENDING_APPROVAL" && (
                <MenuItem value="PENDING_APPROVAL">Pending Platform Admin Approval</MenuItem>
              )}
            </Select>
          </FormControl>
        )}

        {!branchToEdit && !isMainBranch && (
          <Alert
            severity="warning"
            sx={{
              borderRadius: "12px",
              bgcolor: "#FFFBEB",
              border: "1px solid #FDE68A",
              color: "#92400e",
              fontSize: "0.75rem",
              "& .MuiAlert-message": { width: "100%" },
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#92400e", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 0.75 }}>
              ⏳ Platform Admin Access Approval Workflow
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#92400e", lineHeight: 1.5, display: "block", mt: 0.5 }}>
              When this sub-branch is added, an access request is dispatched to the Platform Administrator. Confirmation emails will be sent to you and the Main Branch owner. Access unlocks immediately upon platform administrator approval.
            </Typography>
          </Alert>
        )}

        {!branchToEdit && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.4)", display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21" }}>🔑 Sub-Branch Login Credentials</Typography>
              <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>(Optional / Recommended)</Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569", lineHeight: 1.5 }}>
              Create credentials for this branch manager. Once Platform Admin approves the request, the branch manager can sign in using these credentials.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField
                label="Branch Login Email"
                fullWidth
                size="small"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. branch@vidyalaya.in"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
              />
              <TextField
                label="Branch Login Password"
                fullWidth
                size="small"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          sx={{ color: "#7E9BBC", "&:hover": { color: "#1E3A5F" } }}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
              />
            </Box>
          </Paper>
        )}

        {/* Main Branch / Head Office Designation */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.4)" }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isMainBranch}
                onChange={(e) => setIsMainBranch(e.target.checked)}
                size="small"
                sx={{ color: "#7E9BBC", "&.Mui-checked": { color: "#1E3A5F" } }}
              />
            }
            label={
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21" }}>
                  🏛️ Main Branch / Head Office (Master Administrative Access)
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC", display: "block", mt: 0.25 }}>
                  Staff and administrators at the Main Branch have full access to switch to other branches, monitor enrollments, and make changes to any branch.
                </Typography>
              </Box>
            }
            sx={{ alignItems: "flex-start", m: 0 }}
          />
        </Paper>

        <Stack direction="row" spacing={1.5} sx={{ pt: 1, borderTop: "1px solid #D6E0EB", mt: 1 }}>
          <Button type="button" variant="outlined" fullWidth onClick={onClose} sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#64748b", fontWeight: 600, textTransform: "none", py: 1.25 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            startIcon={loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" } as any} /> : <CheckCircle2 size={14} />}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
          >
            {branchToEdit ? "Update Branch" : "Create Branch"}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
