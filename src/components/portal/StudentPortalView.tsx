"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  Award,
  BookOpen,
  CheckSquare,
  Wallet,
  Play,
  ExternalLink,
  Clock,
  Sparkles,
  Lightbulb,
  Loader2,
  Layers,
  Building2,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Calendar,
  Camera,
  Upload,
  KeyRound,
  Mail,
  Download,
  Video,
  Radio,
  Search,
  Users,
  ArrowLeftRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OnlineExamModal } from "@/components/tests/OnlineExamModal";
import { formatDate, formatCurrency, initials } from "@/lib/utils";
import { useRazorpayCheckout } from "@/lib/useRazorpayCheckout";
import { SupportChat } from "@/components/support/SupportChat";

// MUI — Part 1-2 restyle (all tabs + header + navigation + timer visuals)
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import MuiCard from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import LinearProgress from "@mui/material/LinearProgress";
import InputLabel from "@mui/material/InputLabel";

export type StudentData = {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  photoUrl?: string | null;
  courseId?: string | null;
  courseName: string;
  courseDuration?: string | null;
  batchId?: string | null;
  batchName: string;
  branchName: string;
  totalFee: number;
  paidFee: number;
  pendingFee: number;
  plan?: string;
  installmentPlan?: unknown;
  quarterlyAmount?: number | null;
  monthlyAmount?: number | null;
  dueDate?: string | null;
  registrationFee?: number | null;
  isSeatBooked?: boolean;
  batch?: {
    id: string;
    name: string;
    timing: string;
    status: string;
    branchName: string;
    facultyMembers?: string[];
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    baseAmount?: number | null;
    gstAmount?: number | null;
    gstPercent?: number | null;
    isRefund?: boolean;
    refundReason?: string | null;
    receiptFileId?: string | null;
    method: string;
    paidAt: string;
    installmentNumber?: number | null;
    installmentTitle?: string | null;
  }>;
  certificates?: Array<{
    id: string;
    templateName: string;
    title: string;
    issuedAt: string;
    pdfFileAssetId: string;
  }>;
};

export type LiveClassPortalItem = {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string;
  status: string;
  batchId?: string | null;
  facultyName?: string | null;
};

type OnlineExam = {
  id: string;
  title: string;
  subject: string | null;
  durationMinutes: number | null;
  startTime?: string | null;
  endTime?: string | null;
  totalMarks: number;
  negativeMarks: number | null;
  seriesName: string | null;
  testDate: string;
  batchId: string;
  attempt?: {
    score: number;
    rank: number | null;
    percentile: number | null;
    status: string;
    submittedAt: string;
  } | null;
};

type StudyMaterial = {
  id: string;
  title: string;
  subject: string;
  topic: string | null;
  fileType: string;
  fileUrl: string;
  description: string | null;
  createdAt: string;
  batchId?: string | null;
  courseId?: string | null;
  branchId?: string | null;
};

type Assignment = {
  id: string;
  title: string;
  subject: string;
  type: string;
  dueDate: string;
  totalMarks: number;
  attachmentUrl: string | null;
  batchId?: string | null;
  courseId?: string | null;
  branchId?: string | null;
  submission?: {
    status: string;
    marksObtained: number | null;
    feedback: string | null;
    submittedAt: string;
  } | null;
};

export function StudentPortalView({
  students,
  exams,
  materials,
  assignments,
  liveClasses = [],
  viewerRole = "STUDENT",
}: {
  students: StudentData[];
  exams: OnlineExam[];
  materials: StudyMaterial[];
  assignments: Assignment[];
  liveClasses?: LiveClassPortalItem[];
  viewerRole?: "STUDENT" | "PARENT" | "STAFF" | "OWNER" | "ADMIN" | "PLATFORM_ADMIN";
}) {
  const isPreview = (["OWNER", "ADMIN", "STAFF", "PLATFORM_ADMIN"] as const).includes(viewerRole as any);
  const [selectedStudentId, setSelectedStudentId] = useState(() => {
    if (isPreview && students.length > 1) {
      if (typeof window !== "undefined") {
        const child = new URLSearchParams(window.location.search).get("child");
        if (child && students.some((s) => s.id === child)) return child;
        const stored = localStorage.getItem("parentSelectedChildId");
        if (stored && students.some((s) => s.id === stored)) return stored;
      }
      return "";
    }
    return students[0]?.id || "";
  });
  const [activeTab, setActiveTab] = useState<
    "batch" | "live-classes" | "certificates" | "exams" | "materials" | "assignments" | "fees" | "doubts" | "help"
  >("batch");

  // Sync activeTab with URL ?tab= param (for sidebar navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as typeof activeTab | null;
    if (tab && ["batch", "live-classes", "certificates", "exams", "materials", "assignments", "fees", "doubts", "help"].includes(tab)) {
      setActiveTab(tab);
    }
    const childParam = params.get("child");
    if (childParam && students.some((s) => s.id === childParam)) {
      setSelectedStudentId(childParam);
    } else {
      const stored = localStorage.getItem("parentSelectedChildId");
      if (stored && students.some((s) => s.id === stored)) setSelectedStudentId(stored);
    }
    const handler = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail && students.some((s) => s.id === custom.detail)) {
        setSelectedStudentId(custom.detail);
      }
    };
    window.addEventListener("parentChildSwitch", handler as EventListener);
    return () => window.removeEventListener("parentChildSwitch", handler as EventListener);
  }, [students]);
  const [activeExamModal, setActiveExamModal] = useState<OnlineExam | null>(null);

  // Homework submission state
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Online Fee Payment Modal state
  const { pay: rzpPay, processing: rzpProcessing, payError: rzpPayError } = useRazorpayCheckout();
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("UPI");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const [paySuccessMsg, setPaySuccessMsg] = useState("");

  // Student Photograph Upload State
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const portalPhotoInputRef = useRef<HTMLInputElement>(null);

  const handlePortalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoUploadError("Photograph size should be less than 5MB");
      return;
    }

    setPhotoUploadError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setNewPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!student) return;
    if (!newPhotoUrl) return;
    setIsUploadingPhoto(true);
    setPhotoUploadError("");
    try {
      const res = await fetch("/api/portal/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          photoUrl: newPhotoUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload photo");
      }
      setPhotoModalOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      setPhotoUploadError(err instanceof Error ? err.message : "Failed to upload photograph");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Change Password State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");

  const handleRequestPasswordChange = async () => {
    if (!student) return;
    setRequestingPassword(true);
    setPasswordErrorMsg("");
    setPasswordSuccessMsg("");

    try {
      const res = await fetch("/api/auth/security/request-password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          email: student.email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordErrorMsg(data.error || "Failed to send verification email");
      } else {
        setPasswordSuccessMsg(data.message || "Verification email sent successfully!");
      }
    } catch {
      setPasswordErrorMsg("Network error. Please try again.");
    } finally {
      setRequestingPassword(false);
    }
  };

  // AI Doubt Solver State
  const [doubtText, setDoubtText] = useState("");
  const [doubtSubject, setDoubtSubject] = useState("Physics");
  const [solvingDoubt, setSolvingDoubt] = useState(false);
  const [doubtSolution, setDoubtSolution] = useState<{
    coreConcept: string;
    formulaKey: string;
    stepByStepApproach: string[];
    solutionSummary?: string;
    proTip: string;
    poweredBy?: string;
  } | null>(null);

  // Course, Batch, and Search filtering state for student switcher
  const [switcherCourse, setSwitcherCourse] = useState<string>("ALL");
  const [switcherBatch, setSwitcherBatch] = useState<string>("ALL");
  const [switcherSearch, setSwitcherSearch] = useState<string>("");
  const [switcherModalOpen, setSwitcherModalOpen] = useState(false);

  // Derive unique courses from students
  const availableCourses = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    students.forEach((s) => {
      const key = s.courseId || s.courseName;
      const existing = map.get(key) || { id: key, name: s.courseName, count: 0 };
      existing.count++;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  // Derive unique batches from students (scoped to selected course if one is active)
  const availableBatches = useMemo(() => {
    const map = new Map<string, { id: string; name: string; courseKey: string; count: number }>();
    students.forEach((s) => {
      const courseKey = s.courseId || s.courseName;
      if (switcherCourse !== "ALL" && courseKey !== switcherCourse) return;
      const batchKey = s.batchId || s.batchName;
      const existing = map.get(batchKey) || { id: batchKey, name: s.batchName, courseKey, count: 0 };
      existing.count++;
      map.set(batchKey, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, switcherCourse]);

  // Filtered students for quick switcher and modal
  const filteredStudentsForSwitching = useMemo(() => {
    return students.filter((s) => {
      const courseKey = s.courseId || s.courseName;
      if (switcherCourse !== "ALL" && courseKey !== switcherCourse) return false;
      const batchKey = s.batchId || s.batchName;
      if (switcherBatch !== "ALL" && batchKey !== switcherBatch) return false;

      if (switcherSearch.trim()) {
        const q = switcherSearch.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchMobile = s.mobile.includes(q);
        const matchEmail = (s.email || "").toLowerCase().includes(q);
        const matchCourse = s.courseName.toLowerCase().includes(q);
        const matchBatch = s.batchName.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchEmail && !matchCourse && !matchBatch) {
          return false;
        }
      }
      return true;
    });
  }, [students, switcherCourse, switcherBatch, switcherSearch]);

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setSwitcherModalOpen(false);
  };

  const student = students.find((s) => s.id === selectedStudentId) || (isPreview && !selectedStudentId ? undefined : students[0]);

  // Per-child scoping for materials/assignments — same pattern as filteredLiveClasses (:1130) and studentExams.filter (:1305)
  // Preserves branch-wide behavior: batchId=null => show to all children
  const filteredMaterials = useMemo(() => materials.filter((m) => !m.batchId || m.batchId === student?.batchId), [materials, student?.batchId]);
  const filteredAssignments = useMemo(
    () => assignments.filter((a) => !a.batchId || a.batchId === student?.batchId),
    [assignments, student?.batchId],
  );

  const handleStudentSubmitWork = async (assignmentId: string) => {
    if (!student) return;
    if (!submissionUrl.trim()) return;
    setIsSubmittingWork(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          submissionUrl: submissionUrl.trim(),
          notes: submissionNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setSubmittingAssignmentId(null);
        setSubmissionUrl("");
        setSubmissionNotes("");
        window.location.reload();
      }
    } catch {
      alert("Failed to submit assignment");
    } finally {
      setIsSubmittingWork(false);
    }
  };

  const handleSolveDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtText.trim()) return;
    setSolvingDoubt(true);
    try {
      const res = await fetch("/api/doubt-solver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: doubtText.trim(),
          subject: doubtSubject,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDoubtSolution(data);
      }
    } catch {
      alert("Failed to solve doubt");
    } finally {
      setSolvingDoubt(false);
    }
  };

  const handlePayFee = async (e: React.FormEvent) => {
    if (!student) return;
    e.preventDefault();
    setPayError("");
    setPaySuccessMsg("");

    const amountNum = Number(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayError("Please enter a valid positive payment amount.");
      return;
    }
    if (amountNum > student.pendingFee) {
      setPayError(`Payment cannot exceed the outstanding balance of ${formatCurrency(student.pendingFee)}.`);
      return;
    }

    try {
      await rzpPay({
        studentId: student.id,
        studentName: student.name,
        amount: amountNum,
        purpose: "fee",
        onSuccess: () => {
          setPaySuccessMsg(`Payment of ${formatCurrency(amountNum)} verified & recorded! Receipt generated.`);
          student.paidFee = (student.paidFee || 0) + amountNum;
          student.pendingFee = Math.max(0, student.totalFee - student.paidFee);
          setTimeout(() => {
            setPayModalOpen(false);
            setPaySuccessMsg("");
            setPayAmount("");
            setPayNote("");
            window.location.reload();
          }, 1500);
        },
      });
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Payment could not be processed. Please try again.");
    }
  };

  return (
    <>
      {isPreview && students.length > 1 && !selectedStudentId ? (
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{ p: 4, borderRadius: "16px", border: "1px solid #D6E0EB", textAlign: "center", bgcolor: "white" }}
          >
            <Box sx={{ mx: "auto", width: 56, height: 56, borderRadius: "14px", bgcolor: "#EEF2F7", display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
              <Users size={28} style={{ color: "#4E6E93" }} />
            </Box>
            <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
              Select a student to preview
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem", mt: 0.5, maxWidth: 420, mx: "auto" }}>
              You are in preview mode. Choose a student from the switcher to view their full portal — batch, fees, exams, materials and more.
            </Typography>
            <Box sx={{ mt: 2.5, display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                startIcon={<Search size={14} />}
                onClick={() => setSwitcherModalOpen(true)}
                sx={{ bgcolor: "#1E3A5F", color: "white", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", borderRadius: "12px", px: 2.5 }}
              >
                Search & Switch
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px", mt: 1.5, display: "block" }}>
              {students.length} students • All Courses • All Batches
            </Typography>
          </Paper>
        </Stack>
      ) : !student ? (
        <Box sx={{ py: 6, textAlign: "center", color: "text.secondary", fontSize: "0.875rem" }}>
          No enrolled student found for your credentials.
        </Box>
      ) : (
        <Stack spacing={3}>
      {/* ── Student / Parent Profile Switcher — MUI (branch credentials locked) ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "16px",
          backgroundColor: "#13243B",
          color: "white",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 20px rgba(13,26,42,0.25)",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ minWidth: 0, alignItems: "center" }}>
          {/* Avatar / Photo */}
          {student.photoUrl ? (
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                src={student.photoUrl}
                alt={student.name}
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "16px",
                  border: "2px solid rgba(255,255,255,0.4)",
                  boxShadow: 2,
                }}
                variant="rounded"
              />
              {viewerRole !== "PARENT" && (
                <Box
                  component="button"
                  type="button"
                  onClick={() => {
                    setNewPhotoUrl(student.photoUrl || null);
                    setPhotoModalOpen(true);
                  }}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "16px",
                    border: "none",
                    bgcolor: "rgba(0,0,0,0.0)",
                    color: "white",
                    fontSize: "9px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.2s, background 0.2s",
                    "&:hover": { opacity: 1, bgcolor: "rgba(0,0,0,0.6)" },
                  }}
                >
                  Change
                </Box>
              )}
            </Box>
          ) : (
            <Box
              onClick={() => {
                if (viewerRole === "PARENT") return;
                setNewPhotoUrl(null);
                setPhotoModalOpen(true);
              }}
              sx={{
                width: 64,
                height: 64,
                borderRadius: "16px",
                border: "2px dashed #EFB65B",
                bgcolor: "rgba(255,255,255,0.08)",
                color: "#EFB65B",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: viewerRole === "PARENT" ? "default" : "pointer",
                flexShrink: 0,
                position: "relative",
                transition: "background 0.2s",
                "&:hover": { bgcolor: viewerRole === "PARENT" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)" },
              }}
              title={viewerRole === "PARENT" ? "Photo can only be updated via student login" : "Click to upload your passport photograph"}
            >
              <Camera size={26} />
              <Chip
                label={viewerRole === "PARENT" ? "View only" : "Upload"}
                size="small"
                sx={{
                  position: "absolute",
                  bottom: -6,
                  height: 16,
                  fontSize: "8px",
                  fontWeight: 800,
                  bgcolor: "#E8A33D",
                  color: "#13243B",
                  "& .MuiChip-label": { px: 0.7 },
                }}
              />
            </Box>
          )}

          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
              <Chip
                label="Student & Parent Portal"
                size="small"
                sx={{
                  bgcolor: "#E8A33D",
                  color: "#13243B",
                  fontWeight: 800,
                  fontSize: "10px",
                  height: 20,
                  borderRadius: "6px",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
              <Chip
                icon={<Building2 size={11} style={{ color: "white" }} />}
                label={student.branchName || "Main Branch"}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 600,
                  fontSize: "10px",
                  height: 20,
                  borderRadius: "6px",
                  "& .MuiChip-icon": { ml: 0.7, mr: -0.5 },
                }}
              />
              {student.photoUrl ? (
                <Chip
                  icon={<CheckCircle2 size={10} style={{ color: "#6EE7B7" }} />}
                  label="Photo on File"
                  size="small"
                  sx={{
                    bgcolor: "rgba(16,185,129,0.2)",
                    color: "#A7F3D0",
                    border: "1px solid rgba(52,211,153,0.35)",
                    fontWeight: 600,
                    fontSize: "10px",
                    height: 20,
                    "& .MuiChip-icon": { ml: 0.7 },
                  }}
                />
              ) : (
                <Chip
                  icon={<Camera size={10} style={{ color: "#FCD34D" }} />}
                  label="Photo Pending"
                  size="small"
                  sx={{
                    bgcolor: "rgba(245,158,11,0.22)",
                    color: "#FDE68A",
                    border: "1px solid rgba(251,191,36,0.35)",
                    fontWeight: 600,
                    fontSize: "10px",
                    height: 20,
                    "& .MuiChip-icon": { ml: 0.7 },
                  }}
                />
              )}
            </Stack>
            <Typography variant="h6" sx={{ mt: 0.7, fontFamily: "var(--font-sora)", fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.2, color: "white" }}>
              {student.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)", fontSize: "0.75rem", mt: 0.3 }}>
              {student.courseName} • {student.batchName} • Mobile: {student.mobile}
            </Typography>
          </Box>
        </Stack>

        {/* Action Buttons & Switcher */}
        <Stack direction="row" sx={{ alignSelf: { xs: "stretch", sm: "center" }, flexWrap: "wrap", gap: 1.2, alignItems: "center" }}>
          {viewerRole !== "PARENT" && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Camera size={13} style={{ color: "#EFB65B" }} />}
              onClick={() => {
                setNewPhotoUrl(student.photoUrl || null);
                setPhotoModalOpen(true);
              }}
              sx={{
                borderColor: "rgba(255,255,255,0.2)",
                bgcolor: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "none",
                borderRadius: "12px",
                px: 1.8,
                py: 0.7,
                "&:hover": { bgcolor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.3)" },
              }}
            >
              {student.photoUrl ? "Update Photo" : "Upload Photo"}
            </Button>
          )}

          {viewerRole !== "PARENT" && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<KeyRound size={13} />}
              onClick={() => {
                setPasswordErrorMsg("");
                setPasswordSuccessMsg("");
                setPasswordModalOpen(true);
              }}
              sx={{
                borderColor: "rgba(255,255,255,0.2)",
                bgcolor: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "none",
                borderRadius: "12px",
                px: 1.8,
                py: 0.7,
                "&:hover": { bgcolor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.3)" },
              }}
            >
              Change Password
            </Button>
          )}
          {viewerRole === "PARENT" && (
            <Chip
              label="Manage photo & password via student login"
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: "10px", height: 24, borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          )}

          {students.length > 1 && (
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={switcherCourse}
                  onChange={(e) => {
                    setSwitcherCourse(e.target.value);
                    setSwitcherBatch("ALL");
                  }}
                  displayEmpty
                  sx={{
                    bgcolor: "rgba(255,255,255,0.08)",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    borderRadius: "12px",
                    height: 32,
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
                    "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.85)" },
                  }}
                >
                  <MenuItem value="ALL">All Courses ({students.length})</MenuItem>
                  {availableCourses.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} ({c.count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select
                  value={switcherBatch}
                  onChange={(e) => setSwitcherBatch(e.target.value)}
                  displayEmpty
                  sx={{
                    bgcolor: "rgba(255,255,255,0.08)",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    borderRadius: "12px",
                    height: 32,
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
                    "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.85)" },
                  }}
                >
                  <MenuItem value="ALL">All Batches</MenuItem>
                  {availableBatches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name} ({b.count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 180, maxWidth: { xs: 200, sm: 240 } }}>
                <Select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  displayEmpty
                  sx={{
                    bgcolor: "rgba(255,255,255,0.12)",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: "12px",
                    height: 32,
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(232,163,61,0.45)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(232,163,61,0.7)" },
                    "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.85)" },
                  }}
                >
                  {filteredStudentsForSwitching.length === 0 ? (
                    <MenuItem value="" disabled>
                      No matching students
                    </MenuItem>
                  ) : (
                    filteredStudentsForSwitching.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name} • {s.batchName} ({s.courseName})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                size="small"
                startIcon={<Search size={13} />}
                onClick={() => setSwitcherModalOpen(true)}
                sx={{
                  borderColor: "rgba(232,163,61,0.55)",
                  bgcolor: "rgba(232,163,61,0.15)",
                  color: "#FDE68A",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  borderRadius: "12px",
                  height: 32,
                  px: 1.8,
                  "&:hover": { bgcolor: "rgba(232,163,61,0.25)", borderColor: "rgba(232,163,61,0.75)" },
                }}
              >
                Search & Switch
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Photo Upload Prompt Banner if photo is missing — MUI */}
      {!student.photoUrl && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "16px",
            border: "1px solid #FCD34D",
            bgcolor: "#FFFBEB",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: "#FDE68A", color: "#92400E", borderRadius: "12px" }}>
              <Camera size={20} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#78350F", fontSize: "0.75rem" }}>
                Passport Photograph Pending
              </Typography>
              <Typography variant="body2" sx={{ color: "#92400E", fontSize: "11px", lineHeight: 1.4, mt: 0.3 }}>
                Your photograph was not provided during admission. Please upload your passport-size photo for your official{" "}
                <Box component="span" sx={{ fontWeight: 700 }}>
                  Student Identity Card
                </Box>{" "}
                and attendance verification.
              </Typography>
            </Box>
          </Stack>
          {viewerRole !== "PARENT" ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<Upload size={13} />}
              onClick={() => {
                setNewPhotoUrl(null);
                setPhotoModalOpen(true);
              }}
              sx={{
                bgcolor: "#D97706",
                color: "white",
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "none",
                borderRadius: "12px",
                px: 2.2,
                alignSelf: { xs: "flex-start", sm: "center" },
                "&:hover": { bgcolor: "#B45309" },
              }}
            >
              Upload Passport Photo
            </Button>
          ) : (
            <Chip
              label="Photo update via student login"
              size="small"
              sx={{ bgcolor: "#FDE68A", color: "#92400E", fontSize: "11px", height: 24, border: "1px solid #FCD34D", alignSelf: { xs: "flex-start", sm: "center" } }}
            />
          )}
        </Paper>
      )}

      {/* Portal Navigation Tabs — MUI Tabs/Tab */}
      <Paper elevation={0} sx={{ borderRadius: "14px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as typeof activeTab)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px: 1,
            minHeight: 48,
            bgcolor: "white",
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", bgcolor: "#1E3A5F" },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.75rem",
              minHeight: 44,
              py: 1,
              px: 1.8,
              borderRadius: "10px",
              my: 0.5,
              mr: 0.7,
              color: "#4E6E93",
              "&.Mui-selected": { bgcolor: "#1E3A5F", color: "white" },
            },
          }}
        >
          <Tab
            value="batch"
            icon={<Layers size={15} />}
            iconPosition="start"
            label="My Allocated Batch"
          />
          <Tab
            value="live-classes"
            icon={<Video size={15} />}
            iconPosition="start"
            label={
              <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                <span>Live Lectures</span>
                <Chip label={liveClasses.length} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: activeTab === "live-classes" ? "rgba(255,255,255,0.2)" : "#EEF2F7", color: activeTab === "live-classes" ? "white" : "#4E6E93", "& .MuiChip-label": { px: 0.8 } }} />
              </Stack>
            }
          />
          <Tab
            value="certificates"
            icon={<Award size={15} />}
            iconPosition="start"
            label={
              <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                <span>My Certificates</span>
                <Chip label={student.certificates?.length || 0} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: activeTab === "certificates" ? "rgba(255,255,255,0.2)" : "#EEF2F7", color: activeTab === "certificates" ? "white" : "#4E6E93", "& .MuiChip-label": { px: 0.8 } }} />
              </Stack>
            }
          />
          <Tab
            value="exams"
            icon={<Award size={15} />}
            iconPosition="start"
            label={
              <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                <span>Online CBT Exams</span>
                <Chip label={exams.length} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: activeTab === "exams" ? "rgba(255,255,255,0.2)" : "#EEF2F7", color: activeTab === "exams" ? "white" : "#4E6E93", "& .MuiChip-label": { px: 0.8 } }} />
              </Stack>
            }
          />
          <Tab
            value="materials"
            icon={<BookOpen size={15} />}
            iconPosition="start"
            label={
              <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                <span>Study Material & LMS</span>
                <Chip label={materials.length} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: activeTab === "materials" ? "rgba(255,255,255,0.2)" : "#EEF2F7", color: activeTab === "materials" ? "white" : "#4E6E93", "& .MuiChip-label": { px: 0.8 } }} />
              </Stack>
            }
          />
          <Tab
            value="assignments"
            icon={<CheckSquare size={15} />}
            iconPosition="start"
            label={
              <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                <span>Homework & DPP</span>
                <Chip label={assignments.length} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: activeTab === "assignments" ? "rgba(255,255,255,0.2)" : "#EEF2F7", color: activeTab === "assignments" ? "white" : "#4E6E93", "& .MuiChip-label": { px: 0.8 } }} />
              </Stack>
            }
          />
          <Tab value="fees" icon={<Wallet size={15} />} iconPosition="start" label="Fee Ledger & Pay Online" />
          <Tab value="doubts" icon={<Sparkles size={15} />} iconPosition="start" label="✨ AI Doubt Assistant" />
          <Tab value="help" icon={<HelpCircle size={15} />} iconPosition="start" label="Help & Support" />
        </Tabs>
      </Paper>

      {/* Tab 1: My Allocated Batch (Read-Only) — MUI */}
      {activeTab === "batch" && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
              <Layers size={18} color="#1E3A5F" />
              My Allocated Batch & Class Schedule
            </Typography>
            <Chip icon={<Lock size={11} />} label="Read-Only View" size="small" sx={{ bgcolor: "#EEF2F7", border: "1px solid #D6E0EB", color: "#4E6E93", fontWeight: 600, fontSize: "11px", "& .MuiChip-icon": { ml: 0.7 } }} />
          </Stack>

          <MuiCard elevation={0} sx={{ borderRadius: "16px", border: "1px solid #D6E0EB" }}>
            <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: "column", sm: "row" }} sx={{ borderBottom: "1px solid #EEF2F7", pb: 2, justifyContent: "space-between", gap: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary", fontSize: "11px" }}>
                      Enrolled Program & Course
                    </Typography>
                    <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1.125rem", color: "text.primary", mt: 0.5 }}>
                      {student.courseName}
                    </Typography>
                    {student.courseDuration && (
                      <Stack direction="row" spacing={0.7} sx={{ mt: 0.5, color: "text.secondary", fontSize: "0.75rem", alignItems: "center" }}>
                        <Clock size={12} color="#7E9BBC" />
                        <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Duration: {student.courseDuration}</Typography>
                      </Stack>
                    )}
                  </Box>
                  <Paper elevation={0} sx={{ p: 1.7, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #D6E0EB", textAlign: { xs: "left", sm: "right" }, minWidth: 150 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "11px" }}>Branch</Typography>
                    <Stack direction="row" spacing={0.7} sx={{ mt: 0.2, alignItems: "center", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
                      <Building2 size={13} color="#4E6E93" />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.875rem", color: "text.primary" }}>
                        {student.batch?.branchName || student.branchName || "Main Branch"}
                      </Typography>
                    </Stack>
                  </Paper>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 2 }}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.6)", border: "1px solid rgba(214,224,235,0.85)" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "11px" }}>
                      Batch Name
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary", mt: 0.7 }}>
                      {student.batch?.name || student.batchName}
                    </Typography>
                    <Chip label={`Status: ${student.batch?.status || "Active (Ongoing)"}`} size="small" sx={{ mt: 1, bgcolor: "#E9F7EF", color: "#1F9D66", border: "1px solid #A7E0C2", fontWeight: 700, fontSize: "10px", height: 22 }} />
                  </Paper>

                  <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.6)", border: "1px solid rgba(214,224,235,0.85)" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "11px" }}>
                      Class Timing (Winter / Standard)
                    </Typography>
                    <Stack direction="row" spacing={0.9} sx={{ mt: 0.7, alignItems: "center" }}>
                      <Clock size={16} color="#1E3A5F" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
                        {student.batch?.timing || "7:00 AM - 9:00 AM"}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px", mt: 1, display: "block" }}>
                      Please report to branch 10 minutes prior to lecture start.
                    </Typography>
                  </Paper>

                  <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.6)", border: "1px solid rgba(214,224,235,0.85)" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "11px" }}>
                      Assigned Faculty
                    </Typography>
                    <Box sx={{ mt: 0.7 }}>
                      {student.batch?.facultyMembers && student.batch.facultyMembers.length > 0 ? (
                        <Stack spacing={0.5}>
                          {student.batch.facultyMembers.map((fac, idx) => (
                            <Typography key={idx} variant="body2" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#1E3A5F" }}>
                              • {fac}
                            </Typography>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                          Academic Faculty assigned by Branch Administration
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Box>

                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", border: "1px solid #D6E0EB", bgcolor: "rgba(238,242,247,0.55)", display: "flex", alignItems: "flex-start", gap: 1.2 }}>
                  <Lock size={15} color="#4E6E93" style={{ flexShrink: 0, marginTop: 2 }} />
                  <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "#4E6E93", lineHeight: 1.5 }}>
                    <Box component="span" sx={{ fontWeight: 700 }}>Notice</Box>: Students can only view their allocated batch and schedule. Batch timing adjustments, subject additions, or branch transfers must be requested through your branch administration.
                  </Typography>
                </Paper>
              </Stack>
            </CardContent>
          </MuiCard>
        </Stack>
      )}

      {/* Tab: Live Classes & Online Lectures — MUI */}
      {activeTab === "live-classes" && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
              <Video size={18} color="#E11D48" />
              Live Online Lectures & Interactive Classes
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Direct access to Zoom / Google Meet / MS Teams interactive classrooms
            </Typography>
          </Stack>

          {(() => {
            const filteredLiveClasses = liveClasses.filter((lc) => !student?.batchId || !lc.batchId || lc.batchId === student.batchId);
            if (filteredLiveClasses.length === 0)
              return (
                <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px dashed #D6E0EB", textAlign: "center", color: "text.secondary", fontSize: "0.75rem" }}>
                  No live classes scheduled for your enrolled program at this moment.
                </Paper>
              );
            return (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                {filteredLiveClasses.map((lc) => {
                const classDate = new Date(lc.scheduledAt);
                const isLive = lc.status === "LIVE";
                const isJoinable = isLive || Date.now() >= classDate.getTime() - 10 * 60 * 1000;

                return (
                  <MuiCard
                    key={lc.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: "16px",
                      border: isLive ? "1px solid #FB7185" : "1px solid #D6E0EB",
                      boxShadow: isLive ? "0 0 0 2px rgba(244,63,94,0.12)" : undefined,
                      bgcolor: isLive ? "rgba(255,241,242,0.35)" : "white",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <Stack spacing={1.8}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Chip
                          icon={isLive ? <Radio size={12} style={{ color: "white" }} /> : undefined}
                          label={isLive ? "LIVE NOW" : "SCHEDULED"}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "11px",
                            height: 22,
                            bgcolor: isLive ? "#F43F5E" : "#F0F9FF",
                            color: isLive ? "white" : "#0369A1",
                            border: isLive ? "none" : "1px solid #BAE6FD",
                            "& .MuiChip-icon": { ml: 0.7 },
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "11px" }}>
                          {lc.durationMinutes} Minutes
                        </Typography>
                      </Stack>

                      <Box>
                        {lc.subject && (
                          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "11px" }}>
                            {lc.subject}
                          </Typography>
                        )}
                        <Typography variant="subtitle1" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "0.875rem", color: "text.primary", mt: 0.3 }}>
                          {lc.title}
                        </Typography>
                        {lc.description && (
                          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem", mt: 0.5 }}>
                            {lc.description}
                          </Typography>
                        )}
                      </Box>

                      <Paper elevation={0} sx={{ p: 1.5, borderRadius: "12px", bgcolor: "rgba(238,242,247,0.55)", border: "1px solid #EEF2F7" }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={0.8} sx={{ color: "#334155", fontSize: "0.75rem", fontWeight: 500, alignItems: "center", flexWrap: "wrap" }}>
                            <Calendar size={13} color="#7E9BBC" />
                            <Typography variant="body2" sx={{ fontSize: "0.75rem", fontWeight: 500 }}>{formatDate(classDate)}</Typography>
                            <Typography variant="body2" sx={{ color: "#94A3B8" }}>•</Typography>
                            <Clock size={13} color="#7E9BBC" />
                            <Typography variant="body2" sx={{ fontSize: "0.75rem", fontWeight: 500 }}>
                              {classDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </Typography>
                          </Stack>
                          {lc.facultyName && (
                            <Typography variant="caption" sx={{ color: "#475569", fontSize: "11px" }}>
                              Faculty: <Box component="span" sx={{ fontWeight: 700 }}>{lc.facultyName}</Box>
                            </Typography>
                          )}
                        </Stack>
                      </Paper>
                    </Stack>

                    <Box sx={{ mt: 2, pt: 1.7, borderTop: "1px solid #EEF2F7" }}>
                      {viewerRole === "PARENT" ? (
                        <Paper elevation={0} sx={{ py: 1.2, px: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #D6E0EB", textAlign: "center", color: "#475569", fontSize: "0.75rem", fontWeight: 500 }}>
                          Live class scheduled for your child&apos;s batch — join is available only via student login
                        </Paper>
                      ) : isJoinable ? (
                        <Button
                          component="a"
                          href={lc.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="contained"
                          fullWidth
                          startIcon={<ExternalLink size={13} />}
                          sx={{ bgcolor: "#E11D48", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", borderRadius: "12px", py: 1.2, "&:hover": { bgcolor: "#BE123C" } }}
                        >
                          Join Live Class
                        </Button>
                      ) : (
                        <Paper elevation={0} sx={{ py: 1.2, px: 1.5, borderRadius: "12px", bgcolor: "#F1F5F9", textAlign: "center", color: "#64748B", fontSize: "0.75rem", fontWeight: 500 }}>
                          🔒 Join link unlocks 10 mins before class start (
                          {new Date(classDate.getTime() - 10 * 60 * 1000).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          )
                        </Paper>
                      )}
                    </Box>
                  </MuiCard>
                );
              })}
              </Box>
            );
          })()}
        </Stack>
      )}

      {/* Tab: My Course Certificates — MUI */}
      {activeTab === "certificates" && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
              <Award size={18} color="#D97706" />
              Official Course Completion & Merit Certificates
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Verified system-issued certificates of achievement
            </Typography>
          </Stack>

          {(!student.certificates || student.certificates.length === 0) ? (
            <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px dashed #D6E0EB", textAlign: "center" }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: "#F8FAFC", color: "#94A3B8", mx: "auto", mb: 1.2, borderRadius: "12px" }} variant="rounded">
                <Award size={20} />
              </Avatar>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#334155", fontSize: "0.875rem" }}>No certificates issued yet</Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "0.75rem", mt: 0.5 }}>
                Certificates are issued by the academic administration upon course completion.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              {student.certificates.map((cert) => (
                <MuiCard key={cert.id} elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #D6E0EB", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <Stack spacing={1.2}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Chip icon={<Award size={11} />} label={cert.title} size="small" sx={{ bgcolor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", fontWeight: 700, fontSize: "10px", height: 22, "& .MuiChip-icon": { ml: 0.7 } }} />
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500, fontSize: "11px" }}>
                        Issued on {formatDate(new Date(cert.issuedAt))}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "0.875rem", color: "text.primary" }}>{cert.templateName}</Typography>
                    <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.75rem" }}>
                      Program: <Box component="span" sx={{ fontWeight: 700 }}>{student.courseName}</Box>
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ pt: 1.7, mt: 1.5, borderTop: "1px solid #EEF2F7", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontFamily: "monospace", fontSize: "11px" }}>
                      Certificate #{cert.id.slice(-8).toUpperCase()}
                    </Typography>
                    <Button
                      component="a"
                      href={`/api/files/${cert.pdfFileAssetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      size="small"
                      startIcon={<Download size={13} />}
                      sx={{ bgcolor: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", borderRadius: "12px", px: 2, "&:hover": { bgcolor: "#13243B" } }}
                    >
                      Download PDF Certificate
                    </Button>
                  </Stack>
                </MuiCard>
              ))}
            </Box>
          )}
        </Stack>
      )}

      {/* Tab 2: Online CBT Exams — MUI */}
      {activeTab === "exams" && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
              Computer Based Tests (CBT) & Assessments
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Live timed exams with negative marking & instant scorecards
            </Typography>
          </Stack>

          {(() => {
            const studentExams = exams.filter((ex) => !student?.batchId || ex.batchId === student.batchId);
            if (studentExams.length === 0) {
              return (
                <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px dashed #D6E0EB", textAlign: "center", color: "#94A3B8", fontSize: "0.75rem" }}>
                  No online examinations scheduled for your batch right now.
                </Paper>
              );
            }

            return (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 2 }}>
                {studentExams.map((ex) => {
                  const hasAttempted = Boolean(ex.attempt);
                  return (
                    <MuiCard key={ex.id} elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #D6E0EB", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <Box>
                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                          <Chip
                            label={hasAttempted ? "Attempted" : "Live / Scheduled"}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "11px",
                              height: 22,
                              bgcolor: hasAttempted ? "#E9F7EF" : "#EEF2F7",
                              color: hasAttempted ? "#1F9D66" : "#4E6E93",
                              border: hasAttempted ? "1px solid #A7E0C2" : "1px solid #D6E0EB",
                            }}
                          />
                          <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
                            {formatDate(ex.testDate)}
                          </Typography>
                        </Stack>

                        <Typography variant="subtitle1" sx={{ mt: 1.2, fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
                          {ex.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                          {ex.subject || "All Subjects"} • {ex.seriesName || "General Exam"}
                        </Typography>

                        {ex.startTime && (
                          <Chip
                            icon={<Clock size={11} color="#4E6E93" />}
                            label={(() => {
                              const s = new Date(ex.startTime);
                              if (isNaN(s.getTime())) return "";
                              const sStr = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                              if (!ex.endTime) return `${sStr} onwards`;
                              const e = new Date(ex.endTime);
                              const eStr = !isNaN(e.getTime()) ? e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
                              return eStr ? `${sStr} - ${eStr}` : sStr;
                            })()}
                            size="small"
                            sx={{ mt: 1.2, bgcolor: "rgba(238,242,247,0.7)", color: "#334155", fontWeight: 600, fontSize: "11px", height: 22, "& .MuiChip-icon": { ml: 0.7 } }}
                          />
                        )}

                        <Paper elevation={0} sx={{ mt: 2, p: 1.2, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #EEF2F7", display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center" }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "10px", display: "block" }}>Duration</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.primary" }}>{ex.durationMinutes || 60} mins</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "10px", display: "block" }}>Max Marks</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.primary" }}>{ex.totalMarks} pts</Typography>
                          </Box>
                        </Paper>

                        {hasAttempted && ex.attempt && (
                          <Paper elevation={0} sx={{ mt: 1.5, p: 1.5, borderRadius: "12px", bgcolor: "#E9F7EF", border: "1px solid #A7E0C2" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.875rem", color: "#065F46" }}>
                              {viewerRole === "PARENT" ? "Child's Score" : "Your Score"}: {ex.attempt.score} / {ex.totalMarks}
                            </Typography>
                            {ex.attempt.rank && (
                              <Typography variant="caption" sx={{ color: "#047857", fontSize: "11px", display: "block" }}>Rank: #{ex.attempt.rank}</Typography>
                            )}
                            {ex.attempt.percentile && (
                              <Typography variant="caption" sx={{ color: "#047857", fontSize: "11px", display: "block" }}>Percentile: {ex.attempt.percentile}%</Typography>
                            )}
                          </Paper>
                        )}
                      </Box>

                      <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid #EEF2F7" }}>
                        {viewerRole === "PARENT" ? (
                          <Paper elevation={0} sx={{ py: 1.2, px: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #EEF2F7", textAlign: "center", color: "#475569", fontSize: "0.75rem", fontWeight: 500 }}>
                            {hasAttempted ? (
                              <Box component="span" sx={{ fontWeight: 700, color: "#047857" }}>Attempted — Score: {ex.attempt?.score} / {ex.totalMarks}</Box>
                            ) : (
                              <span>Not yet attempted</span>
                            )}
                          </Paper>
                        ) : (
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<Play size={13} fill="currentColor" />}
                            onClick={() => setActiveExamModal(ex)}
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              textTransform: "none",
                              borderRadius: "12px",
                              py: 1.1,
                              bgcolor: hasAttempted ? "#1E3A5F" : "#1F9D66",
                              "&:hover": { bgcolor: hasAttempted ? "#13243B" : "#188050" },
                            }}
                          >
                            {hasAttempted ? "Review Answers & Analysis" : "Start Online Exam"}
                          </Button>
                        )}
                      </Box>
                    </MuiCard>
                  );
                })}
              </Box>
            );
          })()}
        </Stack>
      )}

      {/* Tab 3: Study Material & LMS — MUI */}
      {activeTab === "materials" && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
              Class Notes, Question Banks & LMS Downloads
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Verified learning materials uploaded by your faculty
            </Typography>
          </Stack>

          {filteredMaterials.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px dashed #D6E0EB", textAlign: "center", color: "#94A3B8", fontSize: "0.75rem" }}>
              No study materials shared for this subject yet.
            </Paper>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 1.7 }}>
              {filteredMaterials.map((m) => (
                <MuiCard key={m.id} elevation={0} sx={{ p: 2, borderRadius: "16px", border: "1px solid #D6E0EB", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "box-shadow 0.2s", "&:hover": { boxShadow: "0 4px 16px rgba(13,26,42,0.08)" } }}>
                  <Box>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Chip label={m.subject} size="small" sx={{ bgcolor: "#EEF2F7", color: "#1E3A5F", border: "1px solid #D6E0EB", fontWeight: 600, fontSize: "11px", height: 22 }} />
                      <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "10px", textTransform: "uppercase" }}>
                        {m.fileType || "PDF"}
                      </Typography>
                    </Stack>

                    <Typography variant="subtitle2" sx={{ mt: 1.2, fontWeight: 600, color: "text.primary", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</Typography>
                    {m.topic && <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>Topic: {m.topic}</Typography>}
                    {m.description && (
                      <Typography variant="body2" sx={{ mt: 0.5, color: "#94A3B8", fontSize: "0.75rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.description}</Typography>
                    )}
                  </Box>

                  <Stack direction="row" sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #EEF2F7", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>{formatDate(m.createdAt)}</Typography>
                    <Button
                      component="a"
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      startIcon={<ExternalLink size={12} />}
                      sx={{ bgcolor: "#F8FAFC", color: "#334155", border: "1px solid #E2E8F0", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", borderRadius: "10px", px: 1.5, py: 0.5, "&:hover": { bgcolor: "#EEF2F7" } }}
                    >
                      Open Document
                    </Button>
                  </Stack>
                </MuiCard>
              ))}
            </Box>
          )}
        </Stack>
      )}

      {/* Tab 4: Homework & DPP — MUI */}
      {activeTab === "assignments" && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
              Daily Practice Problems (DPP) & Homework
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Submit your work digitally and review teacher corrections
            </Typography>
          </Stack>

          {filteredAssignments.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, borderRadius: "16px", border: "1px dashed #D6E0EB", textAlign: "center", color: "#94A3B8", fontSize: "0.75rem" }}>
              No active assignments due for your batch.
            </Paper>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 2 }}>
              {filteredAssignments.map((asg) => {
                const isSubmitted = Boolean(asg.submission);
                return (
                  <MuiCard key={asg.id} elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #D6E0EB", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <Box>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Chip
                          label={isSubmitted ? "Submitted" : "Pending Submission"}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "11px",
                            height: 22,
                            bgcolor: isSubmitted ? "#E9F7EF" : "#FFFBEB",
                            color: isSubmitted ? "#1F9D66" : "#B45309",
                            border: isSubmitted ? "1px solid #A7E0C2" : "1px solid #FDE68A",
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>Due: {formatDate(asg.dueDate)}</Typography>
                      </Stack>

                      <Typography variant="subtitle1" sx={{ mt: 1.5, fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "0.875rem", color: "text.primary" }}>{asg.title}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                        {asg.subject} • Max Marks: {asg.totalMarks}
                      </Typography>

                      {asg.attachmentUrl && (
                        <Button
                          component="a"
                          href={asg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          startIcon={<ExternalLink size={12} />}
                          sx={{ mt: 1.2, color: "#334155", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", p: 0, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
                        >
                          Download Question Sheet
                        </Button>
                      )}

                      {isSubmitted && asg.submission && (
                        <Paper elevation={0} sx={{ mt: 1.5, p: 1.5, borderRadius: "12px", bgcolor: "#E9F7EF", border: "1px solid #A7E0C2" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#065F46" }}>
                            Score: {asg.submission.marksObtained != null ? asg.submission.marksObtained : "Pending Review"} / {asg.totalMarks} pts
                          </Typography>
                          {asg.submission.feedback && (
                            <Typography variant="caption" sx={{ color: "#047857", fontSize: "11px", fontStyle: "italic", display: "block", mt: 0.5 }}>
                              Feedback: {asg.submission.feedback}
                            </Typography>
                          )}
                        </Paper>
                      )}

                      {submittingAssignmentId === asg.id && viewerRole !== "PARENT" && (
                        <Stack spacing={1.5} sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #EEF2F7" }}>
                          <TextField
                            type="url"
                            placeholder="Paste Google Drive / Dropbox link..."
                            value={submissionUrl}
                            onChange={(e) => setSubmissionUrl(e.target.value)}
                            size="small"
                            fullWidth
                            sx={{ "& .MuiOutlinedInput-input": { fontSize: "0.75rem" } }}
                          />
                          <TextField
                            type="text"
                            placeholder="Optional notes for teacher..."
                            value={submissionNotes}
                            onChange={(e) => setSubmissionNotes(e.target.value)}
                            size="small"
                            fullWidth
                            sx={{ "& .MuiOutlinedInput-input": { fontSize: "0.75rem" } }}
                          />
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={() => setSubmittingAssignmentId(null)}
                              sx={{ borderColor: "#D6E0EB", color: "#475569", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", borderRadius: "10px" }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              fullWidth
                              onClick={() => handleStudentSubmitWork(asg.id)}
                              disabled={isSubmittingWork}
                              sx={{ bgcolor: "#1E3A5F", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", borderRadius: "10px", "&:hover": { bgcolor: "#13243B" } }}
                            >
                              Submit
                            </Button>
                          </Stack>
                        </Stack>
                      )}
                    </Box>

                    {!submittingAssignmentId && (
                      <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #EEF2F7" }}>
                        {viewerRole === "PARENT" ? (
                          <Paper elevation={0} sx={{ py: 1.2, px: 1.5, borderRadius: "12px", bgcolor: "#F8FAFC", border: "1px solid #D6E0EB", textAlign: "center", color: "#475569", fontSize: "0.75rem", fontWeight: 500 }}>
                            Homework submissions available only via student login
                          </Paper>
                        ) : (
                          <Button
                            variant="outlined"
                            fullWidth
                            size="small"
                            startIcon={<CheckSquare size={13} />}
                            onClick={() => setSubmittingAssignmentId(asg.id)}
                            sx={{ bgcolor: "#F8FAFC", color: "#334155", border: "1px solid #E2E8F0", fontWeight: 600, fontSize: "0.75rem", textTransform: "none", borderRadius: "10px", "&:hover": { bgcolor: "#EEF2F7" } }}
                          >
                            {isSubmitted ? "Re-submit Homework" : "Submit Homework Solution"}
                          </Button>
                        )}
                      </Box>
                    )}
                  </MuiCard>
                );
              })}
            </Box>
          )}
        </Stack>
      )}

      {/* Tab 5: Fee Ledger & Online Payment — MUI */}
      {activeTab === "fees" && (
        <Stack spacing={2}>
          {/* Fee Structure Summary Cards */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
            <MuiCard elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #D6E0EB", textAlign: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "11px" }}>Total Course Fee</Typography>
              <Typography variant="h5" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1.5rem", color: "text.primary", mt: 0.7 }}>
                {formatCurrency(student.totalFee)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", display: "block", mt: 0.5 }}>
                Plan: {student.plan === "INSTALLMENTS" ? "Installments" : student.plan === "QUARTERLY" ? "Quarterly" : "Full Course"}
              </Typography>
            </MuiCard>

            <MuiCard elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #A7E0C2", bgcolor: "#F0FDF4", textAlign: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#047857", fontSize: "11px" }}>Total Paid Amount</Typography>
              <Typography variant="h5" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1.5rem", color: "#059669", mt: 0.7 }}>
                {formatCurrency(student.paidFee)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#059669", fontSize: "11px", fontWeight: 600, display: "block", mt: 0.5 }}>
                {student.pendingFee === 0 ? "100% Fully Settled" : `${Math.round((student.paidFee / student.totalFee) * 100)}% Cleared`}
              </Typography>
            </MuiCard>

            <MuiCard elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #FECACA", bgcolor: "#FEF2F2", textAlign: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#B91C1C", fontSize: "11px" }}>Outstanding Balance Due</Typography>
              <Typography variant="h5" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1.5rem", color: "#DC2626", mt: 0.7 }}>
                {formatCurrency(student.pendingFee)}
              </Typography>
              {student.dueDate && (
                <Typography variant="caption" sx={{ color: "#DC2626", fontSize: "11px", fontWeight: 600, display: "block", mt: 0.5 }}>
                  Due by: {formatDate(student.dueDate)}
                </Typography>
              )}
            </MuiCard>
          </Box>

          {/* Online Payment Callout */}
          {student.pendingFee > 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "16px",
                border: "1px solid #6EE7B7",
                background: "linear-gradient(90deg, #ECFDF5 0%, #F0FDFA 50%, #FFFFFF 100%)",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <CreditCard size={18} color="#059669" />
                  <Typography variant="subtitle1" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "#022C22" }}>
                    Pay Your Course Fees Online
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: "#065F46", fontSize: "0.75rem", mt: 0.5 }}>
                  Pay outstanding balance or your next scheduled installment via UPI, Net Banking, or Card with instant verification.
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<CreditCard size={15} />}
                onClick={() => {
                  setPayAmount(String(student.pendingFee));
                  setPayModalOpen(true);
                }}
                sx={{ bgcolor: "#059669", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", borderRadius: "12px", px: 2.5, py: 1.2, flexShrink: 0, "&:hover": { bgcolor: "#047857" } }}
              >
                Pay Fee Online Now
              </Button>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ p: 2, borderRadius: "16px", border: "1px solid #A7E0C2", bgcolor: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", gap: 1.2, color: "#065F46", fontSize: "0.75rem", fontWeight: 600 }}>
              <CheckCircle2 size={16} color="#059669" />
              All course fees are fully settled! No pending installments due.
            </Paper>
          )}

          {/* Payment Transactions & Receipts */}
          <MuiCard elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #D6E0EB" }}>
            <Typography variant="subtitle1" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "0.875rem", color: "text.primary", mb: 2 }}>
              Payment Transactions & Official Receipts
            </Typography>

            {student.payments.length === 0 ? (
              <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "0.75rem", textAlign: "center", py: 2 }}>
                No payment transactions recorded yet.
              </Typography>
            ) : (
              <Stack spacing={1.2}>
                {student.payments.map((p) => {
                  const isRefund = p.amount < 0 || p.isRefund;
                  return (
                    <Paper
                      key={p.id}
                      elevation={0}
                      sx={{
                        p: 1.7,
                        borderRadius: "12px",
                        border: isRefund ? "1px solid #FECACA" : "1px solid #EEF2F7",
                        bgcolor: isRefund ? "rgba(254,242,242,0.5)" : "rgba(248,250,252,0.5)",
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "stretch", sm: "center" },
                        justifyContent: "space-between",
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.primary" }}>
                            {p.installmentTitle || (isRefund ? "Fee Refund Credit" : "Fee Payment")}
                          </Typography>
                          <Chip label={p.method} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 600, bgcolor: "#EEF2F7", color: "#334155", "& .MuiChip-label": { px: 0.8 } }} />
                          {isRefund && (
                            <Chip label="REFUND" size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: "#FEE2E2", color: "#B91C1C", "& .MuiChip-label": { px: 0.8 } }} />
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", display: "block", mt: 0.5 }}>
                          {formatDate(p.paidAt)}
                          {p.refundReason ? ` • ${p.refundReason}` : ""}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: { xs: "space-between", sm: "flex-end" } }}>
                        <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                          <Typography variant="subtitle2" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "0.875rem", color: isRefund ? "#B91C1C" : "#059669" }}>
                            {isRefund ? "-" : "+"}
                            {formatCurrency(Math.abs(p.amount))}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748B", fontSize: "10px", fontWeight: 500, display: "block" }}>
                            {isRefund ? "Refund Recorded" : "Verified ✓"}
                          </Typography>
                        </Box>

                        <Button
                          component="a"
                          href={`/api/payments/${p.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          startIcon={<Download size={12} />}
                          sx={{ bgcolor: "white", color: "#334155", border: "1px solid #E2E8F0", fontWeight: 600, fontSize: "11px", textTransform: "none", borderRadius: "10px", px: 1.5, py: 0.6, flexShrink: 0, "&:hover": { bgcolor: "#F8FAFC" } }}
                        >
                          PDF Receipt
                        </Button>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </MuiCard>
        </Stack>
      )}

      {/* Tab: Help & Support — MUI role-aware AI + FAQ */}
      {activeTab === "help" && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <HelpCircle size={16} color="#1E3A5F" />
                <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>Help & Support</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", display: "block", mt: 0.3 }}>
                {viewerRole === "PARENT" ? "Help for parents — fees, attendance, live classes, and per-child assignments." : "Help for students — live classes, tests, attendance, and DPP."}
              </Typography>
            </Box>
          </Stack>
          <SupportChat role={viewerRole} />
          <MuiCard elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #D6E0EB" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.875rem", color: "text.primary", mb: 0.5 }}>Contact Platform Admin</Typography>
            <Typography variant="body2" sx={{ color: "#475569", fontSize: "0.75rem", mb: 1.5 }}>If the AI couldn’t resolve your issue, submit a support ticket — our team will respond in your portal.</Typography>
            <Button
              component="a"
              href="/support"
              variant="contained"
              size="small"
              sx={{ bgcolor: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", borderRadius: "12px", px: 2.2, "&:hover": { bgcolor: "#13243B" } }}
            >
              Open Support Tickets →
            </Button>
          </MuiCard>
        </Stack>
      )}

      {/* Tab 6: AI Doubt Solver — MUI */}
      {activeTab === "doubts" && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Sparkles size={16} color="#D97706" />
                <Typography variant="h6" sx={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>AI Academic Doubt Assistant</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", display: "block", mt: 0.3 }}>
                Get instant step-by-step conceptual breakdowns, formulas, and hints for any homework or exam question.
              </Typography>
            </Box>
          </Stack>

          <MuiCard elevation={0} sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #D6E0EB" }}>
            <Box component="form" onSubmit={handleSolveDoubt} sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.75rem", color: "#334155" }}>Subject:</Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={doubtSubject}
                    onChange={(e) => setDoubtSubject(e.target.value)}
                    displayEmpty
                    sx={{ fontSize: "0.75rem", fontWeight: 600, borderRadius: "10px", height: 34, bgcolor: "white" }}
                  >
                    <MenuItem value="Physics">Physics</MenuItem>
                    <MenuItem value="Chemistry">Chemistry</MenuItem>
                    <MenuItem value="Mathematics">Mathematics</MenuItem>
                    <MenuItem value="Biology">Biology</MenuItem>
                    <MenuItem value="General">Other / General</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                multiline
                rows={3}
                placeholder="Type or paste your math/physics/chemistry question here..."
                value={doubtText}
                onChange={(e) => setDoubtText(e.target.value)}
                fullWidth
                sx={{ "& .MuiOutlinedInput-input": { fontSize: "0.875rem" } }}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={solvingDoubt || !doubtText.trim()}
                startIcon={solvingDoubt ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />}
                sx={{ alignSelf: "flex-start", bgcolor: "#1E3A5F", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", borderRadius: "12px", px: 2.2, py: 1, "&:hover": { bgcolor: "#13243B" } }}
              >
                {solvingDoubt ? "Analyzing Doubt..." : "Get Step-by-Step Hint"}
              </Button>
            </Box>

            {doubtSolution && (
              <Paper elevation={0} sx={{ mt: 3, p: 2, borderRadius: "16px", bgcolor: "#FFFBEB", border: "1px solid #FCD34D", display: "flex", flexDirection: "column", gap: 1.7 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#78350F", fontSize: "11px" }}>Core Physics/Math Concept:</Typography>
                  <Typography variant="body2" sx={{ color: "#334155", fontSize: "0.75rem", mt: 0.3 }}>{doubtSolution.coreConcept}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#78350F", fontSize: "11px" }}>Standard Formula / Law:</Typography>
                  <Paper elevation={0} sx={{ mt: 0.5, p: 1.2, borderRadius: "10px", border: "1px solid #FDE68A", bgcolor: "white", fontFamily: "monospace", fontSize: "0.75rem", color: "#1E293B" }}>
                    {doubtSolution.formulaKey}
                  </Paper>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#78350F", fontSize: "11px" }}>Step-by-Step Approach:</Typography>
                  <Box component="ol" sx={{ pl: 2.5, mt: 0.7, display: "flex", flexDirection: "column", gap: 0.5, color: "#334155", fontSize: "0.75rem", listStyle: "decimal" }}>
                    {doubtSolution.stepByStepApproach.map((st, i) => (
                      <Box component="li" key={i}>{st}</Box>
                    ))}
                  </Box>
                </Box>

                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "10px", border: "1px solid #FDE68A", bgcolor: "rgba(255,255,255,0.7)", color: "#78350F", fontSize: "0.75rem", fontWeight: 600 }}>
                  💡 Pro-Tip: {doubtSolution.proTip}
                </Paper>
              </Paper>
            )}
          </MuiCard>
        </Stack>
      )}

      {/* Online Exam Modal */}
      {activeExamModal && (
        <OnlineExamModal
          open={Boolean(activeExamModal)}
          testId={activeExamModal.id}
          studentId={student.id}
          studentName={student.name}
          onClose={() => setActiveExamModal(null)}
        />
      )}

      {/* Online Fee Payment Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 border border-scholar-100">
            <div className="flex items-center justify-between border-b border-scholar-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-600" />
                  Pay Course Fee Online
                </h3>
                <p className="text-xs text-scholar-500">
                  {student.name} • {student.courseName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPayModalOpen(false);
                  setPayError("");
                  setPaySuccessMsg("");
                }}
                className="text-scholar-400 hover:text-scholar-700 p-1 rounded-lg hover:bg-scholar-100"
              >
                <X size={18} />
              </button>
            </div>

            {paySuccessMsg ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <h4 className="font-bold text-emerald-950 text-sm">Payment Successful!</h4>
                <p className="text-xs text-emerald-800">{paySuccessMsg}</p>
                <span className="block text-[10px] text-emerald-700">
                  Updated outstanding balance: {formatCurrency(student.pendingFee)}
                </span>
              </div>
            ) : (
              <form onSubmit={handlePayFee} className="space-y-4">
                {(payError || rzpPayError) && (
                  <div className="rounded-xl bg-danger-50 border border-danger-200 p-3 text-xs text-danger-700 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{payError || rzpPayError}</span>
                  </div>
                )}

                {/* Fee Structure Summary Box */}
                <div className="rounded-xl bg-scholar-50 p-3 border border-scholar-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-scholar-600">
                    <span>Total Course Fee:</span>
                    <strong className="text-ink">{formatCurrency(student.totalFee)}</strong>
                  </div>
                  <div className="flex justify-between text-scholar-600">
                    <span>Already Paid:</span>
                    <strong className="text-emerald-700">{formatCurrency(student.paidFee)}</strong>
                  </div>
                  <div className="flex justify-between text-scholar-800 font-bold border-t border-scholar-200 pt-1">
                    <span>Outstanding Due:</span>
                    <span className="text-rose-700 text-sm">{formatCurrency(student.pendingFee)}</span>
                  </div>
                  {student.dueDate && (
                    <p className="text-[11px] text-scholar-500 pt-0.5">
                      Scheduled Due Date: <strong>{formatDate(student.dueDate)}</strong>
                    </p>
                  )}
                </div>

                {/* Quick Selection Shortcuts */}
                <div>
                  <label className="block text-xs font-semibold text-scholar-700 mb-1.5">
                    Select Payment Amount (₹)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(student.pendingFee))}
                      className="flex-1 rounded-lg border border-scholar-200 bg-white py-1.5 px-2 text-xs font-semibold text-scholar-800 hover:bg-scholar-50 focus:border-scholar-600"
                    >
                      Full Balance ({formatCurrency(student.pendingFee)})
                    </button>
                    {student.pendingFee > 5000 && (
                      <button
                        type="button"
                        onClick={() => setPayAmount(String(Math.round(student.pendingFee / 2)))}
                        className="flex-1 rounded-lg border border-scholar-200 bg-white py-1.5 px-2 text-xs font-semibold text-scholar-800 hover:bg-scholar-50 focus:border-scholar-600"
                      >
                        Installment ({formatCurrency(Math.round(student.pendingFee / 2))})
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-sm text-scholar-400">₹</span>
                    <input
                      required
                      type="number"
                      min="1"
                      max={student.pendingFee}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Enter custom amount..."
                      className="w-full rounded-xl border border-scholar-200 pl-7 pr-3 py-2 text-sm font-semibold text-ink outline-none focus:border-scholar-600"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-scholar-700 mb-1.5">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "UPI", label: "UPI (GPay / PhonePe / QR)" },
                      { id: "Net Banking", label: "Net Banking" },
                      { id: "Debit / Credit Card", label: "Card (Debit / Credit)" },
                      { id: "Bank Transfer", label: "NEFT / Bank Transfer" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`rounded-xl p-2.5 text-xs font-semibold text-left border transition-all ${
                          payMethod === m.id
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs font-bold"
                            : "border-scholar-200 bg-white text-scholar-700 hover:bg-scholar-50"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-xs font-semibold text-scholar-700 mb-1">
                    Payment Note / UTR Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="e.g. UTR #123456789 or Term 2 installment"
                    className="w-full rounded-xl border border-scholar-200 p-2 text-xs outline-none focus:border-scholar-600"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayModalOpen(false)}
                    className="flex-1 rounded-xl border border-scholar-200 py-2.5 text-xs font-semibold text-scholar-600 hover:bg-scholar-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rzpProcessing || !payAmount}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-xs"
                  >
                    {rzpProcessing ? "Opening Razorpay..." : `Pay ${formatCurrency(Number(payAmount) || 0)}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Photograph Upload Modal */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-scholar-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-100 text-scholar-800">
                  <Camera size={16} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-ink">Upload Passport Photograph</h3>
                  <p className="text-[11px] text-scholar-500">For Student ID Card & Official Attendance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="text-scholar-400 hover:text-ink cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            {photoUploadError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {photoUploadError}
              </div>
            )}

            {/* Photo Preview & Selector */}
            <div className="flex flex-col items-center justify-center space-y-3 py-2">
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-scholar-300 bg-scholar-50/60 shadow-inner">
                {newPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={newPhotoUrl} alt="Passport preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-center p-2 text-scholar-400">
                    <Camera size={32} className="mb-1" />
                    <span className="text-[10px] font-semibold">No photo selected</span>
                  </div>
                )}
              </div>

              <input
                ref={portalPhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePortalPhotoSelect}
              />

              <button
                type="button"
                onClick={() => portalPhotoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 shadow-2xs cursor-pointer"
              >
                <Upload size={13} />
                <span>{newPhotoUrl ? "Choose Different Image" : "Select Photo from Device"}</span>
              </button>
            </div>

            {/* Photo Guidelines */}
            <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3 text-[11px] text-scholar-600 space-y-1">
              <span className="font-bold text-ink block">Photo Guidelines:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Clear passport-style headshot (face looking forward).</li>
                <li>Plain or neutral background.</li>
                <li>Supported formats: JPG, PNG, WEBP (Max 5MB).</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-scholar-100">
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="rounded-xl border border-scholar-200 px-3.5 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={!newPhotoUrl || isUploadingPhoto}
                className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-scholar-900 shadow disabled:opacity-50 cursor-pointer"
              >
                {isUploadingPhoto ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                <span>Save Photograph</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Verification Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-scholar-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-50 text-scholar-800 border border-scholar-200">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-ink">Change Account Password</h3>
                  <p className="text-[11px] text-scholar-500">Secure email identity verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-50 hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {passwordSuccessMsg ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <h4 className="text-xs font-bold text-emerald-950">Verification Email Dispatched!</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {passwordSuccessMsg}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium pt-1">
                  Please open your email inbox and click the verification link. Once approved, you can immediately set your new password!
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="w-full rounded-xl bg-emerald-700 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Got It
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-scholar-100 bg-scholar-50 p-3.5 text-xs text-scholar-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-scholar-900">
                    <Mail size={14} className="text-scholar-600" />
                    <span>Identity Verification Required</span>
                  </div>
                  <p className="text-scholar-600 leading-relaxed text-[11px]">
                    To protect your student account, we send a secure verification link to your registered email address before changing your password.
                  </p>
                  <div className="mt-2 rounded-lg border border-scholar-200 bg-white px-3 py-2 text-xs">
                    <span className="text-scholar-500 font-medium">Registered Email: </span>
                    <span className="font-mono font-bold text-scholar-900">{student.email || "No email on file"}</span>
                  </div>
                </div>

                {passwordErrorMsg && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-scholar-100">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="rounded-xl border border-scholar-200 px-3.5 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestPasswordChange}
                    disabled={requestingPassword || !student.email}
                    className="inline-flex items-center gap-2 rounded-xl bg-scholar-800 px-4 py-2 text-xs font-bold text-white hover:bg-scholar-900 disabled:opacity-50 cursor-pointer"
                  >
                    {requestingPassword && <Loader2 size={13} className="animate-spin" />}
                    <span>Send Verification Email</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </Stack>
      )}
      {/* Search & Switch Student Modal — always mounted */}
      {switcherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-scholar-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-scholar-100 bg-scholar-50/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-600 text-white shadow-xs">
                  <ArrowLeftRight size={17} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    Switch Student / Ward
                  </h3>
                  <p className="text-xs text-scholar-500">
                    Filter by course, batch, or live search by name & mobile to quickly switch profile
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwitcherModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-scholar-400 hover:bg-scholar-200/60 hover:text-ink transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Search & Filters Bar */}
            <div className="border-b border-scholar-100 bg-white p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-scholar-400" size={15} />
                <input
                  type="text"
                  value={switcherSearch}
                  onChange={(e) => setSwitcherSearch(e.target.value)}
                  placeholder="Search by student name, mobile number, roll or email..."
                  className="w-full rounded-2xl border border-scholar-200 bg-scholar-50/50 pl-10 pr-10 py-2.5 text-xs text-ink placeholder:text-scholar-400 focus:bg-white focus:outline-none focus:border-scholar-500 shadow-2xs font-medium"
                  autoFocus
                />
                {switcherSearch && (
                  <button
                    type="button"
                    onClick={() => setSwitcherSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-scholar-400 hover:text-ink cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Course Filter Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-scholar-500">Course:</span>
                    <select
                      value={switcherCourse}
                      onChange={(e) => {
                        setSwitcherCourse(e.target.value);
                        setSwitcherBatch("ALL");
                      }}
                      className="rounded-xl border border-scholar-200 bg-scholar-50/60 px-2.5 py-1 text-xs font-semibold text-scholar-800 outline-none cursor-pointer"
                    >
                      <option value="ALL">All Courses ({students.length})</option>
                      {availableCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Filter Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-scholar-500">Batch:</span>
                    <select
                      value={switcherBatch}
                      onChange={(e) => setSwitcherBatch(e.target.value)}
                      className="rounded-xl border border-scholar-200 bg-scholar-50/60 px-2.5 py-1 text-xs font-semibold text-scholar-800 outline-none cursor-pointer"
                    >
                      <option value="ALL">All Batches</option>
                      {availableBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.count})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(switcherCourse !== "ALL" || switcherBatch !== "ALL" || switcherSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSwitcherCourse("ALL");
                      setSwitcherBatch("ALL");
                      setSwitcherSearch("");
                    }}
                    className="text-[11px] font-semibold text-scholar-600 hover:text-scholar-900 hover:underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh]">
              {filteredStudentsForSwitching.length === 0 ? (
                <div className="py-10 text-center text-xs text-scholar-400 space-y-2">
                  <Users size={28} className="mx-auto text-scholar-300" />
                  <p>No students match your course, batch, or search criteria.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSwitcherCourse("ALL");
                      setSwitcherBatch("ALL");
                      setSwitcherSearch("");
                    }}
                    className="rounded-xl bg-scholar-100 px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-200 cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredStudentsForSwitching.map((s) => {
                    const isCurrent = s.id === selectedStudentId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectStudent(s.id)}
                        className={`group relative flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isCurrent
                            ? "border-marigold-500 bg-marigold-50/50 shadow-xs ring-1 ring-marigold-400"
                            : "border-scholar-100 bg-white hover:border-scholar-300 hover:bg-scholar-50/50 hover:shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {s.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.photoUrl}
                              alt={s.name}
                              className="h-10 w-10 shrink-0 rounded-xl object-cover border border-scholar-200"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-scholar-100 text-xs font-bold text-scholar-700">
                              {initials(s.name)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-ink truncate">{s.name}</span>
                              {isCurrent && (
                                <span className="rounded-full bg-marigold-400 px-1.5 py-0.2 text-[9px] font-extrabold text-scholar-950 uppercase">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-scholar-500 truncate">
                              {s.courseName} • {s.batchName}
                            </p>
                            <p className="text-[10px] text-scholar-400 truncate">
                              Mobile: {s.mobile}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              s.pendingFee > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {s.pendingFee > 0 ? `${formatCurrency(s.pendingFee)} Due` : "Cleared"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-scholar-100 bg-scholar-50/50 px-6 py-3 text-xs text-scholar-500">
              <span>
                Showing <strong>{filteredStudentsForSwitching.length}</strong> of <strong>{students.length}</strong> students
              </span>
              <button
                type="button"
                onClick={() => setSwitcherModalOpen(false)}
                className="rounded-xl border border-scholar-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
