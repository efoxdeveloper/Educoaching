"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Loader2,
  GraduationCap,
  Sparkles,
  Phone,
  User,
  Mail,
  AlertCircle,
  Trophy,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ExamDetails = {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
  marksPerQuestion: number;
  questionCount: number;
  batchName: string;
  courseName: string;
  instituteName: string;
  instituteCity: string | null;
  seriesName?: string | null;
};

type Question = {
  id: string;
  order: number;
  section: string | null;
  subject?: string;
  topic?: string | null;
  difficulty?: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string | null;
  marks: number;
  negativeMarks: number;
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

export default function PublicExamPage() {
  const params = useParams();
  const testId = String(params?.id || "");

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration Form State
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Active Exam Session State
  const [examStarted, setExamStarted] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(3600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [completedResult, setCompletedResult] = useState<AttemptResult | null>(null);

  // Fetch initial exam info
  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    fetch(`/api/exam/${testId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Exam not found or link has expired");
        return res.json();
      })
      .then((data) => {
        setExam(data);
        setSecondsRemaining((data.durationMinutes || 60) * 60);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [testId]);

  // Submit test answers
  const handleSubmitExam = useCallback(async () => {
    if (isSubmitting || completedResult) return;
    setIsSubmitting(true);

    const totalSeconds = (exam?.durationMinutes || 60) * 60;
    const timeSpent = Math.max(0, totalSeconds - secondsRemaining);

    try {
      const res = await fetch(`/api/tests/${testId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          answers,
          timeSpentSeconds: timeSpent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompletedResult(data.attempt);

        // Fetch questions with solutions
        const fullRes = await fetch(`/api/tests/${testId}/attempt?studentId=${studentId}`);
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          setQuestions(fullData.questions || []);
        }
      }
    } catch {
      alert("Submission error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, completedResult, exam, secondsRemaining, testId, studentId, answers]);

  // Countdown timer
  useEffect(() => {
    if (!examStarted || completedResult || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [examStarted, completedResult, secondsRemaining, handleSubmitExam]);

  // Handle Credentials submission
  const handleRegisterAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      setRegError("Please enter your name and mobile number");
      return;
    }

    setRegistering(true);
    setRegError(null);

    try {
      const res = await fetch(`/api/exam/${testId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          email: email.trim() || null,
          parentMobile: parentMobile.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register for exam");
      }

      setStudentId(data.studentId);
      setStudentName(data.studentName);

      if (data.isAlreadyCompleted && data.attempt) {
        setCompletedResult(data.attempt);
        setExamStarted(true);
        // Fetch full solutions
        const fullRes = await fetch(`/api/tests/${testId}/attempt?studentId=${data.studentId}`);
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          setQuestions(fullData.questions || []);
          if (data.attempt.answers) setAnswers(data.attempt.answers);
        }
      } else {
        setQuestions(data.questions || []);
        setExamStarted(true);
      }
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Registration error");
    } finally {
      setRegistering(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-scholar-50">
        <Loader2 className="animate-spin text-scholar-600" size={36} />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-scholar-50 p-4 text-center">
        <AlertCircle size={48} className="text-rose-500 mb-3" />
        <h2 className="font-display text-xl font-bold text-ink">Exam Unavailable</h2>
        <p className="mt-1 text-sm text-scholar-500 max-w-md">
          {error || "The exam link you opened is invalid or the test has closed."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-scholar-50 text-ink flex flex-col justify-between">
      {/* Global Institute Brand Header */}
      <header className="border-b border-scholar-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-600 text-white font-bold">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold text-ink leading-none">
                {exam.instituteName}
              </h1>
              <p className="text-[11px] text-scholar-500">Official Online CBT Examination Portal</p>
            </div>
          </div>

          {examStarted && !completedResult && (
            <div
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${
                secondsRemaining < 300
                  ? "bg-rose-50 text-rose-700 animate-pulse border border-rose-200"
                  : "bg-scholar-100 text-scholar-800"
              }`}
            >
              <Clock size={16} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {!examStarted ? (
          /* STEP 1: Landing Page & Student Registration Form */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Left: Test Details & Rules */}
            <div className="md:col-span-7 space-y-4">
              <div className="rounded-2xl border border-scholar-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <Sparkles size={12} /> Online CBT Exam
                  </span>
                  {exam.seriesName && (
                    <span className="rounded-full bg-scholar-100 px-2.5 py-0.5 text-xs font-semibold text-scholar-700">
                      {exam.seriesName}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 font-display text-xl font-bold text-ink sm:text-2xl">
                  {exam.title}
                </h2>
                {exam.subject && (
                  <p className="text-xs text-scholar-500 font-medium mt-0.5">
                    Subject: <strong className="text-ink">{exam.subject}</strong> • {exam.courseName}
                  </p>
                )}

                {exam.description && (
                  <p className="mt-3 text-xs text-scholar-600 leading-relaxed bg-scholar-50 p-3 rounded-xl">
                    {exam.description}
                  </p>
                )}

                {/* Key Spec Badges */}
                <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3">
                    <span className="text-[10px] uppercase font-bold text-scholar-500">Duration</span>
                    <p className="font-display text-base font-bold text-scholar-800 mt-0.5">
                      {exam.durationMinutes} Mins
                    </p>
                  </div>
                  <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3">
                    <span className="text-[10px] uppercase font-bold text-scholar-500">Total Marks</span>
                    <p className="font-display text-base font-bold text-scholar-800 mt-0.5">
                      {exam.totalMarks} Pts
                    </p>
                  </div>
                  <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3">
                    <span className="text-[10px] uppercase font-bold text-scholar-500">Negative Marks</span>
                    <p className="font-display text-base font-bold text-rose-600 mt-0.5">
                      -{exam.negativeMarks} / Error
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 border-t border-scholar-100 pt-4 space-y-2 text-xs text-scholar-600">
                  <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">
                    Important Instructions:
                  </h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Single-choice Multiple Choice Questions (MCQs).</li>
                    <li>Each correct answer awards +{exam.marksPerQuestion} marks.</li>
                    <li>Each incorrect attempt deducts -{exam.negativeMarks} marks.</li>
                    <li>Timer begins immediately upon clicking &quot;Start Online Exam Now&quot;.</li>
                    <li>Your paper will auto-submit automatically when the timer reaches 00:00.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right: Student Credentials Entry */}
            <div className="md:col-span-5">
              <div className="rounded-2xl border border-scholar-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-scholar-600" />
                  <h3 className="font-display text-base font-bold text-ink">
                    Candidate Verification
                  </h3>
                </div>
                <p className="mt-1 text-xs text-scholar-400">
                  Fill in your credentials to start your online examination session.
                </p>

                {regError && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                    {regError}
                  </div>
                )}

                <form onSubmit={handleRegisterAndStart} className="mt-4 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-scholar-700 mb-1">
                      Student Full Name *
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-3 text-scholar-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarthak Gupta"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-scholar-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-scholar-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-scholar-700 mb-1">
                      WhatsApp Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-3 text-scholar-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="w-full rounded-xl border border-scholar-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-scholar-600"
                      />
                    </div>
                    <span className="text-[10px] text-scholar-400 mt-0.5 block">
                      Scorecard & result report will be sent to this WhatsApp number.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-scholar-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-3 text-scholar-400" />
                      <input
                        type="email"
                        placeholder="student@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-scholar-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-scholar-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-scholar-700 mb-1">
                      Parent Contact / WhatsApp (Optional)
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-3 text-scholar-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="Parent mobile number"
                        value={parentMobile}
                        onChange={(e) => setParentMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="w-full rounded-xl border border-scholar-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-scholar-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-scholar-600 py-3 text-xs font-bold text-white shadow-md hover:bg-scholar-700 transition-all disabled:opacity-50"
                  >
                    {registering ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Start Online Exam Now ➔
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : completedResult ? (
          /* STEP 3: Completed Scorecard & Solutions */
          <div className="space-y-6">
            <div className="rounded-2xl border border-scholar-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <Trophy size={24} />
                </div>
                <div>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                    Test Completed
                  </span>
                  <h3 className="font-display text-lg font-bold text-ink">
                    Candidate: {studentName}
                  </h3>
                  <p className="text-xs text-scholar-400">{exam.title}</p>
                </div>
              </div>

              {/* Score grid */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-scholar-100 bg-scholar-50/60 p-3 text-center">
                  <span className="text-[11px] font-semibold text-scholar-500">Your Score</span>
                  <p className="font-display text-2xl font-bold text-scholar-800 mt-1">
                    {completedResult.score} / {exam.totalMarks}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
                  <span className="text-[11px] font-semibold text-emerald-700">Correct Answers</span>
                  <p className="font-display text-2xl font-bold text-emerald-600 mt-1">
                    {completedResult.totalCorrect}
                  </p>
                </div>

                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-center">
                  <span className="text-[11px] font-semibold text-rose-700">Incorrect Answers</span>
                  <p className="font-display text-2xl font-bold text-rose-600 mt-1">
                    {completedResult.totalIncorrect}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-center">
                  <span className="text-[11px] font-semibold text-amber-800">Rank & Percentile</span>
                  <p className="font-display text-xl font-bold text-amber-700 mt-1">
                    #{completedResult.rank || 1}{" "}
                    <span className="text-xs font-normal">({completedResult.percentile ?? 100}%)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Solutions Review */}
            <div className="rounded-2xl border border-scholar-200 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-display text-sm font-bold text-ink border-b border-scholar-100 pb-2">
                Question-by-Question Solutions & Answer Key
              </h4>

              {questions.map((q, idx) => {
                const studentChoice = answers[q.id];
                const isCorrect =
                  studentChoice !== undefined &&
                  String(studentChoice).trim() === String(q.correctAnswer).trim();
                const isSkipped = studentChoice === undefined;

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
                        <span className="text-xs font-semibold text-ink">{q.subject || exam.subject}</span>
                        {q.topic && <span className="text-xs text-scholar-500">• {q.topic}</span>}
                      </div>

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

                    <p className="text-xs font-medium text-ink leading-relaxed">{q.questionText}</p>

                    {Array.isArray(q.options) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const isStudentPick = String(oIdx) === String(studentChoice);
                          const isTheCorrectAnswer = String(oIdx) === String(q.correctAnswer);

                          let borderClass = "border-scholar-200 bg-white text-scholar-700";
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
          /* STEP 2: Live Interactive CBT Exam Room */
          <div className="rounded-2xl border border-scholar-200 bg-white shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[75vh]">
            {/* Left: Active Question Display */}
            <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
              {currentQ ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-scholar-100 pb-2">
                    <span className="font-bold text-xs text-scholar-700">
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
                            className={`flex items-center gap-3 rounded-xl border p-3.5 text-xs cursor-pointer transition-all ${
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
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-scholar-400">
                  No questions available in this test paper.
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
                    className="flex items-center gap-1 rounded-xl border border-scholar-200 px-3.5 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                    }
                    disabled={currentIndex === questions.length - 1}
                    className="flex items-center gap-1 rounded-xl border border-scholar-200 px-3.5 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Question Palette Sidebar */}
            <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-scholar-100 bg-scholar-50/50 p-4 flex flex-col justify-between">
              <div>
                <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Question Palette
                </h4>

                <div className="grid grid-cols-3 gap-1.5 text-[10px] mb-3">
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-scholar-600">{stats.answered} Done</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-scholar-600">{stats.marked} Review</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-scholar-300" />
                    <span className="text-scholar-600">{stats.unvisited} Left</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 max-h-52 overflow-y-auto pr-1">
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

              <div className="pt-4 border-t border-scholar-200 mt-4">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(true)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-scholar-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-scholar-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Submit Exam Paper
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={async () => {
          setConfirmSubmitOpen(false);
          await handleSubmitExam();
        }}
        title="Submit Online Exam"
        message={
          <span>
            Are you sure you want to finish and submit your exam paper? Once submitted, your score and evaluation will be recorded and answers cannot be altered.
          </span>
        }
        confirmLabel="Yes, Submit Exam Paper"
        cancelLabel="Review Answers"
        tone="warn"
        loading={isSubmitting}
      />

      {/* Footer */}
      <footer className="border-t border-scholar-100 bg-white py-3 text-center text-xs text-scholar-400">
        © {new Date().getFullYear()} {exam.instituteName} • Powered by Vidyalaya CBT Assessment Engine
      </footer>
    </div>
  );
}
