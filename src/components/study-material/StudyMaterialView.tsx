"use client";

import { useState, useMemo } from "react";
import {
  Upload,
  Search,
  ExternalLink,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UploadMaterialDrawer } from "./UploadMaterialDrawer";
import { formatDate } from "@/lib/utils";

type Batch = {
  id: string;
  name: string;
  course: { id: string; name: string };
};

type Course = {
  id: string;
  name: string;
};

export type StudyMaterialItem = {
  id: string;
  title: string;
  subject: string;
  topic: string | null;
  fileType: string;
  fileUrl: string;
  description: string | null;
  createdAt: string;
  course: { id: string; name: string } | null;
  batch: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string } | null;
};

export function StudyMaterialView({
  batches,
  courses,
  initialMaterials,
}: {
  batches: Batch[];
  courses: Course[];
  initialMaterials: StudyMaterialItem[];
}) {
  const [materials, setMaterials] = useState<StudyMaterialItem[]>(initialMaterials);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<StudyMaterialItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("ALL");
  const [selectedBatchId, setSelectedBatchId] = useState("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const availableFilterBatches = useMemo(() => {
    if (selectedCourseId === "ALL") return batches;
    return batches.filter((b) => b.course?.id === selectedCourseId);
  }, [batches, selectedCourseId]);

  const refreshMaterials = async () => {
    try {
      const res = await fetch("/api/study-materials");
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch {
      console.error("Failed to refresh study materials");
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/study-materials/${materialToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== materialToDelete.id));
        setMaterialToDelete(null);
      }
    } catch {
      console.error("Failed to delete study material");
    } finally {
      setDeleteLoading(false);
    }
  };

  const subjects = Array.from(new Set(materials.map((m) => m.subject)));

  const filtered = materials.filter((m) => {
    if (selectedCourseId !== "ALL" && m.course?.id !== selectedCourseId) return false;
    if (selectedBatchId !== "ALL" && m.batch?.id !== selectedBatchId) return false;
    if (subjectFilter !== "ALL" && m.subject !== subjectFilter) return false;
    if (typeFilter !== "ALL" && m.fileType !== typeFilter) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(term);
      const matchTopic = m.topic?.toLowerCase().includes(term) ?? false;
      const matchSubject = m.subject.toLowerCase().includes(term);
      const matchCourse = m.course?.name.toLowerCase().includes(term) ?? false;
      const matchBatch = m.batch?.name.toLowerCase().includes(term) ?? false;
      if (!matchTitle && !matchTopic && !matchSubject && !matchCourse && !matchBatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Study Material & LMS Hub</h1>
          <p className="mt-0.5 text-xs text-scholar-400">
            Publish lecture notes, video recordings, revision formula sheets, and reference material.
          </p>
        </div>

        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-scholar-700 transition-colors"
        >
          <Upload size={14} /> Upload Material
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <span className="text-[11px] font-semibold text-scholar-500">Total Materials</span>
          <p className="font-display text-2xl font-bold text-ink mt-1">{materials.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] font-semibold text-scholar-500">PDF Documents</span>
          <p className="font-display text-2xl font-bold text-scholar-700 mt-1">
            {materials.filter((m) => m.fileType === "PDF").length}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] font-semibold text-scholar-500">Video Lectures</span>
          <p className="font-display text-2xl font-bold text-emerald-600 mt-1">
            {materials.filter((m) => m.fileType === "VIDEO").length}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-[11px] font-semibold text-scholar-500">Active Subjects</span>
          <p className="font-display text-2xl font-bold text-amber-600 mt-1">{subjects.length}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" />
            <input
              type="text"
              placeholder="Search by title, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-scholar-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-scholar-500"
            />
          </div>

          {/* Course Filter */}
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSelectedBatchId("ALL");
            }}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none cursor-pointer"
          >
            <option value="ALL">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none cursor-pointer"
          >
            <option value="ALL">All Batches</option>
            {availableFilterBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.course.name})
              </option>
            ))}
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none cursor-pointer"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none cursor-pointer"
          >
            <option value="ALL">All Formats</option>
            <option value="PDF">PDF Notes</option>
            <option value="VIDEO">Videos</option>
            <option value="DOCUMENT">Documents</option>
            <option value="LINK">Web Links</option>
          </select>
        </div>

        <span className="text-xs font-medium text-scholar-400">
          Showing {filtered.length} files
        </span>
      </div>

      {/* Materials Cards Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-scholar-100 bg-white p-12 text-center shadow-card">
          <BookOpen size={28} className="mx-auto text-scholar-400" />
          <h3 className="mt-3 font-display text-base font-semibold text-ink">No Study Materials Found</h3>
          <p className="mt-1 text-xs text-scholar-400 max-w-sm mx-auto">
            {search || subjectFilter !== "ALL"
              ? "No files match your current filters."
              : "Upload PDF notes, formula sheets, or video lecture links for your students."}
          </p>
          <button
            onClick={() => setUploadOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700"
          >
            <Upload size={14} /> Upload First Resource
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((mat) => {
            const isVideo = mat.fileType === "VIDEO";
            return (
              <Card
                key={mat.id}
                className="flex flex-col justify-between p-5 transition-all hover:shadow-popover"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={isVideo ? "marigold" : "scholar"}>
                        {isVideo ? "Video" : mat.fileType}
                      </Badge>
                      <span className="rounded-full bg-scholar-50 px-2 py-0.5 text-[10px] font-semibold text-scholar-700 border border-scholar-200">
                        {mat.subject}
                      </span>
                    </div>

                    <button
                      onClick={() => setMaterialToDelete(mat)}
                      className="text-scholar-300 hover:text-rose-600 p-1 transition"
                      title="Delete Material"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 className="mt-3 font-display text-sm font-bold text-ink hover:text-scholar-600">
                    {mat.title}
                  </h3>

                  {mat.topic && (
                    <p className="mt-0.5 text-xs text-scholar-500 font-medium">
                      Chapter: {mat.topic}
                    </p>
                  )}

                  {mat.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-scholar-400">
                      {mat.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-scholar-50 pt-2 text-[11px] text-scholar-400">
                    <span>
                      {mat.batch?.name ? `Batch: ${mat.batch.name}` : mat.course?.name ? `Course: ${mat.course.name}` : "All Batches"}
                    </span>
                    <span>{formatDate(mat.createdAt)}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-scholar-100 pt-3">
                  <a
                    href={mat.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-scholar-50 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-100 transition-colors"
                  >
                    <ExternalLink size={13} />
                    {isVideo ? "Watch Lecture Video" : "Open / Download Resource"}
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Drawer */}
      <UploadMaterialDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        batches={batches}
        courses={courses}
        onUploaded={refreshMaterials}
      />

      <ConfirmDialog
        open={!!materialToDelete}
        onClose={() => setMaterialToDelete(null)}
        onConfirm={confirmDeleteMaterial}
        title="Delete Study Material"
        message={
          materialToDelete ? (
            <span>
              Are you sure you want to delete <strong>&ldquo;{materialToDelete.title}&rdquo;</strong>?
              This resource will be permanently removed for enrolled students.
            </span>
          ) : null
        }
        confirmLabel="Delete Material"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
