"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";

type BranchUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type Branch = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  contact: string | null;
  guidePhone: string | null;
  inChargeName?: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  users?: BranchUser[];
};

const emptyForm = {
  name: "",
  inChargeName: "",
  city: "",
  state: "",
  address: "",
  contact: "",
  guidePhone: "",
  email: "",
  password: "",
};

export function BranchesSection({ canManage }: { canManage: boolean }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // branch id, or "new"
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed to load branches");
      setBranches(await res.json());
    } catch {
      setError("Couldn't load branches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (branch?: Branch) => {
    setError("");
    setSuccessMessage("");
    if (branch) {
      setForm({
        name: branch.name,
        inChargeName: branch.inChargeName ?? "",
        city: branch.city ?? "",
        state: branch.state ?? "",
        address: branch.address ?? "",
        contact: branch.contact ?? "",
        guidePhone: branch.guidePhone ?? "",
        email: branch.users?.[0]?.email ?? "",
        password: "",
      });
      setEditing(branch.id);
    } else {
      setForm(emptyForm);
      setEditing("new");
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    // Match setup wizard: Branch Owner/In-Charge Name is mandatory
    if (!form.name.trim()) {
      setError("Branch name is required");
      return;
    }
    if (!form.inChargeName.trim()) {
      setError("Branch Owner Name is required — matches setup wizard requirement");
      return;
    }
    setSaving(true);
    try {
      const isNew = editing === "new";
      const url = isNew ? "/api/branches" : `/api/branches/${editing}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save branch");
      }
      const data = await res.json().catch(() => ({}));
      await load();
      cancelEdit();
      if (isNew) {
        setSuccessMessage(
          data.message ||
            "Your branch request is in processing. The platform admin has been notified and access will unlock once granted."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branch");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete branch");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete branch");
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MapPin size={18} style={{ color: "#7E9BBC" }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Branches</Typography>
        </Box>
        {canManage && editing === null && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Plus size={15} />}
            onClick={() => startEdit()}
            sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#171A21", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", bgcolor: "white", "&:hover": { bgcolor: "#F8FAFC" } }}
          >
            Add branch
          </Button>
        )}
      </Box>

      {successMessage && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: "12px", bgcolor: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400e", fontSize: "0.875rem" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#92400e", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 0.75 }}>⏳ Sub-Branch Request in Processing</Typography>
          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#92400e", display: "block", mt: 0.5 }}>{successMessage}</Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: "12px", fontSize: "0.875rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 3, color: "#7E9BBC" }}>
          <CircularProgress size={16} sx={{ color: "#4E6E93" }} />
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>Loading branches...</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {branches.length === 0 && editing === null && (
            <Typography variant="body2" sx={{ py: 2, fontSize: "0.875rem", color: "#7E9BBC" }}>No branches yet.</Typography>
          )}

          {branches.map((b) =>
            editing === b.id ? (
              <BranchForm
                key={b.id}
                form={form}
                setForm={setForm}
                onCancel={cancelEdit}
                onSubmit={handleSave}
                saving={saving}
                submitLabel="Save branch"
              />
            ) : (
              <Paper
                key={b.id}
                variant="outlined"
                sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.875rem" }}>{b.name}</Typography>
                    <Badge
                      tone={
                        b.status === "ACTIVE"
                          ? "success"
                          : b.status === "PENDING_APPROVAL"
                          ? "warn"
                          : "neutral"
                      }
                    >
                      {b.status === "PENDING_APPROVAL" ? "PENDING APPROVAL" : b.status}
                    </Badge>
                  </Box>
                  <Typography variant="caption" sx={{ mt: 0.5, display: "block", fontSize: "0.75rem", color: "#7E9BBC" }}>
                    {b.inChargeName ? (
                      <Box component="span" sx={{ fontWeight: 600, color: "#171A21" }}>👤 {b.inChargeName}</Box>
                    ) : (
                      <Box component="span" sx={{ fontSize: "11px", fontStyle: "italic" }}>No owner set</Box>
                    )}
                    <Box component="span" sx={{ ml: 1 }}>{[b.city, b.state].filter(Boolean).join(", ") || "No location set"}</Box>
                    {b.guidePhone && (
                      <Box component="span" sx={{ ml: 1, fontSize: "11px", fontWeight: 500, color: "#475569" }}>• Guide Helpline: {b.guidePhone}</Box>
                    )}
                    {b.users && b.users.length > 0 && (
                      <Chip label={`🔑 Login: ${b.users[0].email}`} size="small" sx={{ ml: 1, height: 20, fontSize: "11px", fontWeight: 500, bgcolor: "#F5F3FF", color: "#6D28D9", border: "1px solid #DDD6FE" }} />
                    )}
                  </Typography>
                </Box>
                {canManage && (
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => startEdit(b)} aria-label="Edit branch" sx={{ color: "#7E9BBC", "&:hover": { bgcolor: "#EEF2F7", color: "#1E3A5F" } }}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(b.id)} aria-label="Delete branch" sx={{ color: "#7E9BBC", "&:hover": { bgcolor: "#FEF2F2", color: "#DC2626" } }}>
                      <Trash2 size={15} />
                    </IconButton>
                  </Stack>
                )}
              </Paper>
            )
          )}

          {editing === "new" && (
            <BranchForm
              form={form}
              setForm={setForm}
              onCancel={cancelEdit}
              onSubmit={handleSave}
              saving={saving}
              submitLabel="Add branch"
            />
          )}
        </Stack>
      )}
    </Card>
  );
}

function BranchForm({
  form,
  setForm,
  onCancel,
  onSubmit,
  saving,
  submitLabel,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  submitLabel: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <Paper
      component="form"
      onSubmit={onSubmit}
      variant="outlined"
      sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        <TextField
          label="Branch name *"
          required
          fullWidth
          size="small"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Meerut Branch"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />
        <TextField
          label="Branch Owner Name *"
          required
          fullWidth
          size="small"
          value={form.inChargeName}
          onChange={(e) => setForm((f) => ({ ...f, inChargeName: e.target.value }))}
          placeholder="e.g. Rajesh Kumar (Branch In-Charge)"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />
        <TextField
          label="Helpdesk / Office Phone"
          fullWidth
          size="small"
          value={form.contact}
          onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
          placeholder="Helpdesk phone or email"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />
        <TextField
          label="Branch Guide / Counselor Phone"
          fullWidth
          size="small"
          value={form.guidePhone}
          onChange={(e) => setForm((f) => ({ ...f, guidePhone: e.target.value }))}
          placeholder="+91 98765 00000 (Local Guide Helpline)"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />
        <TextField
          label="City"
          fullWidth
          size="small"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          placeholder="e.g. Meerut"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />
        <TextField
          label="State"
          fullWidth
          size="small"
          value={form.state}
          onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
          placeholder="e.g. Uttar Pradesh"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
        />
        <Box sx={{ gridColumn: "1 / -1" }}>
          <TextField
            label="Address"
            fullWidth
            size="small"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Branch address"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "#D6E0EB", bgcolor: "rgba(238,242,247,0.4)", display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#171A21" }}>🔑 Sub-Branch Login Credentials</Typography>
          <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>(Optional / Recommended)</Typography>
        </Box>
        <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569", lineHeight: 1.5 }}>
          Create sign-in credentials for this branch manager. Once Platform Admin approves the branch request, the branch administrator can log in directly with these credentials.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <TextField
            label="Branch Login Email"
            fullWidth
            size="small"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. meerut@vidyalaya.in"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white" } }}
          />
          <TextField
            label="Branch Login Password"
            fullWidth
            size="small"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Set sign-in password (min 6 characters)"
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

      <Stack direction="row" spacing={1.5}>
        <Button type="button" variant="outlined" fullWidth onClick={onCancel} sx={{ borderRadius: "12px", borderColor: "#D6E0EB", color: "#64748b", fontWeight: 600, textTransform: "none", py: 1.25 }}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", fontWeight: 600, textTransform: "none", py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
        >
          {saving ? "Saving..." : submitLabel}
        </Button>
      </Stack>
    </Paper>
  );
}
