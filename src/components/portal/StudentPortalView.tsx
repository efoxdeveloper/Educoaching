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
};

type Assignment = {
  id: string;
  title: string;
  subject: string;
  type: string;
  dueDate: string;
  totalMarks: number;
  attachmentUrl: string | null;
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
  viewerRole?: "STUDENT" | "PARENT" | "STAFF" | "OWNER" | "ADMIN";
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
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

  const student = students.find((s) => s.id === selectedStudentId) || students[0];

  const handleStudentSubmitWork = async (assignmentId: string) => {
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

  if (!student) {
    return (
      <div className="py-12 text-center text-sm text-scholar-500">
        No enrolled student found for your credentials.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student / Parent Profile Switcher (Branch credentials locked to student's enrolled campus) */}
      <div className="flex flex-col gap-3 rounded-2xl bg-scholar-800 p-6 text-white sm:flex-row sm:items-center sm:justify-between shadow-lg">
        <div className="flex items-center gap-4">
          {/* Student Passport Photo / Avatar */}
          {student.photoUrl ? (
            <div className="relative group shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={student.photoUrl}
                alt={student.name}
                className="h-16 w-16 rounded-2xl object-cover border-2 border-white/40 shadow-md"
              />
              <button
                type="button"
                onClick={() => {
                  setNewPhotoUrl(student.photoUrl || null);
                  setPhotoModalOpen(true);
                }}
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold cursor-pointer"
              >
                Change
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setNewPhotoUrl(null);
                setPhotoModalOpen(true);
              }}
              className="relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-marigold-300 bg-white/10 text-marigold-400 hover:bg-white/20 transition-all shadow-md shrink-0 group"
              title="Click to upload your passport photograph"
            >
              <Camera size={26} className="group-hover:scale-110 transition-transform" />
              <span className="absolute -bottom-1 rounded-full bg-marigold-400 px-1.5 py-0.2 text-[8px] font-extrabold uppercase text-scholar-950 shadow-xs">
                Upload
              </span>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded bg-marigold-400 px-2 py-0.5 text-[10px] font-bold text-scholar-950 uppercase">
                Student & Parent Portal
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-scholar-100">
                <Building2 size={11} /> {student.branchName || "Main Campus"}
              </span>
              {student.photoUrl ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/30 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  <CheckCircle2 size={10} /> Photo on File
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/30 border border-amber-400/40 px-2 py-0.5 text-[10px] font-semibold text-amber-200 animate-pulse">
                  <Camera size={10} /> Photo Pending
                </span>
              )}
            </div>
            <h2 className="mt-1 font-display text-xl font-bold">{student.name}</h2>
            <p className="text-xs text-scholar-200">
              {student.courseName} • {student.batchName} • Mobile: {student.mobile}
            </p>
          </div>
        </div>

        {/* Action Buttons & Switch Student Dropdown for Parent with multiple wards */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setNewPhotoUrl(student.photoUrl || null);
              setPhotoModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors shadow-2xs cursor-pointer"
          >
            <Camera size={13} className="text-marigold-400" />
            <span>{student.photoUrl ? "Update Photo" : "Upload Photo"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPasswordErrorMsg("");
              setPasswordSuccessMsg("");
              setPasswordModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors shadow-2xs cursor-pointer"
          >
            <KeyRound size={13} className="text-scholar-200" />
            <span>Change Password</span>
          </button>

          {students.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Course Dropdown */}
              <select
                value={switcherCourse}
                onChange={(e) => {
                  setSwitcherCourse(e.target.value);
                  setSwitcherBatch("ALL");
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white outline-none cursor-pointer"
                title="Filter by Course"
              >
                <option value="ALL" className="text-ink font-medium">
                  All Courses ({students.length})
                </option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id} className="text-ink font-medium">
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>

              {/* Batch Dropdown */}
              <select
                value={switcherBatch}
                onChange={(e) => setSwitcherBatch(e.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white outline-none cursor-pointer"
                title="Filter by Batch"
              >
                <option value="ALL" className="text-ink font-medium">
                  All Batches
                </option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id} className="text-ink font-medium">
                    {b.name} ({b.count})
                  </option>
                ))}
              </select>

              {/* Student Dropdown */}
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="max-w-[200px] sm:max-w-[240px] truncate rounded-xl border border-marigold-400/50 bg-white/15 px-2.5 py-1.5 text-xs font-bold text-white outline-none cursor-pointer shadow-2xs"
                title="Select Student"
              >
                {filteredStudentsForSwitching.length === 0 ? (
                  <option value="" disabled className="text-ink">
                    No matching students
                  </option>
                ) : (
                  filteredStudentsForSwitching.map((s) => (
                    <option key={s.id} value={s.id} className="text-ink font-medium">
                      {s.name} • {s.batchName} ({s.courseName})
                    </option>
                  ))
                )}
              </select>

              {/* Search & Switch Modal Button */}
              <button
                type="button"
                onClick={() => setSwitcherModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-marigold-400/60 bg-marigold-500/20 px-3 py-1.5 text-xs font-bold text-marigold-300 hover:bg-marigold-500/30 transition-colors shadow-2xs cursor-pointer"
                title="Open Advanced Student Search & Switcher"
              >
                <Search size={13} />
                <span>Search & Switch</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Upload Prompt Banner if photo is missing */}
      {!student.photoUrl && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
              <Camera size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950">
                Passport Photograph Pending
              </h4>
              <p className="text-[11px] text-amber-800 leading-snug">
                Your photograph was not provided during admission. Please upload your passport-size photo for your official <strong>Student Identity Card</strong> and attendance verification.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewPhotoUrl(null);
              setPhotoModalOpen(true);
            }}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-700 transition-colors cursor-pointer shrink-0"
          >
            <Upload size={13} />
            <span>Upload Passport Photo</span>
          </button>
        </div>
      )}

      {/* Portal Navigation Tabs */}
      <div className="flex border-b border-scholar-200 pb-2 overflow-x-auto">
        {[
          { id: "batch", label: "My Allocated Batch", icon: Layers },
          { id: "live-classes", label: "Live Lectures", icon: Video, count: liveClasses.length },
          { id: "certificates", label: "My Certificates", icon: Award, count: student.certificates?.length || 0 },
          { id: "exams", label: "Online CBT Exams", icon: Award, count: exams.length },
          { id: "materials", label: "Study Material & LMS", icon: BookOpen, count: materials.length },
          { id: "assignments", label: "Homework & DPP", icon: CheckSquare, count: assignments.length },
          { id: "fees", label: "Fee Ledger & Pay Online", icon: Wallet },
          { id: "doubts", label: "✨ AI Doubt Assistant", icon: Sparkles },
          { id: "help", label: "Help & Support", icon: HelpCircle },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl mr-2 transition-all shrink-0 ${
              activeTab === t.id
                ? "bg-scholar-600 text-white shadow-xs"
                : "text-scholar-600 hover:bg-scholar-100"
            }`}
          >
            <t.icon size={15} />
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === t.id ? "bg-white/20 text-white" : "bg-scholar-200 text-scholar-800"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: My Allocated Batch (Read-Only) */}
      {activeTab === "batch" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Layers size={18} className="text-scholar-600" />
              My Allocated Batch & Class Schedule
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-scholar-700 bg-scholar-100 border border-scholar-200 px-2 py-0.5 rounded-md">
              <Lock size={11} /> Read-Only View
            </span>
          </div>

          <Card className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-scholar-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">
                  Enrolled Program & Course
                </span>
                <p className="font-display text-lg font-bold text-ink mt-0.5">
                  {student.courseName}
                </p>
                {student.courseDuration && (
                  <p className="text-xs text-scholar-500 flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="text-scholar-400" /> Duration: {student.courseDuration}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-scholar-50 p-3 border border-scholar-200 text-left sm:text-right">
                <span className="text-[11px] text-scholar-500 font-medium">Campus Branch</span>
                <p className="font-bold text-ink text-sm flex items-center gap-1 sm:justify-end">
                  <Building2 size={13} className="text-scholar-500" />
                  {student.batch?.branchName || student.branchName || "Main Campus"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-xl bg-scholar-50/70 p-4 border border-scholar-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">
                  Batch Name
                </span>
                <p className="font-display text-base font-bold text-ink mt-1">
                  {student.batch?.name || student.batchName}
                </p>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 mt-2">
                  Status: {student.batch?.status || "Active (Ongoing)"}
                </span>
              </div>

              <div className="rounded-xl bg-scholar-50/70 p-4 border border-scholar-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">
                  Class Timing (Winter / Standard)
                </span>
                <p className="font-display text-base font-bold text-ink mt-1 flex items-center gap-1.5">
                  <Clock size={16} className="text-scholar-600" />
                  {student.batch?.timing || "7:00 AM - 9:00 AM"}
                </p>
                <p className="text-[11px] text-scholar-500 mt-2">
                  Please report to campus 10 minutes prior to lecture start.
                </p>
              </div>

              <div className="rounded-xl bg-scholar-50/70 p-4 border border-scholar-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">
                  Assigned Faculty
                </span>
                <div className="mt-1 space-y-1">
                  {student.batch?.facultyMembers && student.batch.facultyMembers.length > 0 ? (
                    student.batch.facultyMembers.map((fac, idx) => (
                      <p key={idx} className="text-xs font-semibold text-scholar-800">
                        • {fac}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs font-medium text-scholar-600">
                      Academic Faculty assigned by Branch Administration
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-3 text-xs text-scholar-600 flex items-start gap-2">
              <Lock size={15} className="text-scholar-500 shrink-0 mt-0.5" />
              <span>
                <strong>Notice</strong>: Students can only view their allocated batch and schedule.
                Batch timing adjustments, subject additions, or campus transfers must be requested through your campus administration.
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Live Classes & Online Lectures */}
      {activeTab === "live-classes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Video size={18} className="text-rose-600" />
              Live Online Lectures & Interactive Classes
            </h3>
            <span className="text-xs text-scholar-500">
              Direct access to Zoom / Google Meet / MS Teams interactive classrooms
            </span>
          </div>

          {liveClasses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-scholar-200 p-8 text-center text-xs text-scholar-400">
              No live classes scheduled for your enrolled program at this moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveClasses.map((lc) => {
                const classDate = new Date(lc.scheduledAt);
                const isLive = lc.status === "LIVE";
                const isJoinable = isLive || Date.now() >= classDate.getTime() - 10 * 60 * 1000;

                return (
                  <Card
                    key={lc.id}
                    className={`p-5 flex flex-col justify-between transition-all ${
                      isLive ? "border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/10" : ""
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            isLive
                              ? "bg-rose-500 text-white animate-pulse"
                              : "bg-sky-50 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {isLive && <Radio size={12} />}
                          {isLive ? "LIVE NOW" : "SCHEDULED"}
                        </span>
                        <span className="text-[11px] text-scholar-400 font-medium">
                          {lc.durationMinutes} Minutes
                        </span>
                      </div>

                      <div>
                        {lc.subject && (
                          <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">
                            {lc.subject}
                          </span>
                        )}
                        <h4 className="font-display font-bold text-sm text-ink mt-0.5">
                          {lc.title}
                        </h4>
                        {lc.description && (
                          <p className="text-xs text-scholar-500 mt-1">{lc.description}</p>
                        )}
                      </div>

                      <div className="rounded-xl bg-scholar-50/70 p-3 text-xs space-y-1 border border-scholar-100">
                        <div className="flex items-center gap-1.5 text-scholar-700 font-medium">
                          <Calendar size={13} className="text-scholar-400" />
                          <span>{formatDate(classDate)}</span>
                          <span className="text-scholar-400">&bull;</span>
                          <Clock size={13} className="text-scholar-400" />
                          <span>
                            {classDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {lc.facultyName && (
                          <p className="text-[11px] text-scholar-600">
                            Faculty: <strong>{lc.facultyName}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-scholar-100">
                      {viewerRole === "PARENT" ? (
                        <div className="text-center py-2 px-3 rounded-xl bg-scholar-50 border border-scholar-200 text-scholar-600 text-xs font-medium">
                          Live class scheduled for your child&apos;s batch — join is available only via student login
                        </div>
                      ) : isJoinable ? (
                        <a
                          href={lc.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span>Join Live Class</span>
                        </a>
                      ) : (
                        <div className="text-center py-2 px-3 rounded-xl bg-scholar-100 text-scholar-500 text-xs font-medium">
                          🔒 Join link unlocks 10 mins before class start (
                          {new Date(classDate.getTime() - 10 * 60 * 1000).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          )
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Course Certificates */}
      {activeTab === "certificates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              Official Course Completion & Merit Certificates
            </h3>
            <span className="text-xs text-scholar-500">
              Verified system-issued certificates of achievement
            </span>
          </div>

          {(!student.certificates || student.certificates.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-scholar-200 p-8 text-center text-xs text-scholar-400 space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-scholar-50 text-scholar-400 mb-2">
                <Award size={20} />
              </div>
              <p className="font-semibold text-scholar-600 text-sm">No certificates issued yet</p>
              <p>
                Certificates are issued by the academic administration upon course completion.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {student.certificates.map((cert) => (
                <Card key={cert.id} className="p-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        <Award size={11} /> {cert.title}
                      </span>
                      <span className="text-[11px] text-scholar-400 font-medium">
                        Issued on {formatDate(new Date(cert.issuedAt))}
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-sm text-ink">{cert.templateName}</h4>

                    <p className="text-xs text-scholar-600">
                      Program: <strong>{student.courseName}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-scholar-100 flex items-center justify-between">
                    <span className="text-[11px] text-scholar-400 font-mono">
                      Certificate #{cert.id.slice(-8).toUpperCase()}
                    </span>

                    <a
                      href={`/api/files/${cert.pdfFileAssetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-scholar-700 transition-colors"
                    >
                      <Download size={13} />
                      <span>Download PDF Certificate</span>
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Online CBT Exams */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">
              Computer Based Tests (CBT) & Assessments
            </h3>
            <span className="text-xs text-scholar-500">
              Live timed exams with negative marking & instant scorecards
            </span>
          </div>

          {(() => {
            const studentExams = exams.filter((ex) => !student?.batchId || ex.batchId === student.batchId);
            if (studentExams.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-scholar-200 p-8 text-center text-xs text-scholar-400">
                  No online examinations scheduled for your batch right now.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {studentExams.map((ex) => {
                  const hasAttempted = Boolean(ex.attempt);
                  return (
                    <Card key={ex.id} className="flex flex-col justify-between p-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <Badge tone={hasAttempted ? "success" : "scholar"}>
                            {hasAttempted ? "Attempted" : "Live / Scheduled"}
                          </Badge>
                          <span className="text-[11px] text-scholar-400">
                            {formatDate(ex.testDate)}
                          </span>
                        </div>

                        <h4 className="mt-2 font-display text-base font-bold text-ink">
                          {ex.title}
                        </h4>
                        <p className="text-xs text-scholar-500">
                          {ex.subject || "All Subjects"} • {ex.seriesName || "General Exam"}
                        </p>

                        {ex.startTime && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded bg-scholar-100/70 px-2 py-0.5 text-[11px] font-semibold text-scholar-700">
                            <Clock size={11} className="text-scholar-500" />
                            <span>
                              {(() => {
                                const s = new Date(ex.startTime);
                                if (isNaN(s.getTime())) return null;
                                const sStr = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                                if (!ex.endTime) return `${sStr} onwards`;
                                const e = new Date(ex.endTime);
                                const eStr = !isNaN(e.getTime()) ? e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
                                return eStr ? `${sStr} - ${eStr}` : sStr;
                              })()}
                            </span>
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-scholar-50 p-2.5 text-center text-xs text-scholar-700">
                          <div>
                            <span className="block text-[10px] text-scholar-400">Duration</span>
                            <strong>{ex.durationMinutes || 60} mins</strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-scholar-400">Max Marks</span>
                            <strong>{ex.totalMarks} pts</strong>
                          </div>
                        </div>

                        {hasAttempted && ex.attempt && (
                          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 space-y-1">
                            <p className="font-bold text-sm">
                              {viewerRole === "PARENT" ? "Child's Score" : "Your Score"}: {ex.attempt.score} / {ex.totalMarks}
                            </p>
                            {ex.attempt.rank && (
                              <p className="text-[11px]">Rank: #{ex.attempt.rank}</p>
                            )}
                            {ex.attempt.percentile && (
                              <p className="text-[11px]">Percentile: {ex.attempt.percentile}%</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 border-t border-scholar-100 pt-3">
                        {viewerRole === "PARENT" ? (
                          <div className="text-center py-2 px-3 rounded-xl bg-scholar-50 text-scholar-600 text-xs font-medium border border-scholar-100">
                            {hasAttempted ? (
                              <span className="font-semibold text-emerald-700">Attempted — Score: {ex.attempt?.score} / {ex.totalMarks}</span>
                            ) : (
                              <span>Not yet attempted</span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveExamModal(ex)}
                            className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition-colors ${
                              hasAttempted
                                ? "bg-scholar-700 hover:bg-scholar-800"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            <Play size={13} fill="currentColor" />
                            {hasAttempted ? "Review Answers & Analysis" : "Start Online Exam"}
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 3: Study Material & LMS */}
      {activeTab === "materials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">
              Class Notes, Question Banks & LMS Downloads
            </h3>
            <span className="text-xs text-scholar-500">
              Verified learning materials uploaded by your faculty
            </span>
          </div>

          {materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-scholar-200 p-8 text-center text-xs text-scholar-400">
              No study materials shared for this subject yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {materials.map((m) => (
                <Card key={m.id} className="p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge tone="scholar">{m.subject}</Badge>
                      <span className="text-[10px] text-scholar-400 uppercase font-bold">
                        {m.fileType || "PDF"}
                      </span>
                    </div>

                    <h4 className="mt-2 font-semibold text-ink text-sm line-clamp-1">{m.title}</h4>
                    {m.topic && <p className="text-xs text-scholar-500">Topic: {m.topic}</p>}
                    {m.description && (
                      <p className="mt-1 text-xs text-scholar-400 line-clamp-2">{m.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-scholar-100 flex items-center justify-between">
                    <span className="text-[11px] text-scholar-400">{formatDate(m.createdAt)}</span>
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-scholar-50 px-2.5 py-1 text-xs font-semibold text-scholar-700 hover:bg-scholar-100"
                    >
                      <ExternalLink size={12} /> Open Document
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Homework & DPP */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">
              Daily Practice Problems (DPP) & Homework
            </h3>
            <span className="text-xs text-scholar-500">
              Submit your work digitally and review teacher corrections
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-scholar-200 p-8 text-center text-xs text-scholar-400">
              No active assignments due for your batch.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((asg) => {
                const isSubmitted = Boolean(asg.submission);
                return (
                  <Card key={asg.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge tone={isSubmitted ? "success" : "warn"}>
                          {isSubmitted ? "Submitted" : "Pending Submission"}
                        </Badge>
                        <span className="text-[11px] text-scholar-500">Due: {formatDate(asg.dueDate)}</span>
                      </div>

                      <h4 className="mt-2 font-display text-sm font-bold text-ink">{asg.title}</h4>
                      <p className="text-xs text-scholar-500">
                        {asg.subject} • Max Marks: {asg.totalMarks}
                      </p>

                      {asg.attachmentUrl && (
                        <a
                          href={asg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-scholar-600 hover:underline"
                        >
                          <ExternalLink size={12} /> Download Question Sheet
                        </a>
                      )}

                      {isSubmitted && asg.submission && (
                        <div className="mt-3 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-900 space-y-1">
                          <p className="font-bold">
                            Score: {asg.submission.marksObtained != null ? asg.submission.marksObtained : "Pending Review"} / {asg.totalMarks} pts
                          </p>
                          {asg.submission.feedback && (
                            <p className="text-[11px] italic text-emerald-800">
                              Feedback: {asg.submission.feedback}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Student submit form modal */}
                      {submittingAssignmentId === asg.id && (
                        <div className="mt-3 border-t border-scholar-100 pt-3 space-y-2">
                          <input
                            type="url"
                            placeholder="Paste Google Drive / Dropbox link..."
                            value={submissionUrl}
                            onChange={(e) => setSubmissionUrl(e.target.value)}
                            className="w-full rounded-xl border border-scholar-200 p-2 text-xs outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Optional notes for teacher..."
                            value={submissionNotes}
                            onChange={(e) => setSubmissionNotes(e.target.value)}
                            className="w-full rounded-xl border border-scholar-200 p-2 text-xs outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSubmittingAssignmentId(null)}
                              className="flex-1 rounded-lg border border-scholar-200 py-1.5 text-xs font-semibold text-scholar-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStudentSubmitWork(asg.id)}
                              disabled={isSubmittingWork}
                              className="flex-1 rounded-lg bg-scholar-600 py-1.5 text-xs font-semibold text-white"
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!submittingAssignmentId && (
                      <div className="mt-4 border-t border-scholar-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setSubmittingAssignmentId(asg.id)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-scholar-50 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-100"
                        >
                          <CheckSquare size={13} />
                          {isSubmitted ? "Re-submit Homework" : "Submit Homework Solution"}
                        </button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Fee Ledger & Online Payment */}
      {activeTab === "fees" && (
        <div className="space-y-4">
          {/* Fee Structure Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4 text-center">
              <span className="text-xs font-semibold text-scholar-500">Total Course Fee</span>
              <p className="font-display text-2xl font-bold text-ink mt-1">
                {formatCurrency(student.totalFee)}
              </p>
              <span className="block text-[11px] text-scholar-400 mt-0.5">
                Plan: {student.plan === "INSTALLMENTS" ? "Installments" : student.plan === "QUARTERLY" ? "Quarterly" : "Full Course"}
              </span>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-xs font-semibold text-emerald-700">Total Paid Amount</span>
              <p className="font-display text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(student.paidFee)}
              </p>
              <span className="block text-[11px] text-emerald-600 mt-0.5 font-medium">
                {student.pendingFee === 0 ? "100% Fully Settled" : `${Math.round((student.paidFee / student.totalFee) * 100)}% Cleared`}
              </span>
            </Card>

            <Card className="p-4 text-center">
              <span className="text-xs font-semibold text-rose-700">Outstanding Balance Due</span>
              <p className="font-display text-2xl font-bold text-rose-600 mt-1">
                {formatCurrency(student.pendingFee)}
              </p>
              {student.dueDate && (
                <span className="block text-[11px] text-rose-600 mt-0.5 font-medium">
                  Due by: {formatDate(student.dueDate)}
                </span>
              )}
            </Card>
          </div>

          {/* Online Payment Callout */}
          {student.pendingFee > 0 ? (
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <h4 className="font-display text-base font-bold text-emerald-950 flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-600" />
                  Pay Your Course Fees Online
                </h4>
                <p className="text-xs text-emerald-800">
                  Pay outstanding balance or your next scheduled installment via UPI, Net Banking, or Card with instant verification.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPayAmount(String(student.pendingFee));
                  setPayModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-sm shrink-0"
              >
                <CreditCard size={15} />
                Pay Fee Online Now
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              All course fees are fully settled! No pending installments due.
            </div>
          )}

          {/* Payment Transactions & Receipts */}
          <Card className="p-5">
            <h4 className="font-display text-sm font-bold text-ink mb-3">
              Payment Transactions & Official Receipts
            </h4>

            {student.payments.length === 0 ? (
              <p className="text-xs text-scholar-400 py-4 text-center">
                No payment transactions recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {student.payments.map((p) => {
                  const isRefund = p.amount < 0 || p.isRefund;
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-xs transition-colors ${
                        isRefund
                          ? "border-danger-200 bg-danger-50/40"
                          : "border-scholar-100 bg-scholar-50/40 hover:bg-scholar-50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">
                            {p.installmentTitle || (isRefund ? "Fee Refund Credit" : "Fee Payment")}
                          </span>
                          <span className="rounded-md bg-scholar-100 px-1.5 py-0.5 text-[10px] font-semibold text-scholar-700">
                            {p.method}
                          </span>
                          {isRefund && (
                            <span className="rounded-md bg-danger-100 px-1.5 py-0.5 text-[10px] font-bold text-danger-700">
                              REFUND
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-scholar-400">
                          {formatDate(p.paidAt)}
                          {p.refundReason ? ` • ${p.refundReason}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-0 border-scholar-100">
                        <div className="text-left sm:text-right">
                          <span
                            className={`font-display font-bold text-sm ${
                              isRefund ? "text-danger-700" : "text-emerald-700"
                            }`}
                          >
                            {isRefund ? "-" : "+"}
                            {formatCurrency(Math.abs(p.amount))}
                          </span>
                          <span className="block text-[10px] text-scholar-500 font-medium">
                            {isRefund ? "Refund Recorded" : "Verified ✓"}
                          </span>
                        </div>

                        <a
                          href={`/api/payments/${p.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-50 shadow-2xs transition-colors shrink-0"
                          title="Download Official Tax Receipt (PDF)"
                        >
                          <Download size={12} />
                          <span>PDF Receipt</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Help & Support — role-aware AI + FAQ */}
      {activeTab === "help" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <HelpCircle size={16} className="text-scholar-600" /> Help & Support
              </h3>
              <p className="text-xs text-scholar-500">
                {viewerRole === "PARENT" ? "Help for parents — fees, attendance, live classes, and per-child assignments." : "Help for students — live classes, tests, attendance, and DPP."}
              </p>
            </div>
          </div>
          <SupportChat role={viewerRole} />
          <Card className="p-5">
            <h4 className="font-bold text-sm text-ink mb-2">Contact Platform Admin</h4>
            <p className="text-xs text-scholar-600 mb-3">If the AI couldn’t resolve your issue, submit a support ticket — our team will respond in your portal.</p>
            <a href="/support" className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-700 px-4 py-2 text-xs font-bold text-white hover:bg-scholar-800">Open Support Tickets →</a>
          </Card>
        </div>
      )}

      {/* Tab 6: AI Doubt Solver */}
      {activeTab === "doubts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" /> AI Academic Doubt Assistant
              </h3>
              <p className="text-xs text-scholar-500">
                Get instant step-by-step conceptual breakdowns, formulas, and hints for any homework or exam question.
              </p>
            </div>
          </div>

          <Card className="p-5">
            <form onSubmit={handleSolveDoubt} className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-scholar-700">Subject:</label>
                <select
                  value={doubtSubject}
                  onChange={(e) => setDoubtSubject(e.target.value)}
                  className="rounded-xl border border-scholar-200 bg-white px-3 py-1 text-xs font-medium text-ink outline-none"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                  <option value="General">Other / General</option>
                </select>
              </div>

              <textarea
                rows={3}
                placeholder="Type or paste your math/physics/chemistry question here..."
                value={doubtText}
                onChange={(e) => setDoubtText(e.target.value)}
                className="w-full rounded-xl border border-scholar-200 p-3 text-sm outline-none focus:border-scholar-500"
              />

              <button
                type="submit"
                disabled={solvingDoubt || !doubtText.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50"
              >
                {solvingDoubt ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />}
                {solvingDoubt ? "Analyzing Doubt..." : "Get Step-by-Step Hint"}
              </button>
            </form>

            {doubtSolution && (
              <div className="mt-5 space-y-3 rounded-2xl bg-amber-50/50 p-4 border border-amber-200/80 text-xs">
                <div>
                  <span className="font-bold text-amber-900">Core Physics/Math Concept:</span>
                  <p className="text-scholar-800 mt-0.5">{doubtSolution.coreConcept}</p>
                </div>

                <div>
                  <span className="font-bold text-amber-900">Standard Formula / Law:</span>
                  <p className="font-mono bg-white p-2 rounded-lg border border-amber-200 text-scholar-900 mt-0.5">
                    {doubtSolution.formulaKey}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-amber-900">Step-by-Step Approach:</span>
                  <ol className="list-decimal pl-4 mt-1 space-y-1 text-scholar-800">
                    {doubtSolution.stepByStepApproach.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-lg bg-white/80 p-2.5 border border-amber-200 text-amber-950 font-medium">
                  💡 Pro-Tip: {doubtSolution.proTip}
                </div>
              </div>
            )}
          </Card>
        </div>
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

      {/* Search & Switch Student Modal */}
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
    </div>
  );
}
