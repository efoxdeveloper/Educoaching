"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Phone,
  Pencil,
  Trash2,
  FileText,
  Building,
  Key,
  Filter,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddFacultyDrawer } from "./AddFacultyDrawer";
import { DocumentsDrawer } from "@/components/files/DocumentsDrawer";
import { initials, formatCurrency } from "@/lib/utils";

export type FacultyRow = {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  subject: string | null;
  subjects?: string[];
  qualification: string | null;
  experienceYears: number | null;
  bio: string | null;
  status: string;
  roleType?: string | null;
  department?: string | null;
  designation?: string | null;
  monthlySalary?: number | null;
  branchId?: string | null;
  isAllBranches?: boolean;
  branch?: { id: string; name: string; city?: string | null } | null;
  branches?: { id: string; name: string; city?: string | null }[];
  hasSystemAccess?: boolean;
  joiningDate: string;
  batches: { batchId: string; batchName: string; courseName: string }[];
  _count: { reviews: number };
  permissions?: string[];
  user?: { id: string; email: string; role: string } | null;
};

export type BatchOption = {
  id: string;
  name: string;
  courseId?: string;
  courseName: string;
  timing?: string;
  branchName?: string;
  isAllBranches?: boolean;
};
export type CourseOption = { id: string; name: string; duration?: string | null };
export type BranchOption = { id: string; name: string; city?: string | null };

function statusTone(status: string): "success" | "warn" | "danger" | "neutral" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "UNDER_REVIEW":
      return "warn";
    case "REMOVED":
      return "danger";
    default:
      return "neutral";
  }
}

function departmentTone(dept?: string | null): "scholar" | "warning" | "success" | "neutral" {
  switch (dept) {
    case "ACADEMIC":
      return "scholar";
    case "TECHNICAL":
      return "warning";
    case "OPERATIONS_SUPPORT":
      return "success";
    case "ADMINISTRATION":
      return "neutral";
    default:
      return "neutral";
  }
}

export function FacultyTable({
  faculty,
  batches,
  courses = [],
  branches = [],
}: {
  faculty: FacultyRow[];
  batches: BatchOption[];
  courses?: CourseOption[];
  branches?: BranchOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FacultyRow | null>(null);
  const [facultyToDelete, setFacultyToDelete] = useState<FacultyRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [docsFaculty, setDocsFaculty] = useState<FacultyRow | null>(null);

  const filtered = useMemo(() => {
    return faculty.filter((f) => {
      const q = query.toLowerCase().trim();
      const matchesQuery =
        q === "" ||
        f.name.toLowerCase().includes(q) ||
        (f.subject ?? "").toLowerCase().includes(q) ||
        (f.subjects ?? []).some((s) => s.toLowerCase().includes(q)) ||
        (f.roleType ?? "").toLowerCase().includes(q) ||
        (f.department ?? "").toLowerCase().includes(q) ||
        (f.mobile ?? "").includes(query);

      const matchesStatus = !statusFilter || f.status === statusFilter;
      const matchesDept = departmentFilter === "ALL" || (f.department || "ACADEMIC") === departmentFilter;

      const matchesBranch =
        branchFilter === "ALL" ||
        f.isAllBranches ||
        (branchFilter === "MAIN" && !f.branch && (!f.branches || f.branches.length === 0)) ||
        f.branch?.id === branchFilter ||
        (f.branches && f.branches.some((br) => br.id === branchFilter));

      return matchesQuery && matchesStatus && matchesDept && matchesBranch;
    });
  }, [faculty, query, statusFilter, departmentFilter, branchFilter]);

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (f: FacultyRow) => {
    setEditing(f);
    setDrawerOpen(true);
  };

  const confirmDeleteFaculty = async () => {
    if (!facultyToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/faculty/${facultyToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFacultyToDelete(null);
      router.refresh();
    } catch {
      console.error("Failed to delete faculty");
    } finally {
      setDeleteLoading(false);
    }
  };

  const counts = useMemo(() => {
    const total = faculty.length;
    const academic = faculty.filter((f) => (f.department || "ACADEMIC") === "ACADEMIC").length;
    const admin = faculty.filter((f) => f.department === "ADMINISTRATION").length;
    const tech = faculty.filter((f) => f.department === "TECHNICAL").length;
    const support = faculty.filter((f) => f.department === "OPERATIONS_SUPPORT").length;
    return { total, academic, admin, tech, support };
  }, [faculty]);

  return (
    <>
      <Card className="p-6">
        {/* Department Filter Tabs */}
        <div className="mb-5 flex flex-wrap gap-2 border-b border-scholar-100 pb-4">
          {[
            { id: "ALL", label: `All Staff (${counts.total})` },
            { id: "ACADEMIC", label: `Teaching Faculty (${counts.academic})` },
            { id: "ADMINISTRATION", label: `Admissions & Office (${counts.admin})` },
            { id: "TECHNICAL", label: `CBT / IT Tech (${counts.tech})` },
            { id: "OPERATIONS_SUPPORT", label: `Support & Maintenance (${counts.support})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDepartmentFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                departmentFilter === tab.id
                  ? "bg-scholar-600 text-white shadow-xs"
                  : "text-scholar-600 hover:bg-scholar-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2 sm:max-w-xs sm:flex-1">
              <Search size={16} className="text-scholar-300" />
              <input
                placeholder="Search staff, subjects, roles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-scholar-300"
              />
            </div>

            {/* Branch Filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-scholar-400" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-xl border border-scholar-100 bg-paper px-3 py-2 text-xs font-medium text-scholar-600 outline-none"
              >
                <option value="ALL">All Campuses</option>
                <option value="MAIN">Main Campus / Unallocated</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.city ? `(${b.city})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-scholar-100 bg-paper px-3 py-2 text-xs font-medium text-scholar-600 outline-none"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="REMOVED">Removed</option>
            </select>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-semibold text-white hover:bg-scholar-700 transition-colors shadow-xs"
          >
            <Plus size={15} /> Add Staff / Faculty
          </button>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-scholar-100 text-xs font-medium text-scholar-400">
                <th className="pb-3 pl-2">Name &amp; Specialization</th>
                <th className="pb-3">Department &amp; Role</th>
                <th className="pb-3">Branch Campus Allocation</th>
                <th className="pb-3">System Access</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Salary</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-100/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-scholar-400">
                    No personnel records found. Click &quot;Add Staff / Faculty&quot; to register teachers, technicians, or support staff.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => {
                  const allocatedBranches =
                    f.branches && f.branches.length > 0
                      ? f.branches
                      : f.branch
                      ? [f.branch]
                      : [];

                  const subjectList =
                    f.subjects && f.subjects.length > 0
                      ? f.subjects
                      : f.subject
                      ? f.subject.split(",").map((s) => s.trim()).filter(Boolean)
                      : [];

                  return (
                    <tr key={f.id} className="hover:bg-scholar-50/40">
                      <td className="py-3.5 pl-2">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-scholar-100 text-xs font-bold text-scholar-800 mt-0.5">
                            {initials(f.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{f.name}</p>

                            {/* Multi-Subject Badges */}
                            {subjectList.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {subjectList.map((subj) => (
                                  <span
                                    key={subj}
                                    className="inline-flex items-center rounded-md bg-scholar-100 text-scholar-800 border border-scholar-200 px-1.5 py-0.2 text-[10px] font-semibold"
                                  >
                                    <BookOpen size={10} className="mr-1 text-scholar-500" />
                                    {subj}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <Badge tone={departmentTone(f.department)}>
                          {f.department || "ACADEMIC"}
                        </Badge>
                        <span className="block text-[11px] text-scholar-400 mt-0.5 font-medium">
                          {f.roleType || "FACULTY"}
                        </span>
                      </td>

                      {/* Multi-Branch Campus Allocation */}
                      <td className="py-3.5">
                        {f.isAllBranches ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                            🌐 All Campuses (Visiting Star)
                          </span>
                        ) : allocatedBranches.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {allocatedBranches.map((br) => (
                              <span
                                key={br.id}
                                className="inline-flex items-center gap-1 rounded-md bg-scholar-50 px-2 py-0.5 text-[11px] font-medium text-scholar-700 border border-scholar-200"
                              >
                                <Building size={11} className="text-scholar-400" />
                                {br.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-scholar-600">
                            <Building size={12} className="text-scholar-400" />
                            Main Campus
                          </span>
                        )}
                      </td>

                      <td className="py-3.5">
                        {f.hasSystemAccess ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            <Key size={11} /> Login Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-scholar-50 px-2 py-0.5 text-[11px] font-medium text-scholar-500">
                            Internal Only
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 text-xs text-scholar-600">
                        {f.mobile && (
                          <span className="flex items-center gap-1 font-medium">
                            <Phone size={12} className="text-scholar-400" /> {f.mobile}
                          </span>
                        )}
                        {f.email && <p className="text-[11px] text-scholar-400">{f.email}</p>}
                      </td>

                      <td className="py-3.5 text-xs font-semibold text-ink">
                        {f.monthlySalary != null ? formatCurrency(f.monthlySalary) : "—"}
                      </td>

                      <td className="py-3.5">
                        <Badge tone={statusTone(f.status)}>{f.status}</Badge>
                      </td>

                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Manage Documents (Aadhaar, Degree, Contract)"
                            onClick={() => setDocsFaculty(f)}
                            className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-50 hover:text-scholar-700"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            title="Edit Record"
                            onClick={() => openEdit(f)}
                            className="rounded-lg p-1.5 text-scholar-400 hover:bg-scholar-50 hover:text-scholar-700"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            title="Remove Staff Record"
                            onClick={() => setFacultyToDelete(f)}
                            className="rounded-lg p-1.5 text-scholar-400 hover:bg-danger-50 hover:text-danger-600 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddFacultyDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        batches={batches}
        courses={courses}
        editing={editing}
        branches={branches}
      />

      {docsFaculty && (
        <DocumentsDrawer
          open={Boolean(docsFaculty)}
          onClose={() => setDocsFaculty(null)}
          relatedType="Faculty"
          relatedId={docsFaculty.id}
          category="FACULTY_DOCUMENT"
          entityLabel={docsFaculty.name}
        />
      )}

      <ConfirmDialog
        open={!!facultyToDelete}
        onClose={() => setFacultyToDelete(null)}
        onConfirm={confirmDeleteFaculty}
        title="Remove Staff Record"
        message={
          facultyToDelete ? (
            <span>
              Are you sure you want to remove staff member <strong>&ldquo;{facultyToDelete.name}&rdquo;</strong>?
              This will also unassign them from any active batches and revoke software access.
            </span>
          ) : null
        }
        confirmLabel="Remove Staff Record"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
      />
    </>
  );
}