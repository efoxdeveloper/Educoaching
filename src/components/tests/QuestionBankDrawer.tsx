"use client";

import { useEffect, useState, useCallback } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { Plus, Trash2, CheckCircle2, Search, Loader2, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AiQuestionGeneratorModal } from "./AiQuestionGeneratorModal";

export type QuestionItem = {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  type: string;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation: string | null;
  marks: number;
  negativeMarks: number;
};

export function QuestionBankDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  // Create form state
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>([
    "Option A",
    "Option B",
    "Option C",
    "Option D",
  ]);
  const [correctAnswer, setCorrectAnswer] = useState("0");
  const [explanation, setExplanation] = useState("");
  const [marks, setMarks] = useState("4");
  const [negativeMarks, setNegativeMarks] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<QuestionItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (subjectFilter) params.set("subject", subjectFilter);
      if (difficultyFilter) params.set("difficulty", difficultyFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch {
      console.error("Failed to fetch questions");
    } finally {
      setLoading(false);
    }
  }, [subjectFilter, difficultyFilter, search]);

  useEffect(() => {
    if (open) {
      fetchQuestions();
    }
  }, [open, fetchQuestions]);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setFormError("Question text is required");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          topic: topic.trim() || null,
          difficulty,
          type: "MCQ_SINGLE",
          questionText: questionText.trim(),
          options,
          correctAnswer,
          explanation: explanation.trim() || null,
          marks: Number(marks) || 4,
          negativeMarks: Number(negativeMarks) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create question");
      }

      // Reset form & reload
      setQuestionText("");
      setTopic("");
      setExplanation("");
      setTab("list");
      fetchQuestions();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error saving question");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/questions/${questionToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setQuestionToDelete(null);
        fetchQuestions();
      }
    } catch {
      console.error("Failed to delete question");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Institute Question Bank" maxWidth="max-w-2xl">
      <div className="flex flex-col h-full space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-scholar-100 pb-2">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === "list"
                  ? "bg-scholar-600 text-white shadow-sm"
                  : "text-scholar-600 hover:bg-scholar-50"
              }`}
            >
              Question Repository ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("create")}
              className={`flex items-center gap-1.5 ml-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === "create"
                  ? "bg-scholar-600 text-white shadow-sm"
                  : "text-scholar-600 hover:bg-scholar-50"
              }`}
            >
              <Plus size={14} /> Add New Question
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-scholar-200 bg-scholar-50 px-3 py-1.5 text-xs font-bold text-scholar-800 hover:bg-scholar-100 transition-colors shadow-xs"
          >
            <Sparkles size={13} className="text-amber-500" /> AI Generator
          </button>
        </div>

        {tab === "list" ? (
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-scholar-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-scholar-200 bg-white py-1.5 pl-8 pr-2 text-xs outline-none"
                />
              </div>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="rounded-xl border border-scholar-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none"
              >
                <option value="">All Subjects</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
                <option value="English">English</option>
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="rounded-xl border border-scholar-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            {/* Questions List */}
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="animate-spin text-scholar-500" size={24} />
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-scholar-200 p-8 text-center text-xs text-scholar-400">
                No questions found. Click &quot;Add New Question&quot; to populate your bank.
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-scholar-100 bg-scholar-50/40 p-4 space-y-2 hover:border-scholar-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-scholar-200 text-[10px] font-bold text-scholar-800">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-ink">{q.subject}</span>
                        {q.topic && (
                          <span className="text-[11px] text-scholar-500">• {q.topic}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            q.difficulty === "HARD"
                              ? "bg-rose-100 text-rose-800"
                              : q.difficulty === "MEDIUM"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-[11px] font-semibold text-scholar-600">
                          +{q.marks} / -{q.negativeMarks}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuestionToDelete(q)}
                          className="rounded p-1 text-scholar-400 hover:text-rose-600 transition"
                          title="Delete Question"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-ink font-medium whitespace-pre-wrap">
                      {q.questionText}
                    </p>

                    {Array.isArray(q.options) && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = String(oIdx) === String(q.correctAnswer);
                          return (
                            <div
                              key={oIdx}
                              className={`rounded-lg border px-2.5 py-1.5 text-[11px] flex items-center justify-between ${
                                isCorrect
                                  ? "border-emerald-500 bg-emerald-50/80 font-bold text-emerald-900"
                                  : "border-scholar-100 bg-white text-scholar-700"
                              }`}
                            >
                              <span>
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </span>
                              {isCorrect && (
                                <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <p className="text-[10px] text-scholar-500 italic bg-white p-2 rounded-lg border border-scholar-100">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateQuestion} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {formError && (
              <div className="rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Subject *">
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Physics"
                  className={inputClass}
                />
              </Field>

              <Field label="Topic / Chapter">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Laws of Motion"
                  className={inputClass}
                />
              </Field>

              <Field label="Difficulty">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={inputClass}
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </Field>
            </div>

            <Field label="Question Text *">
              <textarea
                required
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Type question description, formula, or problem statement..."
                className={inputClass}
              />
            </Field>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-scholar-700">
                Multiple Choice Options (4 Choices) *
              </label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-scholar-100 text-xs font-bold text-scholar-700">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <input
                    required
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[idx] = e.target.value;
                      setOptions(next);
                    }}
                    className={inputClass}
                  />
                  <input
                    type="radio"
                    name="correctOption"
                    checked={String(correctAnswer) === String(idx)}
                    onChange={() => setCorrectAnswer(String(idx))}
                    title="Mark as correct answer"
                    className="h-4 w-4 text-emerald-600"
                  />
                  <span className="text-[11px] text-scholar-500">Correct</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-scholar-100 pt-3">
              <Field label="Marks for Correct (+)">
                <input
                  type="number"
                  min="1"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Negative Penalty (-)">
                <input
                  type="number"
                  min="0"
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Explanation / Solution Steps (Optional)">
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain why the correct answer is right..."
                className={inputClass}
              />
            </Field>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTab("list")}
                className="flex-1 rounded-xl border border-scholar-200 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
              >
                Back to Repository
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-scholar-600 py-2 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save Question
              </button>
            </div>
          </form>
        )}
      </div>

      {/* AI Question Generator Modal */}
      <AiQuestionGeneratorModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onQuestionsGenerated={() => {
          fetchQuestions();
        }}
      />

      <ConfirmDialog
        open={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={confirmDeleteQuestion}
        title="Delete Question"
        message={
          questionToDelete ? (
            <span>
              Are you sure you want to delete this {questionToDelete.difficulty} question for{" "}
              <strong>{questionToDelete.subject}</strong>?
            </span>
          ) : null
        }
        confirmLabel="Delete Question"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </Drawer>
  );
}
