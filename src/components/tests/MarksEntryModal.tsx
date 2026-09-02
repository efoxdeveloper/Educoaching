"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Save, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type StudentRow = {
  studentId: string;
  studentName: string;
  mobile: string;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks: string | null;
};

type ApiStudent = {
  studentId: string;
  studentName: string;
  mobile: string;
  marksObtained: number | null;
  isAbsent: boolean;
  remarks?: string | null;
};

export function MarksEntryModal({
  open,
  onClose,
  testId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testInfo, setTestInfo] = useState<{
    id: string;
    title: string;
    subject: string | null;
    totalMarks: number;
    passingMarks: number | null;
    batchName: string;
  } | null>(null);

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState("");

  // Load test details and student rows
  useEffect(() => {
    if (!open || !testId) return;

    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    fetch(`/api/tests/${testId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load test details");
        return res.json();
      })
      .then((data) => {
        setTestInfo(data.test);
        const mappedRows: StudentRow[] = (data.students || []).map((s: ApiStudent) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          mobile: s.mobile,
          marksObtained: s.marksObtained,
          isAbsent: s.isAbsent,
          remarks: s.remarks || "",
        }));
        setRows(mappedRows);
      })
      .catch((err) => {
        setError(err.message || "Failed to load test data");
      })
      .finally(() => setLoading(false));
  }, [open, testId]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(term) ||
        r.mobile.includes(term)
    );
  }, [rows, search]);

  const updateRow = (studentId: string, updates: Partial<StudentRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, ...updates } : r))
    );
    setSavedSuccess(false);
  };

  const handleMarksChange = (studentId: string, val: string) => {
    if (val === "") {
      updateRow(studentId, { marksObtained: null });
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      updateRow(studentId, { marksObtained: num });
    }
  };

  const handleAbsentToggle = (studentId: string, currentAbsent: boolean) => {
    const nextAbsent = !currentAbsent;
    updateRow(studentId, {
      isAbsent: nextAbsent,
      marksObtained: nextAbsent ? null : undefined,
    });
  };

  const handleMarkAllPresent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, isAbsent: false })));
  };

  const handleSave = async () => {
    if (!testInfo) return;

    // Validate marks within range
    for (const r of rows) {
      if (!r.isAbsent && r.marksObtained !== null) {
        if (r.marksObtained < 0 || r.marksObtained > testInfo.totalMarks) {
          setError(
            `Invalid marks for ${r.studentName}. Must be between 0 and ${testInfo.totalMarks}.`
          );
          return;
        }
      }
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tests/${testId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: rows.map((r) => ({
            studentId: r.studentId,
            marksObtained: r.marksObtained,
            isAbsent: r.isAbsent,
            remarks: r.remarks,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save marks");
      }

      setSavedSuccess(true);
      onSaved();
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save marks";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const passMark = testInfo ? (testInfo.passingMarks ?? testInfo.totalMarks * 0.35) : 0;
  const totalStudents = rows.length;
  const gradedCount = rows.filter((r) => r.isAbsent || r.marksObtained !== null).length;
  const absentCount = rows.filter((r) => r.isAbsent).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-scholar-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal dialog */}
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-popover">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-scholar-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-lg font-semibold text-ink">
                Marks Entry: {testInfo?.title || "Loading..."}
              </h2>
              {testInfo?.subject && (
                <span className="rounded-full bg-scholar-50 px-2.5 py-0.5 text-xs font-medium text-scholar-600 border border-scholar-200">
                  {testInfo.subject}
                </span>
              )}
            </div>
            {testInfo && (
              <p className="mt-0.5 text-xs text-scholar-400">
                Batch: <span className="font-medium text-scholar-600">{testInfo.batchName}</span> • Total Marks:{" "}
                <span className="font-semibold text-scholar-700">{testInfo.totalMarks}</span>
                {testInfo.passingMarks && (
                  <> • Pass Marks: <span className="font-medium text-scholar-600">{testInfo.passingMarks}</span></>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-scholar-400 transition-colors hover:bg-scholar-50 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-scholar-100 bg-scholar-50/50 px-6 py-3">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400"
            />
            <input
              type="text"
              placeholder="Search student by name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-scholar-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="rounded-lg border border-scholar-200 bg-white px-2.5 py-1.5 font-medium text-scholar-600 hover:bg-scholar-50"
            >
              Mark All Present
            </button>
            <span className="rounded-lg bg-white px-2.5 py-1.5 font-medium text-scholar-600 border border-scholar-200">
              Graded: <strong className="text-ink">{gradedCount}</strong> / {totalStudents}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 rounded-xl bg-danger-50 p-3 text-xs font-medium text-danger-600 border border-danger-500/20">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-scholar-400">
              Loading enrolled students...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-ink">No students enrolled in this batch</p>
              <p className="mt-1 text-xs text-scholar-400">
                Enroll students into this batch first to enter test marks.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-scholar-100 text-scholar-400">
                    <th className="pb-2.5 font-medium">#</th>
                    <th className="pb-2.5 font-medium">Student Name</th>
                    <th className="pb-2.5 text-center font-medium">Absent?</th>
                    <th className="pb-2.5 font-medium">
                      Marks (out of {testInfo?.totalMarks})
                    </th>
                    <th className="pb-2.5 font-medium">Score %</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-scholar-50">
                  {filteredRows.map((row, idx) => {
                    const isAbsent = row.isAbsent;
                    const mark = row.marksObtained;
                    const hasMark = mark !== null && !isAbsent;
                    const pct =
                      hasMark && testInfo
                        ? Math.round(((mark / testInfo.totalMarks) * 100) * 10) / 10
                        : null;
                    const isPassed = hasMark && mark >= passMark;

                    return (
                      <tr
                        key={row.studentId}
                        className={cn(
                          "transition-colors hover:bg-scholar-50/50",
                          isAbsent && "bg-scholar-50/30 opacity-75"
                        )}
                      >
                        <td className="py-2.5 text-scholar-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5">
                          <p className="font-semibold text-ink">{row.studentName}</p>
                          <p className="text-[11px] text-scholar-400">{row.mobile}</p>
                        </td>
                        <td className="py-2.5 text-center">
                          <label className="inline-flex cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isAbsent}
                              onChange={() => handleAbsentToggle(row.studentId, isAbsent)}
                              className="h-4 w-4 rounded border-scholar-300 text-danger-500 focus:ring-danger-400"
                            />
                          </label>
                        </td>
                        <td className="py-2.5">
                          <div className="w-28">
                            <input
                              type="number"
                              min="0"
                              max={testInfo?.totalMarks}
                              step="any"
                              disabled={isAbsent}
                              placeholder={isAbsent ? "ABSENT" : "Enter mark"}
                              value={
                                isAbsent
                                  ? ""
                                  : row.marksObtained !== null && row.marksObtained !== undefined
                                  ? row.marksObtained
                                  : ""
                              }
                              onChange={(e) => handleMarksChange(row.studentId, e.target.value)}
                              className={cn(
                                "w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors",
                                isAbsent
                                  ? "border-scholar-100 bg-scholar-100/50 text-scholar-400 placeholder:text-scholar-400"
                                  : "border-scholar-200 bg-white text-ink focus:border-scholar-500"
                              )}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 font-medium">
                          {isAbsent ? (
                            <span className="text-scholar-300">—</span>
                          ) : pct !== null ? (
                            <span className="font-semibold text-scholar-700">{pct}%</span>
                          ) : (
                            <span className="text-scholar-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          {isAbsent ? (
                            <Badge tone="neutral">Absent</Badge>
                          ) : hasMark ? (
                            <Badge tone={isPassed ? "success" : "danger"}>
                              {isPassed ? "Pass" : "Fail"}
                            </Badge>
                          ) : (
                            <span className="text-scholar-400 text-[11px]">Unrecorded</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <input
                            type="text"
                            placeholder="Optional feedback..."
                            value={row.remarks || ""}
                            onChange={(e) =>
                              updateRow(row.studentId, { remarks: e.target.value })
                            }
                            className="w-full min-w-[150px] rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-scholar-500 text-ink"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-scholar-100 bg-white px-6 py-3.5 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs text-scholar-400">
            {savedSuccess && (
              <span className="flex items-center gap-1 font-medium text-success-600">
                <CheckCircle2 size={16} /> Marks saved successfully!
              </span>
            )}
            {!savedSuccess && (
              <span>
                Total: {totalStudents} • Present: {totalStudents - absentCount} • Absent: {absentCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-scholar-200 px-4 py-2 text-xs font-semibold text-scholar-600 hover:bg-scholar-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-scholar-700 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving Marks..." : "Save Marks"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
