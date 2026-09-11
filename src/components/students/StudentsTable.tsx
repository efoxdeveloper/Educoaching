"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Phone, FileText, Eye, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import dynamic from "next/dynamic";

const StudentsDistributionCharts = dynamic(
  () => import("./StudentsDistributionCharts").then((m) => m.StudentsDistributionCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mb-2 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_2fr]">
        <div className="animate-pulse rounded-2xl border border-scholar-100 bg-white p-5">
          <div className="h-4 w-32 rounded bg-scholar-100" />
          <div className="mt-4 h-[180px] rounded-lg bg-scholar-50" />
        </div>
        <div className="animate-pulse rounded-2xl border border-scholar-100 bg-white p-5">
          <div className="h-4 w-32 rounded bg-scholar-100" />
          <div className="mt-4 h-[180px] rounded-lg bg-scholar-50" />
        </div>
      </div>
    ),
  }
);
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
import Pagination from "@mui/material/Pagination";
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
  total,
  page,
  totalPages,
  limit,
  initialQuery,
  initialCourseFilter,
  initialStatusFilter,
  statusCounts,
  courseCounts,
  courses,
  batches,
  branches = [],
}: {
  students: Student[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  initialQuery: string;
  initialCourseFilter: string;
  initialStatusFilter: string;
  statusCounts: Record<string, number>;
  courseCounts: { name: string; count: number }[];
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
  const searchParams = useSearchParams();
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [docsStudent, setDocsStudent] = useState<Student | null>(null);
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<EditableStudent | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Sync local input when URL changes (back/forward)
  useEffect(() => {
    setQueryInput(initialQuery);
  }, [initialQuery]);

  // Debounced search — 350ms before pushing to URL
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (queryInput !== currentQ) {
        const params = new URLSearchParams(searchParams.toString());
        if (queryInput.trim()) params.set("q", queryInput.trim());
        else params.delete("q");
        params.set("page", "1");
        router.push(`/students?${params.toString()}`);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [queryInput, searchParams, router]);

  const handleCourseChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("courseId", value);
    else params.delete("courseId");
    params.set("page", "1");
    router.push(`/students?${params.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    params.set("page", "1");
    router.push(`/students?${params.toString()}`);
  };

  const handlePageChange = (_: any, value: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(value));
    router.push(`/students?${params.toString()}`);
  };

  const handleAddSuccess = () => {
    // After adding, go to first page to see the newest student
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    router.push(`/students?${params.toString()}`);
    router.refresh();
  };

  return (
    <>
      <StudentsDistributionCharts statusCounts={statusCounts} courseCounts={courseCounts} total={total} />

      <Card sx={{ p: 2.5 }}>
        <Box sx={{ mb: 2.5, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", flex: 1, flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "center" } }}>
            <TextField
              size="small"
              placeholder="Search by name or mobile"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
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
                value={initialCourseFilter}
                onChange={(e) => handleCourseChange(e.target.value)}
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
                value={initialStatusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
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
              {students.map((s) => {
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

              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: "#94A3B8", fontSize: "0.875rem" }}>
                    {total === 0 ? "No students found. Add your first student to get started." : "No students match your search or filters. Try adjusting your search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {students.map((s) => {
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
            {students.length === 0 && (
              <Typography variant="body2" sx={{ py: 3, textAlign: "center", color: "#94A3B8", fontSize: "0.875rem" }}>
                {total === 0 ? "No students found. Add your first student to get started." : "No students match your search or filters. Try adjusting your search."}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ mt: 2, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#94A3B8" }} className="tabular-nums">
            Showing {students.length} of {total} students {totalPages > 1 && `(Page ${page} of ${totalPages})`}
          </Typography>
          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              size="small"
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
              sx={{
                "& .MuiPaginationItem-root": { fontSize: "0.75rem", fontWeight: 600, borderRadius: "8px" },
                "& .Mui-selected": { bgcolor: "#1E3A5F !important", color: "white" },
              }}
            />
          )}
        </Box>
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
