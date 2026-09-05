"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Building2, Clock, Info, Pencil, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddCourseDrawer } from "./AddCourseDrawer";
import { EditCourseDrawer } from "./EditCourseDrawer";
import { formatDate } from "@/lib/utils";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
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
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

export type CourseItem = {
  id: string;
  name: string;
  fee: string;
  feeType?: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | string;
  description?: string | null;
  duration?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  targetExam?: string | null;
  academicYear?: string | null;
  eligibility?: string | null;
  isAllBranches?: boolean;
  branches?: { id: string; name: string; city?: string | null }[];
  createdAt: string;
  _count: { batches: number; students: number; subjects: number };
};

type BranchOption = {
  id: string;
  name: string;
  city: string | null;
};

export function CoursesTable({
  courses,
  availableBranches = [],
}: {
  courses: CourseItem[];
  availableBranches?: BranchOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [editCourse, setEditCourse] = useState<CourseItem | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchQuery =
        query.trim() === "" ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.targetExam?.toLowerCase().includes(query.toLowerCase()) ||
        c.branches?.some((b) => b.name.toLowerCase().includes(query.toLowerCase()));
      const matchFeeType = feeTypeFilter === "ALL" || (c.feeType || "ONE_TIME") === feeTypeFilter;
      return matchQuery && matchFeeType;
    });
  }, [courses, query, feeTypeFilter]);

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete course");
      }
      setCourseToDelete(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete course. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Card className="p-5">
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 2.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", flex: 1, gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search courses, exams, branches..."
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
              sx={{
                flex: 1,
                maxWidth: { sm: 320 },
                "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.875rem" },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="fee-type-label" sx={{ fontSize: "0.75rem" }}>Fee Type</InputLabel>
              <Select
                labelId="fee-type-label"
                value={feeTypeFilter}
                label="Fee Type"
                onChange={(e) => setFeeTypeFilter(e.target.value)}
                sx={{ borderRadius: "12px", bgcolor: "#F7F5F0", fontSize: "0.75rem", fontWeight: 600 }}
              >
                <MenuItem value="ALL">All Fee Types</MenuItem>
                <MenuItem value="ONE_TIME">Full Course Fee</MenuItem>
                <MenuItem value="MONTHLY">Monthly Recurring</MenuItem>
                <MenuItem value="QUARTERLY">Quarterly Recurring</MenuItem>
                <MenuItem value="ANNUAL">Annual Fee</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setDrawerOpen(true)}
            sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, fontSize: "0.875rem", px: 2, py: 1.25, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
          >
            Add Course
          </Button>
        </Box>

        {deleteError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "12px", fontSize: "0.875rem", fontWeight: 500 }}>
            {deleteError}
          </Alert>
        )}

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "12px", borderColor: "#D6E0EB", boxShadow: "none", overflowX: "auto" }}>
          <Table sx={{ minWidth: 750 }} size="small">
            <TableHead>
              <TableRow sx={{ "& th": { borderBottom: "1px solid #D6E0EB", py: 1.5, fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5, color: "#7E9BBC", whiteSpace: "nowrap" } }}>
                <TableCell>Course & Target Exam</TableCell>
                <TableCell>Fee Structure</TableCell>
                <TableCell>Branch Allocation</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="center">Batches</TableCell>
                <TableCell align="center">Students</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, fontSize: "0.75rem", color: "#7E9BBC" }}>
                    No courses found. Click &quot;Add Course&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const isMonthly = c.feeType === "MONTHLY";
                  const isQuarterly = c.feeType === "QUARTERLY";
                  const isAnnual = c.feeType === "ANNUAL";
                  return (
                    <TableRow key={c.id} hover sx={{ "&:last-child td": { borderBottom: 0 }, "& td": { borderBottom: "1px solid #F1F5F9", py: 1.75, pr: 2 } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.875rem" }}>{c.name}</Typography>
                          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                            {c.targetExam && <Chip label={c.targetExam} size="small" variant="outlined" sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#EEF2F7", borderColor: "#D6E0EB", height: 20, borderRadius: "6px" }} />}
                            {c.academicYear && <Chip label={c.academicYear} size="small" variant="outlined" sx={{ fontSize: "11px", fontWeight: 700, bgcolor: "#e0e7ff", color: "#4338ca", borderColor: "#c7d2fe", height: 20, borderRadius: "6px" }} />}
                            {c.eligibility && <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>• {c.eligibility}</Typography>}
                          </Stack>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21" }}>₹{Number(c.fee).toLocaleString("en-IN")}</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {isMonthly ? <Chip label="Monthly Recurring" size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", height: 20, borderRadius: "9999px" }} />
                              : isQuarterly ? <Chip label="Quarterly Recurring" size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc", height: 20, borderRadius: "9999px" }} />
                              : isAnnual ? <Chip label="Annual Fee" size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff", height: 20, borderRadius: "9999px" }} />
                              : <Chip label="Full Course (One-Time / Installments)" size="small" sx={{ fontSize: "10px", fontWeight: 700, bgcolor: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", height: 20, borderRadius: "9999px" }} />}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {c.isAllBranches !== false || !c.branches || c.branches.length === 0 ? (
                          <Chip icon={<Building2 size={12} style={{ color: "#64748b" }} />} label="All Branches" size="small" variant="outlined" sx={{ fontSize: "0.75rem", fontWeight: 600, bgcolor: "#EEF2F7", borderColor: "#D6E0EB", height: 28, borderRadius: "8px" }} />
                        ) : (
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <Chip icon={<Building2 size={12} style={{ color: "#d97706" }} />} label={`${c.branches.length} ${c.branches.length === 1 ? "Branch" : "Branches"}`} size="small" sx={{ fontSize: "0.75rem", fontWeight: 600, bgcolor: "#FFFBEB", color: "#92400e", border: "1px solid #fde68a", height: 28, borderRadius: "8px", width: "fit-content" }} />
                            <Typography variant="caption" sx={{ fontSize: "11px", color: "#7E9BBC", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mt: 0.5 }}>{c.branches.map((b) => b.name).join(", ")}</Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: "#4E6E93", fontSize: "0.75rem" }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          {c.duration ? <Chip icon={<Clock size={11} style={{ color: "#475569" }} />} label={c.duration} size="small" variant="outlined" sx={{ fontSize: "0.75rem", fontWeight: 600, bgcolor: "#EEF2F7", borderColor: "#D6E0EB", height: 22, borderRadius: "6px", width: "fit-content" }} /> : <Typography variant="caption" sx={{ color: "#94A3B8" }}>—</Typography>}
                          {c.startDate && <Typography variant="caption" sx={{ fontSize: "10px", color: "#64748b" }}>Starts: {formatDate(c.startDate)}</Typography>}
                          {c.endDate && <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 600, color: new Date() > new Date(c.endDate) ? "#D64545" : "#1F9D66" }}>{new Date() > new Date(c.endDate) ? "⏳ Expired / Completed" : `Ends: ${formatDate(c.endDate)}`}</Typography>}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 500, color: "#334155" }}>{c._count.batches}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 500, color: "#334155" }}>{c._count.students}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                          <IconButton size="small" onClick={() => setEditCourse(c)} title="Edit Course & Duration" sx={{ color: "#64748b", "&:hover": { bgcolor: "#EEF2F7", color: "#1E3A5F" } }}><Pencil size={15} /></IconButton>
                          <IconButton size="small" onClick={() => setSelectedCourse(c)} title="View Syllabus & Course Details" sx={{ color: "#94A3B8", "&:hover": { bgcolor: "#EEF2F7", color: "#334155" } }}><Info size={15} /></IconButton>
                          <IconButton size="small" onClick={() => setCourseToDelete(c)} title="Delete course" sx={{ color: "#94A3B8", "&:hover": { bgcolor: "#FCEBEA", color: "#D64545" } }}><Trash2 size={15} /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <AddCourseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} availableBranches={availableBranches} />

      {selectedCourse && (
        <Drawer open={!!selectedCourse} onClose={() => setSelectedCourse(null)} title={selectedCourse.name}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "0.875rem", pb: 3 }}>
            <Box sx={{ border: "1px solid #D6E0EB", borderRadius: "12px", bgcolor: "rgba(238,242,247,0.6)", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>Target Exam</Typography>
                <Chip label={selectedCourse.targetExam || "General Academic"} size="small" sx={{ bgcolor: "#1E3A5F", color: "white", fontWeight: 700, fontSize: "0.75rem", height: 22, borderRadius: "6px" }} />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1, borderTop: "1px solid rgba(214,224,235,0.6)" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", fontSize: "0.75rem" }}>Fee Structure</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#171A21", fontSize: "1rem" }}>
                  ₹{Number(selectedCourse.fee).toLocaleString("en-IN")} <Box component="span" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>{selectedCourse.feeType === "MONTHLY" ? "/ month" : selectedCourse.feeType === "QUARTERLY" ? "/ quarter (every 3 months)" : selectedCourse.feeType === "ANNUAL" ? "/ year" : "(Full Course / Installments)"}</Box>
                </Typography>
              </Box>
              {selectedCourse.duration && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1, borderTop: "1px solid rgba(214,224,235,0.6)", fontSize: "0.75rem" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", fontSize: "0.75rem" }}>Duration</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#1E3A5F", display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.75rem" }}><Clock size={12} style={{ color: "#64748b" }} /> {selectedCourse.duration}</Typography>
                </Box>
              )}
              {selectedCourse.eligibility && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1, borderTop: "1px solid rgba(214,224,235,0.6)", fontSize: "0.75rem" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", fontSize: "0.75rem" }}>Eligibility</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#1E3A5F", fontSize: "0.75rem" }}>{selectedCourse.eligibility}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ border: "1px solid #D6E0EB", borderRadius: "12px", bgcolor: "white", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b", display: "flex", alignItems: "center", gap: 0.75 }}><Building2 size={15} style={{ color: "#475569" }} /> Branch Allocation</Typography>
              {selectedCourse.isAllBranches !== false || !selectedCourse.branches || selectedCourse.branches.length === 0 ? (
                <Alert severity="success" variant="outlined" sx={{ fontSize: "0.75rem", fontWeight: 600, borderRadius: "8px", bgcolor: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" }}>✓ Available across all branches of the institute.</Alert>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, pt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#475569" }}>This course is exclusively delivered at the following {selectedCourse.branches.length} branches:</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {selectedCourse.branches.map((b) => (
                      <Chip key={b.id} label={`${b.name} ${b.city ? `(${b.city})` : ""}`} size="small" sx={{ bgcolor: "#EEF2F7", border: "1px solid #D6E0EB", fontWeight: 700, fontSize: "0.75rem", borderRadius: "8px", height: 24 }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Box sx={{ border: "1px solid #D6E0EB", borderRadius: "12px", bgcolor: "white", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#1E293b" }}>Course Inclusions & Syllabus Overview</Typography>
              {selectedCourse.description ? <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "#334155", whiteSpace: "pre-line", lineHeight: 1.6 }}>{selectedCourse.description}</Typography> : <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#94A3B8", fontStyle: "italic" }}>No syllabus description entered for this course yet.</Typography>}
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, pt: 0.5 }}>
              <Box sx={{ borderRadius: "8px", bgcolor: "#EEF2F7", border: "1px solid #D6E0EB", p: 1.25, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293b", fontSize: "1.125rem" }}>{selectedCourse._count.batches}</Typography>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Batches</Typography>
              </Box>
              <Box sx={{ borderRadius: "8px", bgcolor: "#EEF2F7", border: "1px solid #D6E0EB", p: 1.25, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293b", fontSize: "1.125rem" }}>{selectedCourse._count.students}</Typography>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Students</Typography>
              </Box>
              <Box sx={{ borderRadius: "8px", bgcolor: "#EEF2F7", border: "1px solid #D6E0EB", p: 1.25, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293b", fontSize: "1.125rem" }}>{selectedCourse._count.subjects}</Typography>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Subjects</Typography>
              </Box>
            </Box>

            <Box sx={{ pt: 1, borderTop: "1px solid #D6E0EB", display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<Pencil size={13} />}
                onClick={() => {
                  setEditCourse(selectedCourse);
                  setSelectedCourse(null);
                }}
                sx={{ borderRadius: "12px", bgcolor: "#1E3A5F", textTransform: "none", fontWeight: 600, fontSize: "0.75rem", px: 2, py: 1, boxShadow: "none", "&:hover": { bgcolor: "#182F4C" } }}
              >
                Edit Course & Duration
              </Button>
            </Box>
          </Box>
        </Drawer>
      )}

      <EditCourseDrawer open={!!editCourse} onClose={() => setEditCourse(null)} course={editCourse} availableBranches={availableBranches} onUpdated={() => router.refresh()} />

      <ConfirmDialog
        open={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={confirmDeleteCourse}
        title="Delete Course"
        message={
          courseToDelete ? (
            <span>
              Are you sure you want to delete course <strong>&ldquo;{courseToDelete.name}&rdquo;</strong>?{" "}
              {courseToDelete._count.students > 0 && (
                <span className="block mt-1 text-rose-600 font-semibold">
                  ⚠️ Note: This course currently has {courseToDelete._count.students} enrolled students and {courseToDelete._count.batches} active batches.
                </span>
              )}
            </span>
          ) : null
        }
        confirmLabel="Delete Course"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </>
  );
}
