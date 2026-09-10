"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Phone, FileText, Eye, Pencil, Users } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/Card";
import {
  Badge,
  feeStatusTone,
  studentStatusTone,
} from "@/components/ui/Badge";
import { AddStudentDrawer } from "./AddStudentDrawer";
import { StudentProfileDrawer } from "./StudentProfileDrawer";
import { EditStudentDrawer, type EditableStudent } from "./EditStudentDrawer";
import { DocumentsDrawer } from "@/components/files/DocumentsDrawer";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { computeFeeStatus, feeStatusLabel } from "@/lib/fee";
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
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

type Student = {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  photoUrl?: string | null;
  parentMobile?: string | null;
  status: string;
  admissionDate: string;
  totalFee: string;
  paidFee: string;
  dueDate: string | null;
  plan?: string;
  courseDuration?: string | null;
  quarterlyAmount?: string | number | null;
  registrationFee?: string | number | null;
  isSeatBooked?: boolean;
  discountPercent?: string | number | null;
  discountApprovalStatus?: string | null;
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
    city?: string | null;
  } | null;
  course: {
    id: string;
    name: string;
  };
  batch: {
    id: string;
    name: string;
    timing?: string;
  } | null;
};

export function StudentsTable({
  students,
  courses,
  batches,
  branches = [],
}: {
  students: Student[];
  courses: {
    id: string;
    name: string;
    fee: string;
  }[];
  batches: {
    id: string;
    name: string;
    courseId: string;
    branchId?: string | null;
    isAllBranches?: boolean;
    timing?: string;
    status?: string;
    endDate?: string | null;
    branch?: { id: string; name: string; city?: string | null } | null;
    branches?: { id: string; name: string; city?: string | null }[];
  }[];
  branches?: {
    id: string;
    name: string;
    city?: string | null;
  }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [docsStudent, setDocsStudent] = useState<Student | null>(null);
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<EditableStudent | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesQuery =
        query.trim() === "" ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.mobile.includes(query);

      const matchesCourse =
        !courseFilter || s.course.id === courseFilter;

      const matchesStatus =
        !statusFilter || s.status === statusFilter;

      return (
        matchesQuery &&
        matchesCourse &&
        matchesStatus
      );
    });
  }, [students, query, courseFilter, statusFilter]);

  // S1: derived aggregates for visuals — kept separate from table, no filtering of underlying rows
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) map[s.status] = (map[s.status] || 0) + 1;
    return map;
  }, [students]);
  const statusDonutData = useMemo(() => {
    const colors: Record<string, string> = { ACTIVE: "#059669", ON_HOLD: "#F59E0B", INACTIVE: "#94A3B8" };
    return Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace("_", " "), value, color: colors[name] || "#1E3A5F" }));
  }, [statusCounts]);
  const courseCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) map[s.course.name] = (map[s.course.name] || 0) + 1;
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [students]);

  return (
    <>
      {/* S1: Student distribution visuals — stat cards + donut/bar; table below stays exactly as before with all badges/numbers */}
      {/* Do NOT convert recharts to MUI X Charts — kept as recharts */}
      <Box sx={{ mb: 2, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" }, gap: 2 }}>
        <Card sx={{ p: 2, display: "flex", flexDirection: "column" }}>
          <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.75 }}>
            <Users size={14} style={{ color: "#1E3A5F" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>Students by Status</Typography>
          </Box>
          <Typography variant="caption" sx={{ mb: 1.5, color: "#7E9BBC", fontSize: "0.75rem" }}>Active vs On Hold vs Inactive — distribution, not just count</Typography>
          <Box sx={{ height: 180, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusDonutData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1.5 }}>
            {statusDonutData.map((d) => (
              <Box key={d.name} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ height: 8, width: 8, borderRadius: "50%", bgcolor: d.color }} />
                <Typography variant="caption" sx={{ fontSize: "11px", color: "#475569" }}>{d.name} ({d.value})</Typography>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" sx={{ mt: 1, textAlign: "center", fontSize: "11px", color: "#7E9BBC" }}>Total: {students.length} students</Typography>
        </Card>

        <Card sx={{ p: 2 }}>
          <Box sx={{ mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>Students per Course</Typography>
            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC" }}>Top 6 courses</Typography>
          </Box>
          <Typography variant="caption" sx={{ mb: 1.5, display: "block", color: "#7E9BBC", fontSize: "0.75rem" }}>Enrollment concentration by program — bar length = headcount</Typography>
          <Box sx={{ height: 180, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseCounts} margin={{ left: -10, right: 16, top: 4, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#4E6E93" } as any} interval={0} angle={-14} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#4E6E93" } as any} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 } as any} />
                <Bar dataKey="count" fill="#1E3A5F" radius={[6, 6, 0, 0] as any} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      </Box>

      <Card sx={{ p: 2.5 }}>
        <Box sx={{ mb: 2.5, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", flex: 1, flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" } }}>
            <TextField
              size="small"
              placeholder="Search by name or mobile"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} style={{ color: "#7E9BBC" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flex: 1, maxWidth: { sm: 260 }, "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.875rem" } }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="students-course-label" sx={{ fontSize: "0.75rem" }}>Course</InputLabel>
              <Select
                labelId="students-course-label"
                label="Course"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 600 }}
              >
                <MenuItem value="">All courses</MenuItem>
                {courses.map((c) => (
                  <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.75rem" }}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="students-status-label" sx={{ fontSize: "0.75rem" }}>Status</InputLabel>
              <Select
                labelId="students-status-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 600 }}
              >
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="ON_HOLD">On hold</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setDrawerOpen(true)}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, fontSize: "0.875rem", px: 2, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" }, whiteSpace: "nowrap" }}
          >
            Add Student
          </Button>
        </Box>

        {!isMobile ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "12px", borderColor: "#D6E0EB", boxShadow: "none", width: "min(100%, 880px)", maxWidth: "100%" }}>
          <Table sx={{ minWidth: "min(100%, 880px)", width: "100%", maxWidth: "100%" }} size="small">
            <TableHead>
              <TableRow sx={{ "& th": { borderBottom: "1px solid #D6E0EB", py: 1.5, fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", whiteSpace: "nowrap" } }}>
                <TableCell>Student</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Batch</TableCell>
                <TableCell>Fee status</TableCell>
                <TableCell>Admission date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((s) => {
                const dueDate = s.dueDate ? new Date(s.dueDate) : null;
                const fee = computeFeeStatus(Number(s.totalFee), Number(s.paidFee), dueDate);
                return (
                  <TableRow key={s.id} hover sx={{ "&:last-child td": { borderBottom: 0 }, "& td": { borderBottom: "1px solid #F1F5F9", py: 1.75, pr: 2 } }}>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer", "&:hover .student-name": { color: "#1E3A5F", textDecoration: "underline" } }}
                        onClick={() => setProfileStudentId(s.id)}
                      >
                        {s.photoUrl ? (
                          <Avatar src={s.photoUrl} alt={s.name} sx={{ width: 36, height: 36, borderRadius: "8px", border: "1px solid #D6E0EB", bgcolor: "white" }} variant="rounded" />
                        ) : (
                          <Avatar sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#475569", fontSize: "0.70rem", fontWeight: 700 }} variant="rounded">
                            {initials(s.name)}
                          </Avatar>
                        )}

                        <Box>
                          <Typography variant="body2" className="student-name" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>
                            {s.name}
                          </Typography>
                          {s.plan === "DEMO" ? (
                            <Chip label="7-Day Demo" size="small" sx={{ height: 16, fontSize: "10px", fontWeight: 700, bgcolor: "#FFFBEB", color: "#92400e", border: "1px solid #FDE68A" }} />
                          ) : s.plan === "INSTALLMENTS" ? (
                            <Chip label="Installments" size="small" sx={{ height: 16, fontSize: "10px", fontWeight: 700, bgcolor: "#EEF2F7", color: "#475569", border: "1px solid #D6E0EB" }} />
                          ) : s.plan === "QUARTERLY" ? (
                            <Chip label="Quarterly" size="small" sx={{ height: 16, fontSize: "10px", fontWeight: 700, bgcolor: "#ECFEFF", color: "#0e7490", border: "1px solid #a5f3fc" }} />
                          ) : null}

                          {s.isSeatBooked && (
                            <Chip label={`🎫 Seat Booked ${s.registrationFee ? `(₹${formatCurrency(s.registrationFee)})` : ""}`} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 600, bgcolor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", mt: 0.5, display: "flex", width: "fit-content" }} />
                          )}

                          {s.discountApprovalStatus === "PENDING_OWNER_APPROVAL" && (
                            <Chip label={`⏳ Discount Pending Approval (${s.discountPercent}%)`} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 600, bgcolor: "#FFFBEB", color: "#92400e", border: "1px solid #FDE68A", mt: 0.5, display: "flex", width: "fit-content" }} />
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "#475569", fontSize: "0.80rem" }}>
                        <Phone size={13} style={{ color: "#94A3B8" }} />
                        {s.mobile}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{s.course.name}</Typography>
                        {s.courseDuration && (
                          <Typography variant="caption" sx={{ fontSize: "10px", color: "#94A3B8" }}>⏱️ {s.courseDuration}</Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#171A21", fontSize: "0.80rem" }}>{s.batch?.name ?? "—"}</Typography>
                        {s.branch && (
                          <Typography variant="caption" sx={{ fontSize: "10px", color: "#94A3B8" }}>📍 {s.branch.name}</Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Badge tone={feeStatusTone(fee)} dot>
                        {feeStatusLabel(fee)}
                      </Badge>
                    </TableCell>

                    <TableCell sx={{ fontSize: "0.80rem", color: "#64748b" }}>{formatDate(s.admissionDate)}</TableCell>

                    <TableCell>
                      <Badge tone={studentStatusTone(s.status)}>{s.status.replace("_", " ")}</Badge>
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                        <IconButton size="small" onClick={() => setProfileStudentId(s.id)} aria-label="View 360 Profile" title="View Student 360° Profile" sx={{ color: "#94A3B8", "&:hover": { bgcolor: "#EEF2F7", color: "#1E3A5F" } }}>
                          <Eye size={15} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setEditStudent({
                              id: s.id,
                              name: s.name,
                              mobile: s.mobile,
                              email: s.email,
                              parentMobile: s.parentMobile,
                              courseId: s.course.id,
                              batchId: s.batch?.id,
                              status: s.status,
                              totalFee: s.totalFee,
                              dueDate: s.dueDate,
                              plan: s.plan,
                            })
                          }
                          aria-label="Edit Student"
                          title="Edit Student"
                          sx={{ color: "#94A3B8", "&:hover": { bgcolor: "#EEF2F7", color: "#1E3A5F" } }}
                        >
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDocsStudent(s)} aria-label="Documents" title="Documents" sx={{ color: "#94A3B8", "&:hover": { bgcolor: "#EEF2F7", color: "#1E3A5F" } }}>
                          <FileText size={14} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: "#94A3B8", fontSize: "0.875rem" }}>
                    No students match your search or filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {filtered.map((s) => {
              const dueDate = s.dueDate ? new Date(s.dueDate) : null;
              const fee = computeFeeStatus(Number(s.totalFee), Number(s.paidFee), dueDate);
              return (
                <Card key={s.id} sx={{ p: 2, borderColor: "#D6E0EB" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }} onClick={() => setProfileStudentId(s.id)}>
                      {s.photoUrl ? (
                        <Avatar src={s.photoUrl} alt={s.name} sx={{ width: 36, height: 36, borderRadius: "8px", border: "1px solid #D6E0EB", bgcolor: "white" }} variant="rounded" />
                      ) : (
                        <Avatar sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "#EEF2F7", color: "#475569", fontSize: "0.70rem", fontWeight: 700 }} variant="rounded">
                          {initials(s.name)}
                        </Avatar>
                      )}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>
                          {s.name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.70rem", color: "#64748b", display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Phone size={12} style={{ color: "#94A3B8" }} /> {s.mobile}
                        </Typography>
                      </Box>
                    </Box>
                    <Badge tone={studentStatusTone(s.status)}>{s.status.replace("_", " ")}</Badge>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC", textTransform: "uppercase" }}>Course</Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.80rem", color: "#171A21", fontWeight: 500 }}>{s.course.name}</Typography>
                      {s.courseDuration && <Typography variant="caption" sx={{ fontSize: "10px", color: "#94A3B8" }}>⏱️ {s.courseDuration}</Typography>}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC", textTransform: "uppercase" }}>Batch</Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.80rem", color: "#171A21" }}>{s.batch?.name ?? "—"}</Typography>
                      {s.branch && <Typography variant="caption" sx={{ fontSize: "10px", color: "#94A3B8" }}>📍 {s.branch.name}</Typography>}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC", textTransform: "uppercase" }}>Fee status</Typography>
                      <Box sx={{ mt: 0.5 }}><Badge tone={feeStatusTone(fee)} dot>{feeStatusLabel(fee)}</Badge></Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC", textTransform: "uppercase" }}>Admission date</Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.80rem", color: "#64748b" }}>{formatDate(s.admissionDate)}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, borderTop: "1px solid #F1F5F9", pt: 1.5 }}>
                    <IconButton size="small" onClick={() => setProfileStudentId(s.id)} sx={{ color: "#94A3B8" }}><Eye size={15} /></IconButton>
                    <IconButton size="small" onClick={() => setEditStudent({ id: s.id, name: s.name, mobile: s.mobile, email: s.email, parentMobile: s.parentMobile, courseId: s.course.id, batchId: s.batch?.id, status: s.status, totalFee: s.totalFee, dueDate: s.dueDate, plan: s.plan })} sx={{ color: "#94A3B8" }}><Pencil size={14} /></IconButton>
                    <IconButton size="small" onClick={() => setDocsStudent(s)} sx={{ color: "#94A3B8" }}><FileText size={14} /></IconButton>
                  </Box>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <Typography variant="body2" sx={{ py: 3, textAlign: "center", color: "#94A3B8", fontSize: "0.875rem" }}>
                No students match your search or filters.
              </Typography>
            )}
          </Box>
        )}

        <Typography variant="caption" sx={{ mt: 1.5, display: "block", fontSize: "0.75rem", color: "#94A3B8" }} className="tabular-nums">
          Showing {filtered.length} of {students.length} students. Total fee outstanding:{" "}
          {formatCurrency(
            students.reduce(
              (sum, s) =>
                sum +
                Math.max(
                  Number(s.totalFee) -
                    Number(s.paidFee),
                  0
                ),
              0
            )
          )}
        </Typography>
      </Card>

      <AddStudentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        courses={courses}
        batches={batches}
        branches={branches}
      />

      <StudentProfileDrawer
        studentId={profileStudentId}
        open={!!profileStudentId}
        onClose={() => setProfileStudentId(null)}
        courses={courses}
        batches={batches}
        branches={branches}
        onRefreshParent={() => router.refresh()}
      />

      <EditStudentDrawer
        open={!!editStudent}
        onClose={() => setEditStudent(null)}
        student={editStudent}
        courses={courses}
        batches={batches}
        branches={branches}
        onUpdated={() => router.refresh()}
      />

      {docsStudent && (
        <DocumentsDrawer
          open={!!docsStudent}
          onClose={() => setDocsStudent(null)}
          relatedType="Student"
          relatedId={docsStudent.id}
          category="STUDENT_DOCUMENT"
          entityLabel={docsStudent.name}
        />
      )}
    </>
  );
}
