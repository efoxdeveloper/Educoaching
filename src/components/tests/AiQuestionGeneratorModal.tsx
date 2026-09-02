"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import type { QuestionItem } from "./QuestionBankDrawer";

export function AiQuestionGeneratorModal({
  open,
  onClose,
  onQuestionsGenerated,
}: {
  open: boolean;
  onClose: () => void;
  onQuestionsGenerated: () => void;
}) {
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("Laws of Motion & Friction");
  const [examLevel, setExamLevel] = useState("JEE Main");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [count, setCount] = useState("3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<QuestionItem[] | null>(null);

  const quickTopics: Record<string, string[]> = {
    Physics: ["Kinematics & Projectile", "Laws of Motion & Friction", "Electrostatics & Gauss Law", "Ray & Wave Optics"],
    Chemistry: ["Chemical Bonding & Hybridization", "Chemical Equilibrium", "Hydrocarbons & Reaction Mechanisms"],
    Mathematics: ["Differential Calculus & Limits", "Definite Integrals", "Vectors & 3D Geometry", "Matrices & Determinants"],
    Biology: ["Cell Biology & Mitochondria", "Human Physiology & Neural Control", "Genetics & DNA Replication"],
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !topic.trim()) {
      setError("Please fill in subject and topic.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedResult(null);

    try {
      const res = await fetch("/api/questions/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          topic: topic.trim(),
          examLevel,
          difficulty,
          count: Number(count) || 3,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate questions");
      }

      setGeneratedResult(data.questions || []);
      onQuestionsGenerated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error during AI generation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="AI Question Bank Generator (Faculty Copilot)"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/70 p-3.5 text-xs text-scholar-800">
          <p className="font-semibold flex items-center gap-1.5 text-scholar-900">
            <Sparkles size={14} className="text-scholar-600" /> Syllabus-Aligned Question Synthesis
          </p>
          <p className="mt-1 text-scholar-600">
            Automatically create authentic Multiple Choice Questions with 4 plausible options, designated correct keys, and step-by-step mathematical explanations.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject *">
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  const suggestions = quickTopics[e.target.value];
                  if (suggestions && suggestions[0]) setTopic(suggestions[0]);
                }}
                className={inputClass}
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>
            </Field>

            <Field label="Target Exam Level">
              <select
                value={examLevel}
                onChange={(e) => setExamLevel(e.target.value)}
                className={inputClass}
              >
                <option value="JEE Main">JEE Main</option>
                <option value="JEE Advanced">JEE Advanced</option>
                <option value="NEET UG">NEET UG</option>
                <option value="CBSE Class 12">CBSE Class 12 Board</option>
                <option value="Foundation">Class 9-10 Foundation</option>
              </select>
            </Field>
          </div>

          <Field label="Topic / Chapter *">
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Laws of Motion, Electrostatics..."
              className={inputClass}
            />
          </Field>

          {/* Quick topic suggestion chips */}
          {quickTopics[subject] && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-[10px] font-semibold text-scholar-500 mr-1 self-center">
                Suggestions:
              </span>
              {quickTopics[subject].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`rounded-lg px-2 py-0.5 text-[11px] border transition-all ${
                    topic === t
                      ? "bg-scholar-600 text-white border-scholar-600"
                      : "bg-white text-scholar-600 border-scholar-200 hover:bg-scholar-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Difficulty Level">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                className={inputClass}
              >
                <option value="EASY">Easy (Conceptual / Direct Formula)</option>
                <option value="MEDIUM">Medium (Standard JEE / NEET)</option>
                <option value="HARD">Hard (Multi-Concept / Tricky)</option>
              </select>
            </Field>

            <Field label="Number of Questions">
              <select
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className={inputClass}
              >
                <option value="3">3 Questions</option>
                <option value="5">5 Questions</option>
                <option value="10">10 Questions</option>
              </select>
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-scholar-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-scholar-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} className="text-amber-300" />
            )}
            {loading ? "Synthesizing Questions with AI..." : "Generate & Save to Question Bank"}
          </button>
        </form>

        {/* Results Preview */}
        {generatedResult && (
          <div className="border-t border-scholar-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-2.5 rounded-xl text-xs font-bold">
              <CheckCircle2 size={16} />
              <span>{generatedResult.length} questions successfully created and added to Question Bank!</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {generatedResult.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="rounded-xl border border-scholar-200 bg-white p-3 text-xs space-y-1.5"
                >
                  <p className="font-semibold text-ink">
                    Q{idx + 1}. {q.questionText}
                  </p>
                  <p className="text-[11px] text-scholar-500">
                    Options: {Array.isArray(q.options) ? q.options.join(" • ") : ""}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    Solution: {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
