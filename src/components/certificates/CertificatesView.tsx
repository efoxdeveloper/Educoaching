"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Plus,
  Search,
  CheckSquare,
  Square,
  Download,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TemplateEditorDrawer, type CertificateTemplateData } from "./TemplateEditorDrawer";
import { formatDate } from "@/lib/utils";

export type EligibleStudent = {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  courseId: string;
  courseName: string;
  batchId?: string | null;
  batchName: string;
  courseEndDate: string | null;
  admissionDate: string;
  hasCertificate: boolean;
  certificateId?: string | null;
  pdfFileAssetId?: string | null;
};

export function CertificatesView({
  initialTemplates,
  courses,
  batches,
}: {
  initialTemplates: Array<CertificateTemplateData & { id: string; _count?: { issuedCertificates: number } }>;
  courses: { id: string; name: string }[];
  batches: { id: string; name: string; courseId: string }[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"issue" | "templates">("issue");

  // Template state
  const templates = initialTemplates;
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplateData | null>(null);

  // Filter state
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [query, setQuery] = useState("");

  // Eligible students state
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<Array<{
    studentId: string;
    studentName: string;
    downloadUrl: string;
  }> | null>(null);
  const [generationError, setGenerationError] = useState("");

  // Load eligible students when filters or template change
  const fetchEligibleStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      if (selectedCourseId) params.append("courseId", selectedCourseId);
      if (selectedBatchId) params.append("batchId", selectedBatchId);
      if (selectedTemplateId) params.append("templateId", selectedTemplateId);

      const res = await fetch(`/api/certificates/eligible-students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load eligible students");
      const data = await res.json();
      setEligibleStudents(data);
      setSelectedStudentIds([]);
    } catch {
      setEligibleStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedCourseId, selectedBatchId, selectedTemplateId]);

  useEffect(() => {
    fetchEligibleStudents();
  }, [fetchEligibleStudents]);

  const filteredStudents = eligibleStudents.filter((s) => {
    return query === "" || s.name.toLowerCase().includes(query.toLowerCase()) || s.mobile.includes(query);
  });

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleGenerateCertificates = async () => {
    if (!selectedTemplateId) {
      setGenerationError("Please select a certificate template.");
      return;
    }
    if (selectedStudentIds.length === 0) {
      setGenerationError("Please select at least one eligible student.");
      return;
    }

    setGenerating(true);
    setGenerationError("");
    setGenerationResults(null);

    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          studentIds: selectedStudentIds,
          forceRegenerate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate certificates.");

      setGenerationResults(data.certificates || []);
      fetchEligibleStudents();
      router.refresh();
    } catch (err: unknown) {
      setGenerationError(err instanceof Error ? err.message : "Failed to generate certificates.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this certificate template?")) return;
    try {
      await fetch(`/api/certificates/templates/${id}`, { method: "DELETE" });
      router.refresh();
      window.location.reload();
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-scholar-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("issue")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl mr-2 transition-all ${
            activeTab === "issue"
              ? "bg-scholar-600 text-white shadow-xs"
              : "text-scholar-600 hover:bg-scholar-100"
          }`}
        >
          <Award size={15} />
          <span>Generate & Issue Certificates</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "templates"
              ? "bg-scholar-600 text-white shadow-xs"
              : "text-scholar-600 hover:bg-scholar-100"
          }`}
        >
          <Edit2 size={15} />
          <span>Certificate Templates ({templates.length})</span>
        </button>
      </div>

      {/* Tab 1: Generate & Issue Certificates */}
      {activeTab === "issue" && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-scholar-100 pb-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Award size={14} className="text-amber-500" />
                  Select Certificate Template:
                </label>
                {templates.length === 0 ? (
                  <div className="text-xs text-danger-600 flex items-center gap-2">
                    <span>No certificate templates created yet.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(null);
                        setEditorOpen(true);
                      }}
                      className="font-bold underline text-scholar-600"
                    >
                      + Create Template First
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full md:max-w-md rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-semibold text-ink shadow-2xs outline-none"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.title})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(null);
                    setEditorOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs"
                >
                  <Plus size={13} />
                  <span>New Template</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs w-full sm:max-w-xs shadow-2xs">
                  <Search size={14} className="text-scholar-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search student by name/phone..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent outline-none placeholder:text-scholar-400 font-medium"
                  />
                </div>

                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    setSelectedBatchId("");
                  }}
                  className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-scholar-700 font-medium shadow-2xs outline-none"
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs text-scholar-700 font-medium shadow-2xs outline-none"
                >
                  <option value="">All Batches</option>
                  {batches
                    .filter((b) => !selectedCourseId || b.courseId === selectedCourseId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Force Regenerate Checkbox */}
              <label className="flex items-center gap-2 text-xs font-semibold text-scholar-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceRegenerate}
                  onChange={(e) => setForceRegenerate(e.target.checked)}
                  className="rounded border-scholar-300 text-scholar-600 focus:ring-scholar-500 h-4 w-4"
                />
                <span>Force re-generate (re-render PDFs)</span>
              </label>
            </div>
          </Card>

          {/* Eligibility Info Callout */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Course Completion Eligibility Rule:</span>
              <p className="mt-0.5 text-amber-800">
                Only students whose <strong>Course End Date</strong> has passed (on or before today) are listed
                below. To mark a student eligible, set their Course End Date in student profile management.
              </p>
            </div>
          </div>

          {/* Generation Success Banner */}
          {generationResults && generationResults.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Successfully generated {generationResults.length} certificate(s)!</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {generationResults.map((res) => (
                  <a
                    key={res.studentId}
                    href={res.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50 shadow-2xs transition-colors"
                  >
                    <Download size={12} />
                    <span>{res.studentName} (Download PDF)</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {generationError && (
            <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Eligible Students Table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-scholar-100 bg-scholar-50/50">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-bold text-scholar-700 hover:text-ink cursor-pointer"
                >
                  {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                    <CheckSquare size={16} className="text-scholar-600" />
                  ) : (
                    <Square size={16} className="text-scholar-400" />
                  )}
                  <span>
                    Select All ({selectedStudentIds.length} of {filteredStudents.length} selected)
                  </span>
                </button>
              </div>

              <button
                type="button"
                disabled={generating || selectedStudentIds.length === 0 || !selectedTemplateId}
                onClick={handleGenerateCertificates}
                className="inline-flex items-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-scholar-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>
                  {generating
                    ? "Generating Certificates..."
                    : `Generate Certificates (${selectedStudentIds.length})`}
                </span>
              </button>
            </div>

            {loadingStudents ? (
              <div className="p-12 text-center text-xs text-scholar-400">
                <Loader2 size={24} className="animate-spin mx-auto text-scholar-500 mb-2" />
                <span>Loading eligible student records...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-xs text-scholar-400 space-y-1">
                <p className="font-semibold text-scholar-600 text-sm">No completed students found</p>
                <p>
                  No students in this course/batch have a Course End Date on or before today.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-scholar-50 text-[11px] font-bold uppercase tracking-wider text-scholar-500 border-b border-scholar-100">
                    <tr>
                      <th className="p-3 w-10"></th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Course & Batch</th>
                      <th className="p-3">Course End Date</th>
                      <th className="p-3">Certificate Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-scholar-100 font-medium">
                    {filteredStudents.map((s) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-scholar-50/70 transition-colors ${
                            isSelected ? "bg-scholar-50/40" : ""
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStudent(s.id)}
                              className="rounded border-scholar-300 text-scholar-600 focus:ring-scholar-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-ink block">{s.name}</span>
                            <span className="text-[11px] text-scholar-400 font-mono">{s.mobile}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-scholar-800 block">{s.courseName}</span>
                            <span className="text-[11px] text-scholar-500">{s.batchName}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-scholar-700">
                              {s.courseEndDate ? formatDate(new Date(s.courseEndDate)) : "—"}
                            </span>
                          </td>
                          <td className="p-3">
                            {s.hasCertificate ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={11} /> Issued & Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                Ready for Issuance
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {s.pdfFileAssetId ? (
                              <a
                                href={`/api/files/${s.pdfFileAssetId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-50 shadow-2xs transition-colors"
                              >
                                <Download size={12} />
                                <span>Download PDF</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled={generating || !selectedTemplateId}
                                onClick={() => {
                                  setSelectedStudentIds([s.id]);
                                  handleGenerateCertificates();
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-scholar-50 px-2.5 py-1 text-[11px] font-semibold text-scholar-700 hover:bg-scholar-100 transition-colors cursor-pointer"
                              >
                                <Sparkles size={11} />
                                <span>Issue Now</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Certificate Templates */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink">Certificate Layout Templates</h3>
              <p className="text-xs text-scholar-500">
                Customize certificate layout, dynamic body copy, signatories, and logos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setEditorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-scholar-700 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {tpl.title}
                    </span>
                    <span className="text-[11px] text-scholar-400">
                      {tpl._count?.issuedCertificates || 0} Issued
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-sm text-ink">{tpl.name}</h4>

                  <p className="text-xs text-scholar-600 line-clamp-3 bg-scholar-50/70 p-2.5 rounded-xl border border-scholar-100 italic">
                    &ldquo;{tpl.bodyText}&rdquo;
                  </p>

                  <div className="text-[11px] text-scholar-500 space-y-0.5 pt-1">
                    <p>
                      Signatory: <strong>{tpl.signatoryName || "Authorized Signatory"}</strong>
                    </p>
                    <p className="text-scholar-400">{tpl.signatoryTitle || "Director / Academic Head"}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-scholar-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setEditorOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs"
                  >
                    <Edit2 size={12} />
                    <span>Edit Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="p-1.5 rounded-lg text-scholar-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <TemplateEditorDrawer
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
      />
    </div>
  );
}
