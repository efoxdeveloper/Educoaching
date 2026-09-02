"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Calendar,
  Award,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  TrendingUp,
  BarChart3,
  BookOpen,
  Play,
  Trophy,
  Layers,
  Clock,
  Sparkles,
  Share2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateTestDrawer } from "./CreateTestDrawer";
import { MarksEntryModal } from "./MarksEntryModal";
import { TestResultsView } from "./TestResultsView";
import { QuestionBankDrawer } from "./QuestionBankDrawer";
import { TestQuestionsModal } from "./TestQuestionsModal";
import { OnlineExamModal } from "./OnlineExamModal";
import { AdvancedAnalyticsModal } from "./AdvancedAnalyticsModal";
import { ShareWhatsAppModal } from "./ShareWhatsAppModal";
import { cn } from "@/lib/utils";

type Batch = {
  id: string;
  name: string;
  course: { id?: string; name: string };
};

type Course = {
  id: string;
  name: string;
};

export type TestSummary = {
  id: string;
  title: string;
  subject: string | null;
  testDate: string;
  totalMarks: number;
  passingMarks: number | null;
  description: string | null;
  batchId: string;
  batchName: string;
  courseName: string;
  totalStudents: number;
  evaluatedCount: number;
  presentCount: number;
  absentCount: number;
  highestScore: number | null;
  averageScore: number | null;
  passedCount: number;
  passPercentage: number | null;
  isOnline?: boolean;
  durationMinutes?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  negativeMarks?: number | null;
  marksPerQuestion?: number | null;
  seriesName?: string | null;
  createdAt: string;
};

export function formatTestSchedule(start?: string | null, end?: string | null): string | null {
  if (!start) return null;
  const sDate = new Date(start);
  if (isNaN(sDate.getTime())) return null;

  const startFormatted = sDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (!end) return `${startFormatted} onwards`;

  const eDate = new Date(end);
  if (isNaN(eDate.getTime())) return startFormatted;

  const endFormatted = eDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${startFormatted} - ${endFormatted}`;
}

export function TestsView({
  batches,
  courses: passedCourses,
  initialTests,
}: {
  batches: Batch[];
  courses?: Course[];
  initialTests: TestSummary[];
}) {
  const [tests, setTests] = useState<TestSummary[]>(initialTests);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [questionBankOpen, setQuestionBankOpen] = useState(false);
  const [questionsModalTest, setQuestionsModalTest] = useState<{ id: string; title: string } | null>(null);
  const [examModalTest, setExamModalTest] = useState<{ id: string; title: string } | null>(null);
  const [analyticsModalTest, setAnalyticsModalTest] = useState<{ id: string; title: string } | null>(null);
  const [shareWhatsAppTest, setShareWhatsAppTest] = useState<TestSummary | null>(null);
  const [testToDelete, setTestToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const availableFilterBatches = useMemo(() => {
    if (selectedCourseId === "ALL") return batches;
    return batches.filter(
      (b) => b.course?.id === selectedCourseId || b.course?.name === selectedCourseId
    );
  }, [batches, selectedCourseId]);

  // Active view: either list or single test result report
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  // Quick marks entry modal
  const [entryModalTestId, setEntryModalTestId] = useState<string | null>(null);

  const refreshTests = async () => {
    try {
      const res = await fetch("/api/tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      }
    } catch (err) {
      console.error("Failed to refresh tests:", err);
    }
  };

  const confirmDeleteTest = async () => {
    if (!testToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/tests/${testToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t.id !== testToDelete.id));
        if (activeTestId === testToDelete.id) {
          setActiveTestId(null);
        }
        setTestToDelete(null);
      }
    } catch (err) {
      console.error("Error deleting test:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // If viewing a specific test report
  if (activeTestId) {
    return (
      <TestResultsView
        testId={activeTestId}
        onBack={() => {
          setActiveTestId(null);
          refreshTests();
        }}
      />
    );
  }

  // Filtered list
  const filteredTests = tests.filter((t) => {
    if (selectedCourseId !== "ALL") {
      const b = batches.find((batch) => batch.id === t.batchId);
      if (
        b &&
        b.course?.id !== selectedCourseId &&
        b.course?.name !== selectedCourseId &&
        t.courseName !== selectedCourseId
      ) {
        return false;
      }
    }
    if (selectedBatchId !== "ALL" && t.batchId !== selectedBatchId) return false;
    if (typeFilter === "ONLINE" && !t.isOnline) return false;
    if (typeFilter === "OFFLINE" && t.isOnline) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(term);
      const matchSubject = t.subject?.toLowerCase().includes(term) ?? false;
      const matchBatch = t.batchName.toLowerCase().includes(term);
      const matchCourse = t.courseName.toLowerCase().includes(term);
      const matchSeries = t.seriesName?.toLowerCase().includes(term) ?? false;
      if (!matchTitle && !matchSubject && !matchBatch && !matchCourse && !matchSeries) return false;
    }
    return true;
  });

  // Calculate high-level stats
  const totalTestsCount = tests.length;
  const gradedTestsCount = tests.filter((t) => t.evaluatedCount > 0).length;
  const totalEvaluationsCount = tests.reduce((acc, t) => acc + t.evaluatedCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Tests & Assessments</h1>
          <p className="mt-0.5 text-xs text-scholar-400">
            Create tests, enter student marks, generate ranks, and track batch performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuestionBankOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-semibold text-scholar-700 shadow-xs hover:bg-scholar-50 transition-colors"
          >
            <BookOpen size={15} className="text-scholar-600" />
            Question Bank
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-scholar-700"
          >
            <Plus size={16} /> Create Test / CBT Exam
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-scholar-400">Total Tests</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-50 text-scholar-600">
              <Award size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{totalTestsCount}</p>
          <p className="mt-1 text-[11px] text-scholar-400">Across all batches and subjects</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-scholar-400">Evaluated Tests</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50 text-success-600">
              <CheckCircle size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-success-600">
            {gradedTestsCount}{" "}
            <span className="text-xs font-normal text-scholar-400">/ {totalTestsCount}</span>
          </p>
          <p className="mt-1 text-[11px] text-scholar-400">With student marks entered</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-scholar-400">Total Marks Records</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-marigold-50 text-marigold-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{totalEvaluationsCount}</p>
          <p className="mt-1 text-[11px] text-scholar-400">Student evaluations completed</p>
        </Card>
      </div>

      {/* Filter and Search Bar with Type Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter Tabs */}
          <div className="flex rounded-xl bg-scholar-100/70 p-1">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                typeFilter === "ALL"
                  ? "bg-white text-ink shadow-xs"
                  : "text-scholar-600 hover:text-ink"
              }`}
            >
              All ({tests.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("ONLINE")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                typeFilter === "ONLINE"
                  ? "bg-white text-ink shadow-xs"
                  : "text-scholar-600 hover:text-ink"
              }`}
            >
              Online CBT ({tests.filter((t) => t.isOnline).length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("OFFLINE")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                typeFilter === "OFFLINE"
                  ? "bg-white text-ink shadow-xs"
                  : "text-scholar-600 hover:text-ink"
              }`}
            >
              Offline Records ({tests.filter((t) => !t.isOnline).length})
            </button>
          </div>

          {/* Course Selector */}
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSelectedBatchId("ALL");
            }}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-scholar-500 cursor-pointer"
          >
            <option value="ALL">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Batch Selector */}
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-scholar-500 cursor-pointer"
          >
            <option value="ALL">All Batches</option>
            {availableFilterBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.course.name})
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400"
            />
            <input
              type="text"
              placeholder="Search tests, series, subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-scholar-500"
            />
          </div>
        </div>

        <span className="text-xs font-medium text-scholar-400">
          Showing {filteredTests.length} tests
        </span>
      </div>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <div className="rounded-2xl border border-scholar-100 bg-white p-12 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-scholar-50 text-scholar-600">
            <Award size={24} />
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-ink">No Tests Found</h3>
          <p className="mt-1 text-xs text-scholar-400 max-w-sm mx-auto">
            {search || selectedBatchId !== "ALL"
              ? "No tests match your current search or batch filter."
              : "Get started by creating your first test for any batch."}
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700"
          >
            <Plus size={14} /> Create Test
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTests.map((test) => {
            const hasMarks = test.evaluatedCount > 0;
            const isFullyGraded =
              test.totalStudents > 0 && test.evaluatedCount >= test.totalStudents;

            return (
              <Card
                key={test.id}
                className="flex flex-col justify-between p-5 transition-shadow hover:shadow-popover"
              >
                <div>
                  {/* Top line with subject & batch */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {test.isOnline ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                          <Sparkles size={11} /> Online CBT
                        </span>
                      ) : (
                        <span className="rounded-full bg-scholar-100 px-2 py-0.5 text-[10px] font-bold text-scholar-700">
                          Offline Exam
                        </span>
                      )}
                      {test.seriesName && (
                        <span className="rounded-full bg-scholar-50 px-2 py-0.5 text-[10px] font-semibold text-scholar-600 border border-scholar-200">
                          {test.seriesName}
                        </span>
                      )}
                      {test.subject ? (
                        <Badge tone="marigold">{test.subject}</Badge>
                      ) : (
                        <Badge tone="neutral">General</Badge>
                      )}
                      <span className="rounded-full bg-scholar-50 px-2 py-0.5 text-[11px] font-medium text-scholar-600 border border-scholar-100">
                        {test.batchName}
                      </span>
                    </div>

                    <button
                      onClick={() => setTestToDelete({ id: test.id, title: test.title })}
                      className="rounded-lg p-1 text-scholar-300 transition-colors hover:bg-danger-50 hover:text-danger-600"
                      title="Delete Test"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-3 font-display text-base font-bold text-ink hover:text-scholar-600">
                    {test.title}
                  </h3>
                  {test.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-scholar-400">
                      {test.description}
                    </p>
                  )}

                  {/* Meta details (Date & Marks) */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-y-2 border-y border-scholar-50 py-2.5 text-xs text-scholar-500">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-scholar-400" />
                        <span>
                          {new Date(test.testDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Display test timing if configured e.g. 9:00 AM - 11:00 AM */}
                      {formatTestSchedule(test.startTime, test.endTime) && (
                        <span className="inline-flex items-center gap-1 rounded bg-scholar-100/70 px-1.5 py-0.5 text-[11px] font-semibold text-scholar-700">
                          <Clock size={11} className="text-scholar-500" />
                          {formatTestSchedule(test.startTime, test.endTime)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {test.durationMinutes && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-scholar-600 bg-scholar-50 px-1.5 py-0.5 rounded border border-scholar-100">
                          <Clock size={11} /> {test.durationMinutes}m
                        </span>
                      )}
                      <div className="font-medium">
                        Total: <strong className="text-ink">{test.totalMarks}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Progress / Status */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-scholar-500">
                        {test.isOnline ? "Online Attempts:" : "Evaluated:"}
                      </span>
                      <span className="font-semibold text-ink">
                        {test.evaluatedCount} / {test.totalStudents} students
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-scholar-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isFullyGraded
                            ? "bg-success-500"
                            : hasMarks
                            ? "bg-marigold-500"
                            : "bg-scholar-200"
                        )}
                        style={{
                          width: `${
                            test.totalStudents > 0
                              ? Math.min(
                                  Math.round((test.evaluatedCount / test.totalStudents) * 100),
                                  100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Performance stats if available */}
                  {hasMarks && (
                    <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-scholar-50/70 p-2 text-center text-[11px] border border-scholar-100">
                      <div>
                        <p className="text-scholar-400">Avg</p>
                        <p className="font-bold text-ink">
                          {test.averageScore !== null ? `${test.averageScore}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-scholar-400">Top</p>
                        <p className="font-bold text-marigold-600">
                          {test.highestScore !== null ? `${test.highestScore}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-scholar-400">Pass</p>
                        <p className="font-bold text-success-600">
                          {test.passPercentage !== null ? `${test.passPercentage}%` : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 space-y-2 border-t border-scholar-100 pt-3">
                  {test.isOnline ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuestionsModalTest({ id: test.id, title: test.title })}
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-scholar-200 bg-white py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
                        >
                          <Layers size={13} /> Questions
                        </button>
                        <button
                          type="button"
                          onClick={() => setExamModalTest({ id: test.id, title: test.title })}
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                        >
                          <Play size={13} /> Attempt CBT
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setAnalyticsModalTest({ id: test.id, title: test.title })
                          }
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-scholar-600 py-1.5 text-xs font-semibold text-white hover:bg-scholar-700"
                        >
                          <Trophy size={13} /> Analytics & Rank
                        </button>
                        <button
                          type="button"
                          onClick={() => setEntryModalTestId(test.id)}
                          className="rounded-xl border border-scholar-200 px-2.5 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
                          title="Enter manual scores"
                        >
                          <FileSpreadsheet size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShareWhatsAppTest(test)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
                        >
                          <Share2 size={13} className="text-emerald-700" /> Share on WhatsApp
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEntryModalTestId(test.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-scholar-200 bg-white py-2 text-xs font-semibold text-scholar-700 transition-colors hover:bg-scholar-50"
                      >
                        <FileSpreadsheet size={14} /> Enter Marks
                      </button>

                      <button
                        onClick={() => setActiveTestId(test.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-scholar-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-scholar-700"
                      >
                        <BarChart3 size={14} /> Results & Rank
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Test Drawer */}
      <CreateTestDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        batches={batches}
        courses={courses}
        onSuccess={() => {
          refreshTests();
        }}
      />

      {/* Question Bank Drawer */}
      <QuestionBankDrawer
        open={questionBankOpen}
        onClose={() => setQuestionBankOpen(false)}
      />

      {/* Configure Questions Modal */}
      {questionsModalTest && (
        <TestQuestionsModal
          open={Boolean(questionsModalTest)}
          onClose={() => setQuestionsModalTest(null)}
          testId={questionsModalTest.id}
          testTitle={questionsModalTest.title}
          onUpdated={refreshTests}
        />
      )}

      {/* Live Online Exam Simulator */}
      {examModalTest && (
        <OnlineExamModal
          open={Boolean(examModalTest)}
          onClose={() => {
            setExamModalTest(null);
            refreshTests();
          }}
          testId={examModalTest.id}
          studentId="demo-candidate-1"
          studentName="Candidate Preview"
        />
      )}

      {/* Advanced Results & Analytics Modal */}
      {analyticsModalTest && (
        <AdvancedAnalyticsModal
          open={Boolean(analyticsModalTest)}
          onClose={() => setAnalyticsModalTest(null)}
          testId={analyticsModalTest.id}
          testTitle={analyticsModalTest.title}
        />
      )}

      {/* WhatsApp Exam Share Modal */}
      {shareWhatsAppTest && (
        <ShareWhatsAppModal
          open={Boolean(shareWhatsAppTest)}
          onClose={() => setShareWhatsAppTest(null)}
          test={shareWhatsAppTest}
        />
      )}

      {/* Marks Entry Modal */}
      {entryModalTestId && (
        <MarksEntryModal
          open={Boolean(entryModalTestId)}
          onClose={() => setEntryModalTestId(null)}
          testId={entryModalTestId}
          onSaved={() => {
            refreshTests();
          }}
        />
      )}

      <ConfirmDialog
        open={!!testToDelete}
        onClose={() => setTestToDelete(null)}
        onConfirm={confirmDeleteTest}
        title="Delete Test & Exam Record"
        message={
          testToDelete ? (
            <span>
              Are you sure you want to delete <strong>&ldquo;{testToDelete.title}&rdquo;</strong>?
              All student marks, CBT answer sheets, rankings, and question associations for this test will also be permanently deleted.
            </span>
          ) : null
        }
        confirmLabel="Delete Test"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
