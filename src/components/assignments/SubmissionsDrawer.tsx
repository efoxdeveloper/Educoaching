"use client";

import { useEffect, useState, useCallback } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Submission = {
  id: string;
  studentId: string;
  submissionUrl: string | null;
  notes: string | null;
  submittedAt: string;
  status: string;
  marksObtained: number | null;
  feedback: string | null;
  student: { id: string; name: string; mobile: string };
};

export function SubmissionsDrawer({
  open,
  onClose,
  assignmentId,
  assignmentTitle,
  totalMarks,
  onEvaluated,
}: {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  assignmentTitle: string;
  totalMarks: number;
  onEvaluated?: () => void;
}) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingStudentId, setEvaluatingStudentId] = useState<string | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch {
      console.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (open && assignmentId) {
      fetchSubmissions();
    }
  }, [open, assignmentId, fetchSubmissions]);

  const handleSaveGrade = async (studentId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          marksObtained: Number(marks) || 0,
          feedback: feedback.trim() || null,
          isEvaluation: true,
        }),
      });

      if (res.ok) {
        setEvaluatingStudentId(null);
        setMarks("");
        setFeedback("");
        fetchSubmissions();
        if (onEvaluated) onEvaluated();
      }
    } catch {
      alert("Failed to save grade evaluation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Submissions: ${assignmentTitle}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-scholar-50 p-3 text-xs">
          <span className="font-semibold text-scholar-800">
            {submissions.length} Students Submitted • Max Marks: {totalMarks}
          </span>
          <span className="font-bold text-scholar-600">
            {submissions.filter((s) => s.status === "EVALUATED").length} Evaluated
          </span>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-scholar-500" size={24} />
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-scholar-200 p-8 text-center text-xs text-scholar-400">
            No submissions recorded yet for this assignment.
          </div>
        ) : (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-scholar-100 bg-white p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-ink">{s.student.name}</h4>
                    <p className="text-[10px] text-scholar-400">
                      {s.student.mobile} • Submitted: {formatDate(s.submittedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        s.status === "EVALUATED"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.status === "LATE"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {s.status}
                    </span>

                    {s.marksObtained !== null && (
                      <span className="font-display text-xs font-bold text-scholar-700">
                        {s.marksObtained} / {totalMarks}
                      </span>
                    )}
                  </div>
                </div>

                {s.submissionUrl && (
                  <a
                    href={s.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-scholar-600 hover:underline"
                  >
                    <ExternalLink size={12} /> View Uploaded Work / Solution
                  </a>
                )}

                {s.notes && (
                  <p className="text-xs text-scholar-600 bg-scholar-50/70 p-2 rounded-lg italic">
                    &quot;{s.notes}&quot;
                  </p>
                )}

                {s.feedback && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg font-medium">
                    Faculty Remarks: {s.feedback}
                  </p>
                )}

                {/* Grading Panel */}
                {evaluatingStudentId === s.studentId ? (
                  <div className="mt-2 border-t border-scholar-100 pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label={`Marks (out of ${totalMarks}) *`}>
                        <input
                          type="number"
                          max={totalMarks}
                          min="0"
                          value={marks}
                          onChange={(e) => setMarks(e.target.value)}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Remarks & Feedback">
                        <input
                          type="text"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="e.g. Excellent work on step 4"
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEvaluatingStudentId(null)}
                        className="flex-1 rounded-lg border border-scholar-200 py-1.5 text-xs font-semibold text-scholar-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveGrade(s.studentId)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-scholar-600 py-1.5 text-xs font-semibold text-white hover:bg-scholar-700"
                      >
                        {saving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        Save Grade
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEvaluatingStudentId(s.studentId);
                      setMarks(s.marksObtained?.toString() || "");
                      setFeedback(s.feedback || "");
                    }}
                    className="text-xs font-semibold text-scholar-600 hover:text-scholar-900 underline"
                  >
                    {s.status === "EVALUATED" ? "Update Marks / Feedback" : "Grade Submission"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
