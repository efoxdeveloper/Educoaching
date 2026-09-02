"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Loader2,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Question = {
  id: string;
  order: number;
  section: string | null;
  subject?: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string | null;
  marks: number;
  negativeMarks: number;
  difficulty: string;
  topic: string | null;
};

type AttemptResult = {
  score: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
  percentile: number | null;
  rank: number | null;
  timeSpentSeconds: number;
};

export function OnlineExamModal({
  open,
  onClose,
  testId,
  studentId,
  studentName = "Demo Student",
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  studentId: string;
  studentName?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<{
    id: string;
    title: string;
    subject: string | null;
    durationMinutes: number;
    totalMarks: number;
    negativeMarks: number;
    batchName: string;
  } | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(3600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [completedResult, setCompletedResult] = useState<AttemptResult | null>(null);

  const fetchExam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${testId}/attempt?studentId=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setTestData(data.test);
        setQuestions(data.questions || []);

        if (data.isCompleted && data.attempt) {
          setCompletedResult(data.attempt);
          if (data.attempt.answers) setAnswers(data.attempt.answers);
        } else {
          setSecondsRemaining((data.test.durationMinutes || 60) * 60);
        }
      }
    } catch {
      console.error("Failed to load test attempt");
    } finally {
      setLoading(false);
    }
  }, [testId, studentId]);

  useEffect(() => {
    if (open && testId) {
      setCompletedResult(null);
      setCurrentIndex(0);
      setAnswers({});
      setReviewed({});
      fetchExam();
    }
  }, [open, testId, fetchExam]);

  // Submission handler
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || completedResult) return;
    setIsSubmitting(true);

    const timeSpent = testData
      ? (testData.durationMinutes || 60) * 60 - secondsRemaining
      : 0;

    try {
      const res = await fetch(`/api/tests/${testId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          answers,
          timeSpentSeconds: Math.max(0, timeSpent),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompletedResult(data.attempt);
        // Refresh question list with solutions
        fetchExam();
      }
    } catch {
      alert("Submission error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, completedResult, testData, secondsRemaining, testId, studentId, answers, fetchExam]);

  // Countdown timer
  useEffect(() => {
    if (!open || completedResult || loading || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, completedResult, loading, secondsRemaining, handleSubmit]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optIndex: number) => {
    if (completedResult || !currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: String(optIndex),
    }));
  };

  const handleClearAnswer = () => {
    if (completedResult || !currentQ) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
  };

  const toggleReview = () => {
    if (!currentQ) return;
    setReviewed((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  // Status counts for palette
  const stats = useMemo(() => {
    let answered = 0;
    let marked = 0;
    let unvisited = 0;

    questions.forEach((q) => {
      const hasAnswer = answers[q.id] !== undefined;
      const isMarked = reviewed[q.id];

      if (isMarked) marked++;
      else if (hasAnswer) answered++;
      else unvisited++;
    });

    return { answered, marked, unvisited };
  }, [questions, answers, reviewed]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scholar-900/60 p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-scholar-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-scholar-100 bg-scholar-50 px-6 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-scholar-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                Online CBT Exam
              </span>
              <h3 className="font-display text-base font-bold text-ink">{testData?.title}</h3>
            </div>
            <p className="text-xs text-scholar-500">
              Candidate: <strong className="text-ink">{studentName}</strong> • {testData?.batchName}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {!completedResult && (
              <div
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold shadow-sm ${
                  secondsRemaining < 300
                    ? "bg-rose-50 text-rose-700 animate-pulse border border-rose-200"
                    : "bg-scholar-100 text-scholar-800"
                }`}
              >
                <Clock size={16} />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-200 hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="animate-spin text-scholar-600" size={32} />
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <HelpCircle size={40} className="text-scholar-400 mb-2" />
            <h4 className="font-display text-sm font-bold text-ink">No Questions Attached</h4>
            <p className="text-xs text-scholar-500 max-w-sm mt-1">
              This online exam doesn&apos;t have any questions linked yet. Configure questions from the Question Bank first.
            </p>
          </div>
        ) : completedResult ? (
          /* Detailed Scorecard & Solutions View */
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-scholar-200 bg-scholar-50/50 p-4 text-center">
                <span className="text-xs font-semibold text-scholar-500">Your Final Score</span>
                <p className="mt-1 font-display text-3xl font-bold text-scholar-700">
                  {completedResult.score}{" "}
                  <span className="text-xs font-normal text-scholar-400">/ {testData?.totalMarks}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                <span className="text-xs font-semibold text-emerald-800">Correct Answers</span>
                <p className="mt-1 font-display text-3xl font-bold text-emerald-600">
                  {completedResult.totalCorrect}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-center">
                <span className="text-xs font-semibold text-rose-800">Incorrect Answers</span>
                <p className="mt-1 font-display text-3xl font-bold text-rose-600">
                  {completedResult.totalIncorrect}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-center">
                <span className="text-xs font-semibold text-amber-800">Rank & Percentile</span>
                <p className="mt-1 font-display text-2xl font-bold text-amber-700">
                  #{completedResult.rank || 1}{" "}
                  <span className="text-xs font-normal text-amber-600">
                    ({completedResult.percentile ?? 100}%)
                  </span>
                </p>
              </div>
            </div>

            {/* Questions with Solutions Review */}
            <div className="space-y-4">
              <h4 className="font-display text-sm font-bold text-ink border-b pb-2">
                Detailed Solutions & Step-by-Step Explanations
              </h4>

              {questions.map((q, idx) => {
                const studentAnswer = answers[q.id];
                const isCorrect =
                  studentAnswer !== undefined &&
                  String(studentAnswer).trim() === String(q.correctAnswer).trim();
                const isSkipped = studentAnswer === undefined;

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-4 space-y-3 ${
                      isSkipped
                        ? "border-scholar-200 bg-scholar-50/30"
                        : isCorrect
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-rose-200 bg-rose-50/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-scholar-800">Q{idx + 1}.</span>
                        <span className="text-xs font-semibold text-ink">{q.subject}</span>
                        {q.topic && <span className="text-xs text-scholar-500">• {q.topic}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {isSkipped ? (
                          <span className="rounded bg-scholar-200 px-2 py-0.5 text-[10px] font-bold text-scholar-700">
                            Skipped
                          </span>
                        ) : isCorrect ? (
                          <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 size={11} /> Correct (+{q.marks})
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            <XCircle size={11} /> Incorrect (-{q.negativeMarks})
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-medium text-ink">{q.questionText}</p>

                    {Array.isArray(q.options) && (
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const isStudentPick = String(oIdx) === String(studentAnswer);
                          const isTheCorrectAnswer = String(oIdx) === String(q.correctAnswer);

                          let borderClass = "border-scholar-100 bg-white text-scholar-700";
                          if (isTheCorrectAnswer) {
                            borderClass =
                              "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                          } else if (isStudentPick && !isCorrect) {
                            borderClass = "border-rose-500 bg-rose-50 text-rose-900 font-bold";
                          }

                          return (
                            <div
                              key={oIdx}
                              className={`rounded-xl border px-3 py-2 text-xs flex items-center justify-between ${borderClass}`}
                            >
                              <span>
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </span>
                              {isTheCorrectAnswer && (
                                <span className="text-[10px] text-emerald-700 font-bold">
                                  Correct Choice
                                </span>
                              )}
                              {isStudentPick && !isCorrect && (
                                <span className="text-[10px] text-rose-700 font-bold">
                                  Your Choice
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="rounded-xl border border-scholar-200 bg-white p-3 text-xs text-scholar-700">
                        <strong className="text-ink">Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Live Interactive Exam Interface */
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Active Question Area */}
            <div className="flex flex-1 flex-col justify-between p-6 overflow-y-auto">
              {currentQ && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-scholar-100 pb-2">
                    <span className="font-bold text-xs text-scholar-600">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-scholar-500">
                        Marks: <strong className="text-emerald-700">+{currentQ.marks}</strong> /{" "}
                        <strong className="text-rose-700">-{currentQ.negativeMarks}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={toggleReview}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          reviewed[currentQ.id]
                            ? "bg-amber-100 text-amber-800"
                            : "bg-scholar-100 text-scholar-600 hover:bg-scholar-200"
                        }`}
                      >
                        <Bookmark size={12} />
                        {reviewed[currentQ.id] ? "Marked for Review" : "Mark Review"}
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-ink leading-relaxed whitespace-pre-wrap">
                    {currentQ.questionText}
                  </p>

                  {Array.isArray(currentQ.options) && (
                    <div className="space-y-2.5 pt-2">
                      {currentQ.options.map((opt, idx) => {
                        const isSelected = answers[currentQ.id] === String(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectOption(idx)}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "border-scholar-600 bg-scholar-50 font-bold text-scholar-900 shadow-sm"
                                : "border-scholar-200 bg-white text-scholar-700 hover:border-scholar-400"
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                                isSelected
                                  ? "bg-scholar-600 text-white"
                                  : "bg-scholar-100 text-scholar-600"
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Nav Bar */}
              <div className="flex items-center justify-between border-t border-scholar-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={handleClearAnswer}
                  disabled={answers[currentQ?.id] === undefined}
                  className="flex items-center gap-1 rounded-xl border border-scholar-200 px-3 py-1.5 text-xs font-semibold text-scholar-600 hover:bg-scholar-50 disabled:opacity-30"
                >
                  <RotateCcw size={12} /> Clear Response
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 rounded-xl border border-scholar-200 px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                    }
                    disabled={currentIndex === questions.length - 1}
                    className="flex items-center gap-1 rounded-xl border border-scholar-200 px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Question Palette sidebar */}
            <div className="w-64 border-l border-scholar-100 bg-scholar-50/50 p-4 flex flex-col justify-between">
              <div>
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider mb-3">
                  Question Palette
                </h4>

                {/* Status legend */}
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-scholar-600">{stats.answered} Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-scholar-600">{stats.marked} Review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-scholar-300" />
                    <span className="text-scholar-600">{stats.unvisited} Unanswered</span>
                  </div>
                </div>

                {/* Number Grid */}
                <div className="grid grid-cols-5 gap-1.5 max-h-60 overflow-y-auto pr-1">
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined;
                    const isMarked = reviewed[q.id];
                    const isCurrent = idx === currentIndex;

                    let bgClass = "bg-white border-scholar-200 text-scholar-700";
                    if (isMarked) bgClass = "bg-amber-500 border-amber-600 text-white font-bold";
                    else if (isAnswered)
                      bgClass = "bg-emerald-600 border-emerald-700 text-white font-bold";

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-8 w-8 rounded-lg border text-xs flex items-center justify-center transition-all ${bgClass} ${
                          isCurrent ? "ring-2 ring-scholar-600 ring-offset-1 font-bold" : ""
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Exam Button */}
              <div className="pt-4 border-t border-scholar-200">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(true)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-scholar-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Submit Test Paper
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={async () => {
          setConfirmSubmitOpen(false);
          await handleSubmit();
        }}
        title="Submit Online Exam"
        message={
          <span>
            Are you sure you want to finish and submit your exam paper? Once submitted, you cannot change your answers.
          </span>
        }
        confirmLabel="Yes, Submit Exam"
        cancelLabel="Review Answers"
        tone="warn"
        loading={isSubmitting}
      />
    </div>
  );
}
