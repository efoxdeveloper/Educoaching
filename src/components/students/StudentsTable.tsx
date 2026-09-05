"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Phone, FileText, Eye, Pencil, Users } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/Card";
import {
  Badge,
  feeStatusTone,
  studentStatusTone,
} from "@/components/ui/Badge";
import { AddStudentDrawer } from "./AddStudentDrawer";
import { StudentProfileDrawer } from "./StudentProfileDrawer";
import { EditStudentDrawer, type EditableStudent } from "./EditStudentDrawer";
import { DocumentsDrawer } from "@/components/files/DocumentsDrawer";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { computeFeeStatus, feeStatusLabel } from "@/lib/fee";

type Student = {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  photoUrl?: string | null;
  parentMobile?: string | null;
  status: string;
  admissionDate: string;
  totalFee: string;
  paidFee: string;
  dueDate: string | null;
  plan?: string;
  courseDuration?: string | null;
  quarterlyAmount?: string | number | null;
  registrationFee?: string | number | null;
  isSeatBooked?: boolean;
  discountPercent?: string | number | null;
  discountApprovalStatus?: string | null;
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
    city?: string | null;
  } | null;
  course: {
    id: string;
    name: string;
  };
  batch: {
    id: string;
    name: string;
    timing?: string;
  } | null;
};

export function StudentsTable({
  students,
  courses,
  batches,
  branches = [],
}: {
  students: Student[];
  courses: {
    id: string;
    name: string;
    fee: string;
  }[];
  batches: {
    id: string;
    name: string;
    courseId: string;
    branchId?: string | null;
    isAllBranches?: boolean;
    timing?: string;
    status?: string;
    endDate?: string | null;
    branch?: { id: string; name: string; city?: string | null } | null;
    branches?: { id: string; name: string; city?: string | null }[];
  }[];
  branches?: {
    id: string;
    name: string;
    city?: string | null;
  }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [docsStudent, setDocsStudent] = useState<Student | null>(null);
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<EditableStudent | null>(null);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesQuery =
        query.trim() === "" ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.mobile.includes(query);

      const matchesCourse =
        !courseFilter || s.course.id === courseFilter;

      const matchesStatus =
        !statusFilter || s.status === statusFilter;

      return (
        matchesQuery &&
        matchesCourse &&
        matchesStatus
      );
    });
  }, [students, query, courseFilter, statusFilter]);

  // S1: derived aggregates for visuals — kept separate from table, no filtering of underlying rows
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) map[s.status] = (map[s.status] || 0) + 1;
    return map;
  }, [students]);
  const statusDonutData = useMemo(() => {
    const colors: Record<string, string> = { ACTIVE: "#059669", ON_HOLD: "#F59E0B", INACTIVE: "#94A3B8" };
    return Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace("_", " "), value, color: colors[name] || "#1E3A5F" }));
  }, [statusCounts]);
  const courseCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) map[s.course.name] = (map[s.course.name] || 0) + 1;
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [students]);

  return (
    <>
      {/* S1: Student distribution visuals — stat cards + donut/bar; table below stays exactly as before with all badges/numbers */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 flex flex-col">
          <div className="mb-2 flex items-center gap-1.5">
            <Users size={14} className="text-scholar-600" />
            <h4 className="font-display text-sm font-semibold text-ink">Students by Status</h4>
          </div>
          <p className="mb-3 text-xs text-scholar-400">Active vs On Hold vs Inactive — distribution, not just count</p>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusDonutData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px]">
            {statusDonutData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-scholar-500">Total: {students.length} students</p>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-ink">Students per Course</h4>
            <span className="text-[11px] text-scholar-400">Top 6 courses</span>
          </div>
          <p className="mb-3 text-xs text-scholar-400">Enrollment concentration by program — bar length = headcount</p>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseCounts} margin={{ left: -10, right: 16, top: 4, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#4E6E93" }} interval={0} angle={-14} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#4E6E93" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D6E0EB", fontSize: 12 }} />
                <Bar dataKey="count" fill="#1E3A5F" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 sm:max-w-xs sm:flex-1">
              <Search
                size={16}
                className="text-scholar-300"
              />

              <input
                placeholder="Search by name or mobile"
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                className="w-full bg-transparent text-sm outline-none placeholder:text-scholar-300"
              />
            </div>

            <select
              value={courseFilter}
              onChange={(e) =>
                setCourseFilter(e.target.value)
              }
              className="rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 text-sm text-scholar-600 outline-none"
            >
              <option value="">
                All courses
              </option>

              {courses.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="rounded-xl border border-scholar-100 bg-paper px-3 py-2.5 text-sm text-scholar-600 outline-none"
            >
              <option value="">
                All statuses
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="ON_HOLD">
                On hold
              </option>

              <option value="INACTIVE">
                Inactive
              </option>
            </select>
          </div>

          <button
            onClick={() =>
              setDrawerOpen(true)
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-scholar-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-scholar-700"
          >
            <Plus size={16} />
            Add Student
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-scholar-100 text-left text-xs font-medium uppercase tracking-wide text-scholar-400">
                <th className="py-3 pr-4">
                  Student
                </th>

                <th className="py-3 pr-4">
                  Mobile
                </th>

                <th className="py-3 pr-4">
                  Course
                </th>

                <th className="py-3 pr-4">
                  Batch
                </th>

                <th className="py-3 pr-4">
                  Fee status
                </th>

                <th className="py-3 pr-4">
                  Admission date
                </th>

                <th className="py-3 pr-4">
                  Status
                </th>

                <th className="py-3 pr-2 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((s) => {
                // Convert the string received from the server
                // into a Date before passing it to computeFeeStatus.
                const dueDate = s.dueDate
                  ? new Date(s.dueDate)
                  : null;

                const fee = computeFeeStatus(
                  Number(s.totalFee),
                  Number(s.paidFee),
                  dueDate
                );

                return (
                  <tr
                    key={s.id}
                    className="border-b border-scholar-50 last:border-0 hover:bg-paper/60"
                  >
                    <td className="py-3 pr-4">
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setProfileStudentId(s.id)}
                      >
                        {s.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.photoUrl}
                            alt={s.name}
                            className="h-9 w-9 shrink-0 rounded-lg object-cover border border-scholar-200 shadow-2xs"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-scholar-50 text-xs font-semibold text-scholar-600 group-hover:bg-scholar-600 group-hover:text-white transition-colors">
                            {initials(s.name)}
                          </div>
                        )}

                        <div>
                          <span className="font-semibold text-ink group-hover:text-scholar-600 group-hover:underline block">
                            {s.name}
                          </span>
                          {s.plan === "DEMO" ? (
                            <span className="text-[10px] text-marigold-600 font-semibold block">
                              7-Day Demo
                            </span>
                          ) : s.plan === "INSTALLMENTS" ? (
                            <span className="text-[10px] text-scholar-600 font-semibold block">
                              Installments
                            </span>
                          ) : s.plan === "QUARTERLY" ? (
                            <span className="text-[10px] text-cyan-700 font-semibold block">
                              Quarterly
                            </span>
                          ) : null}

                          {s.isSeatBooked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5 w-fit">
                              🎫 Seat Booked {s.registrationFee ? `(₹${formatCurrency(s.registrationFee)})` : ""}
                            </span>
                          )}

                          {s.discountApprovalStatus === "PENDING_OWNER_APPROVAL" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 w-fit">
                              ⏳ Discount Pending Approval ({s.discountPercent}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-4 text-scholar-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={13} className="text-scholar-300" />
                        {s.mobile}
                      </span>
                    </td>

                    <td className="py-3 pr-4 text-scholar-500">
                      <div className="flex flex-col">
                        <span className="text-ink font-medium">{s.course.name}</span>
                        {s.courseDuration && (
                          <span className="text-[10px] text-scholar-400">
                            ⏱️ {s.courseDuration}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 pr-4 text-scholar-500">
                      <div className="flex flex-col">
                        <span className="text-ink font-medium">{s.batch?.name ?? "—"}</span>
                        {s.branch && (
                          <span className="text-[10px] text-scholar-400">
                            📍 {s.branch.name}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 pr-4">
                      <Badge
                        tone={feeStatusTone(fee)}
                        dot
                      >
                        {feeStatusLabel(fee)}
                      </Badge>
                    </td>

                    <td className="py-3 pr-4 text-scholar-500">
                      {formatDate(s.admissionDate)}
                    </td>

                    <td className="py-3 pr-4">
                      <Badge
                        tone={studentStatusTone(
                          s.status
                        )}
                      >
                        {s.status.replace("_", " ")}
                      </Badge>
                    </td>

                    <td className="py-3 pr-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setProfileStudentId(s.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-scholar-400 hover:bg-scholar-50 hover:text-scholar-700 transition-colors"
                          aria-label="View 360 Profile"
                          title="View Student 360° Profile"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() =>
                            setEditStudent({
                              id: s.id,
                              name: s.name,
                              mobile: s.mobile,
                              email: s.email,
                              parentMobile: s.parentMobile,
                              courseId: s.course.id,
                              batchId: s.batch?.id,
                              status: s.status,
                              totalFee: s.totalFee,
                              dueDate: s.dueDate,
                              plan: s.plan,
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-scholar-400 hover:bg-scholar-50 hover:text-scholar-700 transition-colors"
                          aria-label="Edit Student"
                          title="Edit Student"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDocsStudent(s)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-scholar-400 hover:bg-scholar-50 hover:text-scholar-700 transition-colors"
                          aria-label="Documents"
                          title="Documents"
                        >
                          <FileText size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-sm text-scholar-400"
                  >
                    No students match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-scholar-400 tabular-nums">
          Showing {filtered.length} of {students.length} students.
          Total fee outstanding:{" "}
          {formatCurrency(
            students.reduce(
              (sum, s) =>
                sum +
                Math.max(
                  Number(s.totalFee) -
                    Number(s.paidFee),
                  0
                ),
              0
            )
          )}
        </p>
      </Card>

      <AddStudentDrawer
        open={drawerOpen}
        onClose={() =>
          setDrawerOpen(false)
        }
        courses={courses}
        batches={batches}
        branches={branches}
      />

      <StudentProfileDrawer
        studentId={profileStudentId}
        open={!!profileStudentId}
        onClose={() => setProfileStudentId(null)}
        courses={courses}
        batches={batches}
        onRefreshParent={() => router.refresh()}
      />

      <EditStudentDrawer
        open={!!editStudent}
        onClose={() => setEditStudent(null)}
        student={editStudent}
        courses={courses}
        batches={batches}
        onUpdated={() => router.refresh()}
      />

      {docsStudent && (
        <DocumentsDrawer
          open={!!docsStudent}
          onClose={() => setDocsStudent(null)}
          relatedType="Student"
          relatedId={docsStudent.id}
          category="STUDENT_DOCUMENT"
          entityLabel={docsStudent.name}
        />
      )}
    </>
  );
}