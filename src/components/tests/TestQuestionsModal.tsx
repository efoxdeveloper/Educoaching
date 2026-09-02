"use client";

import { useEffect, useState, useCallback } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import type { QuestionItem } from "./QuestionBankDrawer";

type LinkedQuestion = {
  id: string;
  order: number;
  section: string | null;
  question: QuestionItem;
};

export function TestQuestionsModal({
  open,
  onClose,
  testId,
  testTitle,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  testTitle: string;
  onUpdated?: () => void;
}) {
  const [linkedQuestions, setLinkedQuestions] = useState<LinkedQuestion[]>([]);
  const [bankQuestions, setBankQuestions] = useState<QuestionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [linkedRes, bankRes] = await Promise.all([
        fetch(`/api/tests/${testId}/questions`),
        fetch(`/api/questions`),
      ]);

      if (linkedRes.ok) {
        const linkedData = await linkedRes.json();
        setLinkedQuestions(linkedData);
      }
      if (bankRes.ok) {
        const bankData = await bankRes.json();
        setBankQuestions(bankData.questions || []);
      }
    } catch {
      console.error("Failed to load test questions");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    if (open && testId) {
      fetchData();
      setSelectedIds([]);
    }
  }, [open, testId, fetchData]);

  const linkedIds = new Set(linkedQuestions.map((l) => l.question.id));
  const availableQuestions = bankQuestions.filter((q) => !linkedIds.has(q.id));

  const filteredAvailable = availableQuestions.filter(
    (q) =>
      q.questionText.toLowerCase().includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      (q.topic && q.topic.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddQuestions = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tests/${testId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchData();
        if (onUpdated) onUpdated();
      }
    } catch {
      alert("Failed to add questions");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      const res = await fetch(
        `/api/tests/${testId}/questions?questionId=${encodeURIComponent(questionId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        fetchData();
        if (onUpdated) onUpdated();
      }
    } catch {
      alert("Failed to remove question");
    }
  };

  const totalMarks = linkedQuestions.reduce((acc, q) => acc + (q.question.marks || 4), 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Configure Questions: ${testTitle}`}
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col h-full space-y-4">
        {/* Exam stats banner */}
        <div className="flex items-center justify-between rounded-xl bg-scholar-50 p-3 text-xs">
          <div>
            <span className="font-semibold text-scholar-800">
              {linkedQuestions.length} Questions Attached
            </span>
            <span className="text-scholar-500"> • Computed Total Marks: {totalMarks}</span>
          </div>
          <span className="rounded-full bg-scholar-200 px-2.5 py-0.5 font-bold text-scholar-800">
            Online CBT Mode
          </span>
        </div>

        {/* Section 1: Attached Questions */}
        <div className="space-y-2">
          <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider">
            Current Test Paper ({linkedQuestions.length})
          </h4>

          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="animate-spin text-scholar-500" size={20} />
            </div>
          ) : linkedQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-scholar-200 p-4 text-center text-xs text-scholar-400">
              No questions linked yet. Select questions from the Question Bank below to build this exam.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {linkedQuestions.map((lq) => (
                <div
                  key={lq.id}
                  className="flex items-start justify-between rounded-xl border border-scholar-100 bg-white p-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-scholar-700">Q{lq.order}.</span>
                      <span className="font-semibold text-ink">{lq.question.subject}</span>
                      {lq.question.topic && (
                        <span className="text-scholar-500">({lq.question.topic})</span>
                      )}
                      <span className="text-scholar-400">
                        • {lq.question.marks} marks (-{lq.question.negativeMarks})
                      </span>
                    </div>
                    <p className="line-clamp-2 text-scholar-600 font-medium">
                      {lq.question.questionText}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(lq.question.id)}
                    className="p-1 text-scholar-400 hover:text-rose-600"
                    title="Remove from test"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Question Bank Picker */}
        <div className="space-y-2 border-t border-scholar-100 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs font-bold text-ink uppercase tracking-wider">
              Add from Question Bank ({availableQuestions.length} Available)
            </h4>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleAddQuestions}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add {selectedIds.length} Selected
              </button>
            )}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-scholar-400" />
            <input
              type="text"
              placeholder="Search available questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white py-1.5 pl-8 pr-2 text-xs outline-none"
            />
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {filteredAvailable.length === 0 ? (
              <p className="p-4 text-center text-xs text-scholar-400">
                No additional matching questions found in question bank.
              </p>
            ) : (
              filteredAvailable.map((q) => {
                const isSelected = selectedIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleSelect(q.id)}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                        : "border-scholar-100 bg-scholar-50/30 hover:border-scholar-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 h-3.5 w-3.5 text-emerald-600 rounded"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{q.subject}</span>
                        {q.topic && <span className="text-scholar-500">({q.topic})</span>}
                        <span className="text-[10px] rounded bg-scholar-200 px-1 font-bold text-scholar-700">
                          {q.difficulty}
                        </span>
                        <span className="text-scholar-400 font-medium">
                          +{q.marks} / -{q.negativeMarks}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-scholar-600 font-medium">
                        {q.questionText}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
