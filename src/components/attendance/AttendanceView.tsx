"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, X, Clock3, Save, Pencil, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { initials } from "@/lib/utils";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";

type Batch = { id: string; name: string; timing: string; course: { id?: string; name: string } };
type Course = { id: string; name: string };
type Student = { id: string; name: string; mobile: string; batchId: string | null };
type Status = "PRESENT" | "ABSENT" | "LATE";

const statusMeta: Record<Status, { label: string; icon: typeof Check; color: string; bg: string; border: string }> = {
  PRESENT: { label: "Present", icon: Check, color: "#1F9D66", bg: "#E9F7EF", border: "#A7F3D0" },
  ABSENT: { label: "Absent", icon: X, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  LATE: { label: "Late", icon: Clock3, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
};

export function AttendanceView({
  batches,
  courses: passedCourses,
  students,
}: {
  batches: Batch[];
  courses?: Course[];
  students: Student[];
}) {
  const courses = useMemo(() => {
    if (passedCourses && passedCourses.length > 0) return passedCourses;
    const map = new Map<string, { id: string; name: string }>();
    batches.forEach((b) => {
      if (b.course) {
        const id = b.course.id || b.course.name;
        map.set(id, { id, name: b.course.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [batches, passedCourses]);

  const [courseId, setCourseId] = useState(() => batches[0]?.course?.id || batches[0]?.course?.name || "");
  const [batchId, setBatchId] = useState(() => batches[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [corrections, setCorrections] = useState<any[]>([]);
  const [correctionDialog, setCorrectionDialog] = useState<{ open: boolean; studentId?: string; currentStatus?: Status; requestedStatus?: Status }>({ open: false });
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionSending, setCorrectionSending] = useState(false);

  const availableBatches = useMemo(() => {
    if (!courseId) return batches;
    return batches.filter((b) => b.course?.id === courseId || b.course?.name === courseId);
  }, [batches, courseId]);

  const batchStudents = useMemo(() => students.filter((s) => s.batchId === batchId), [students, batchId]);

  useEffect(() => {
    if (!batchId || !date) return;
    setLoading(true);
    setSaved(false);
    setErrorMsg("");
    fetch(`/api/attendance?batchId=${batchId}&date=${date}`)
      .then((r) => r.json())
      .then((records: { studentId: string; status: Status; locked?: boolean }[]) => {
        const map: Record<string, Status> = {};
        let lockedFound = false;
        if (Array.isArray(records)) {
          for (const r of records) {
            map[r.studentId] = r.status;
            if (r.locked) lockedFound = true;
          }
        }
        setMarks(map);
        setIsLocked(lockedFound);
      })
      .finally(() => setLoading(false));
    // fetch pending corrections for this batch/date
    fetch(`/api/attendance/corrections?status=PENDING`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCorrections(data.filter((c: any) => c.batchId === batchId && c.date?.slice(0,10) === date));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, date, students.length]);

  const presentCount = Object.values(marks).filter((s) => s === "PRESENT").length;
  const pct = batchStudents.length > 0 ? Math.round((presentCount / batchStudents.length) * 100) : 0;

  const setStatus = (studentId: string, status: Status) => {
    if (isLocked) return;
    setMarks((m) => ({ ...m, [studentId]: status }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (isLocked) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          date,
          records: batchStudents
            .filter((s) => marks[s.id] !== undefined)
            .map((s) => ({ studentId: s.id, status: marks[s.id] })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed to save attendance";
        setErrorMsg(msg);
        if (msg.includes("already been saved")) {
          setIsLocked(true);
        }
        return;
      }
      setSaved(true);
      setIsLocked(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 2 }}>
      <Card sx={{ p: 2.5 }}>
        <Box sx={{ mb: 2.5, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" } }}>
          {/* Course Selector — MUI Select */}
          <FormControl size="small" sx={{ flex: 1, minWidth: 140 }}>
            <InputLabel id="attendance-course-label">Course</InputLabel>
            <Select
              labelId="attendance-course-label"
              label="Course"
              value={courseId}
              onChange={(e) => {
                const newCourse = e.target.value;
                setCourseId(newCourse);
                const matching = batches.filter(
                  (b) => b.course?.id === newCourse || b.course?.name === newCourse
                );
                setBatchId(matching[0]?.id || "");
              }}
              sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem", fontWeight: 500 }}
            >
              {courses.length === 0 ? (
                <MenuItem value="">No courses available</MenuItem>
              ) : (
                courses.map((c) => (
                  <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.875rem" }}>
                    {c.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Batch Selector — MUI Select */}
          <FormControl size="small" sx={{ flex: 1, minWidth: 140 }}>
            <InputLabel id="attendance-batch-label">Batch</InputLabel>
            <Select
              labelId="attendance-batch-label"
              label="Batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              disabled={availableBatches.length === 0}
              sx={{ borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem", fontWeight: 500 }}
            >
              {availableBatches.length === 0 ? (
                <MenuItem value="" disabled>
                  No batches in this course
                </MenuItem>
              ) : (
                availableBatches.map((b) => (
                  <MenuItem key={b.id} value={b.id} sx={{ fontSize: "0.875rem" }}>
                    {b.name} {b.timing ? `(${b.timing})` : ""}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Date Picker — MUI TextField type=date (X Date Pickers not installed, see note) */}
          <TextField
            size="small"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            label="Date"
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarDays size={16} style={{ color: "#7E9BBC" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 160, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", fontSize: "0.875rem", fontWeight: 500 } }}
          />
        </Box>

        {isLocked && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: "12px", border: "1px solid #FDE68A", bgcolor: "#FFFBEB", color: "#92400e", fontSize: "0.875rem", fontWeight: 500 }}>
            Attendance already submitted for this date. Records are locked. Use &ldquo;Request Correction&rdquo; to propose a change for OWNER approval.
          </Alert>
        )}
        {corrections.length > 0 && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: "12px", fontSize: "0.80rem" }}>
            {corrections.length} pending correction request(s) for this batch/date — awaiting OWNER/ADMIN approval.
          </Alert>
        )}

        {errorMsg && !isLocked && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "12px", fontSize: "0.875rem", border: "1px solid #FECACA", bgcolor: "#FEF2F2" }}>
            {errorMsg}
          </Alert>
        )}

        {/* Attendance rows — MUI Table (not DataGrid) with Select/Chip for status */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "12px", borderColor: "#D6E0EB", boxShadow: "none" }}>
          <Table size="small" sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(238,242,247,0.5)", "& th": { fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", py: 1.25, borderBottom: "1px solid #D6E0EB" } }}>
                <TableCell>Student</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Mark</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25, color: "#7E9BBC" }}>
                      <CircularProgress size={16} sx={{ color: "#4E6E93" }} />
                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>Loading students…</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {!loading && batchStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4, color: "#7E9BBC", fontSize: "0.875rem" }}>
                    No students assigned to this batch yet.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                batchStudents.map((s) => (
                  <TableRow key={s.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.25 } }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#4E6E93", fontSize: "0.70rem", fontWeight: 700 }} variant="rounded">
                          {initials(s.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{s.name}</Typography>
                          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#7E9BBC" }}>{s.mobile}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {marks[s.id] ? (
                        <Chip
                          icon={
                            marks[s.id] === "PRESENT" ? <Check size={12} /> : marks[s.id] === "ABSENT" ? <X size={12} /> : <Clock3 size={12} />
                          }
                          label={statusMeta[marks[s.id]].label}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.70rem",
                            height: 22,
                            bgcolor: statusMeta[marks[s.id]].bg,
                            color: statusMeta[marks[s.id]].color,
                            border: `1px solid ${statusMeta[marks[s.id]].border}`,
                          }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.75rem" }}>Not marked</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isLocked ? (
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                          {(["PRESENT","ABSENT","LATE"] as Status[]).map((st) => (
                            <Button key={st} size="small" variant="outlined" onClick={() => { setCorrectionDialog({ open: true, studentId: s.id, currentStatus: marks[s.id], requestedStatus: st }); setCorrectionReason(""); }} sx={{ borderRadius: "8px", fontSize: "0.65rem", py:0.4, px:1, minWidth:0 }} startIcon={<Pencil size={11}/>}>To {st}</Button>
                          ))}
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.75} sx={{ justifyContent: "flex-end" }}>
                          {(Object.keys(statusMeta) as Status[]).map((st) => {
                            const meta = statusMeta[st];
                            const active = marks[s.id] === st;
                            const Icon = meta.icon;
                            return (
                              <Button
                                key={st}
                                size="small"
                                disabled={isLocked}
                                onClick={() => setStatus(s.id, st)}
                                startIcon={<Icon size={13} />}
                                variant={active ? "contained" : "outlined"}
                                sx={{
                                  borderRadius: "8px",
                                  fontWeight: 600,
                                  fontSize: "0.70rem",
                                  textTransform: "none",
                                  py: 0.5,
                                  px: 1.25,
                                  minWidth: 0,
                                  borderColor: active ? meta.color : "#D6E0EB",
                                  bgcolor: active ? meta.color : "white",
                                  color: active ? "white" : "#64748b",
                                  opacity: isLocked ? 0.8 : 1,
                                  "&:hover": { bgcolor: active ? meta.color : "#F8FAFC", borderColor: active ? meta.color : "#CBD5E1" },
                                  "&.Mui-disabled": { bgcolor: active ? meta.color : "white", color: active ? "white" : "#94A3B8", borderColor: "#E2E8F0", opacity: 0.8 },
                                }}
                              >
                                {meta.label}
                              </Button>
                            );
                          })}
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {batchStudents.length > 0 && (
          <Button
            fullWidth
            variant="contained"
            disabled={saving || isLocked}
            onClick={handleSave}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
            sx={{
              mt: 2.5,
              borderRadius: "12px",
              bgcolor: isLocked ? "#94A3B8" : "#1E3A5F",
              fontWeight: 600,
              fontSize: "0.875rem",
              textTransform: "none",
              py: 1.25,
              boxShadow: "none",
              "&:hover": { bgcolor: isLocked ? "#94A3B8" : "#182F4C" },
              "&.Mui-disabled": { bgcolor: isLocked ? "#CBD5E1" : "#1E3A5F", color: "white", opacity: 0.6 },
            }}
          >
            {saving
              ? "Saving..."
              : isLocked
              ? "Attendance already submitted for this date"
              : saved
              ? "Saved ✓"
              : "Save attendance"}
          </Button>
        )}
      </Card>

      <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
        <Typography variant="subtitle2" sx={{ alignSelf: "flex-start", fontWeight: 600, color: "#171A21", fontSize: "1rem" }}>Attendance %</Typography>
        <ProgressRing value={pct} size={140} stroke={12} color="#1E3A5F" />
        <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC", textAlign: "center" }}>
          {presentCount} of {batchStudents.length} students present
        </Typography>
      </Card>
      {/* Request Correction Dialog */}
      {correctionDialog.open && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, p:2 }}>
          <Paper sx={{ p: 3, borderRadius: "16px", maxWidth: 420, width: "100%" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb:1 }}>Request Correction</Typography>
            <Typography variant="body2" sx={{ fontSize: "0.80rem", color: "#64748b", mb:2 }}>
              Change from <b>{correctionDialog.currentStatus || "?"}</b> to <b>{correctionDialog.requestedStatus}</b> for {batchStudents.find(s=>s.id===correctionDialog.studentId)?.name} on {date}?
            </Typography>
            <TextField fullWidth size="small" placeholder="Reason for correction (required)" value={correctionReason} onChange={(e)=>setCorrectionReason(e.target.value)} sx={{ mb:2 }} />
            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Button variant="outlined" size="small" onClick={()=>setCorrectionDialog({open:false})}>Cancel</Button>
              <Button variant="contained" size="small" disabled={correctionSending || !correctionReason.trim()} onClick={async()=>{
                setCorrectionSending(true);
                try{
                  const res= await fetch("/api/attendance/corrections",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({studentId:correctionDialog.studentId,batchId,date,currentStatus:correctionDialog.currentStatus,requestedStatus:correctionDialog.requestedStatus,reason:correctionReason})});
                  const data=await res.json();
                  if(!res.ok) throw new Error(data.error||"Failed");
                  alert("Correction request submitted for OWNER approval");
                  setCorrectionDialog({open:false});
                  // refresh corrections
                  fetch(`/api/attendance/corrections?status=PENDING`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setCorrections(d.filter((c:any)=>c.batchId===batchId && c.date?.slice(0,10)===date))});
                }catch(e:any){ alert(e.message)} finally{setCorrectionSending(false)}
              }}>{correctionSending ? <CircularProgress size={14}/>: "Submit Request"}</Button>
            </Stack>
          </Paper>
        </Box>
      )}
      {/* Owner approval inbox */}
      {corrections.length > 0 && (
        <Box sx={{ gridColumn: { lg: "1 / span 2" }, mt:1 }}>
          <Card sx={{ p:2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight:700, mb:1.5, display:"flex", alignItems:"center", gap:1 }}><ShieldCheck size={16}/> Pending Correction Requests (OWNER/APPROVAL)</Typography>
            {corrections.map((c:any)=>(
              <Paper key={c.id} variant="outlined" sx={{ p:1.5, mb:1, borderRadius:"12px", display:"flex", flexDirection:{xs:"column", sm:"row"}, justifyContent:"space-between", gap:1, alignItems:{sm:"center"} }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight:600, fontSize:"0.80rem" }}>{c.student?.name || c.studentId} — {c.currentStatus} → {c.requestedStatus}</Typography>
                  <Typography variant="caption" sx={{ fontSize:"0.70rem", color:"#64748b" }}>{c.reason} • {new Date(c.createdAt).toLocaleDateString()}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" color="success" variant="contained" onClick={async()=>{ if(!confirm("Approve this correction?"))return; const res=await fetch(`/api/attendance/corrections/${c.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"APPROVE"})}); if(res.ok){ setCorrections(prev=>prev.filter(x=>x.id!==c.id)); alert("Approved — attendance updated"); } else { const d=await res.json(); alert(d.error||"Failed") } }} sx={{ fontSize:"0.70rem" }}>Approve</Button>
                  <Button size="small" color="error" variant="outlined" onClick={async()=>{ if(!confirm("Reject this correction?"))return; const res=await fetch(`/api/attendance/corrections/${c.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"REJECT"})}); if(res.ok){ setCorrections(prev=>prev.filter(x=>x.id!==c.id)); } else { const d=await res.json(); alert(d.error||"Failed") } }} sx={{ fontSize:"0.70rem" }}>Reject</Button>
                </Stack>
              </Paper>
            ))}
          </Card>
        </Box>
      )}
    </Box>
  );
}
