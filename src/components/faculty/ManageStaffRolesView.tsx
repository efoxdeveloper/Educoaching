"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  GraduationCap,
  Building2,
  Cpu,
  Wrench,
  Users,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  DollarSign,
  CalendarDays,
  FileCheck,
} from "lucide-react";
import { ROLE_OPTIONS } from "./AddFacultyDrawer";
import type { FacultyRow } from "./FacultyTable";

const DEPARTMENT_CONFIG = [
  {
    id: "ACADEMIC",
    title: "Academic & Teaching Staff",
    description: "Core teaching faculty, guest professors, subject experts, and academic doubt assistants.",
    icon: GraduationCap,
    headerColor: "bg-blue-50 border-blue-200 text-blue-800",
    badgeColor: "scholar",
    defaultPermissions: ["Student Attendance", "Tests & CBT", "Question Bank", "Study Materials", "Assignments & DPP"],
  },
  {
    id: "ADMINISTRATION",
    title: "Administration & Front Office",
    description: "Admissions counselors, campus receptionists, enquiry desks, and fee cashiers.",
    icon: Building2,
    headerColor: "bg-purple-50 border-purple-200 text-purple-800",
    badgeColor: "neutral",
    defaultPermissions: ["Lead CRM Inquiries", "Student Admissions", "Fee Collection", "SMS & Broadcast Alerts"],
  },
  {
    id: "TECHNICAL",
    title: "Technical & CBT Systems",
    description: "CBT computer lab technicians, network administrators, and digital examination supervisors.",
    icon: Cpu,
    headerColor: "bg-amber-50 border-amber-200 text-amber-800",
    badgeColor: "warning",
    defaultPermissions: ["CBT Computer Lab", "Question Bank Uploads", "Online Test Diagnostics"],
  },
  {
    id: "OPERATIONS_SUPPORT",
    title: "Campus Operations & Support",
    description: "Campus security, transport drivers, housekeeping, sweepers, and office attendants.",
    icon: Wrench,
    headerColor: "bg-emerald-50 border-emerald-200 text-emerald-800",
    badgeColor: "success",
    defaultPermissions: ["Campus Access Logging", "Staff Attendance", "Maintenance Requests"],
  },
];

export function ManageStaffRolesView({
  faculty,
  onOpenAdd,
}: {
  faculty: FacultyRow[];
  onOpenAdd?: () => void;
}) {
  const [selectedDept, setSelectedDept] = useState<string>("ALL");

  const deptCounts = useMemo(() => {
    const map: Record<string, number> = {
      ACADEMIC: 0,
      ADMINISTRATION: 0,
      TECHNICAL: 0,
      OPERATIONS_SUPPORT: 0,
    };
    for (const f of faculty) {
      const dept = f.department || "ACADEMIC";
      if (map[dept] !== undefined) {
        map[dept]++;
      }
    }
    return map;
  }, [faculty]);

  const roleStaffMap = useMemo(() => {
    const map = new Map<string, FacultyRow[]>();
    for (const f of faculty) {
      const role = f.roleType || "FACULTY";
      if (!map.has(role)) {
        map.set(role, []);
      }
      map.get(role)!.push(f);
    }
    return map;
  }, [faculty]);

  const filteredRoles = useMemo(() => {
    if (selectedDept === "ALL") return ROLE_OPTIONS;
    return ROLE_OPTIONS.filter((r) => r.department === selectedDept);
  }, [selectedDept]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-scholar-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-scholar-900">Institute Staff Roles &amp; Hierarchy</h2>
          <p className="text-xs text-scholar-500 mt-0.5">
            Overview of standard staff role profiles across Academic, Administrative, Technical, and Support departments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-scholar-400 font-medium">Total Active Personnel</span>
            <p className="text-lg font-bold text-scholar-800">{faculty.length} Members</p>
          </div>
          {onOpenAdd && (
            <button
              onClick={onOpenAdd}
              className="rounded-xl bg-scholar-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-scholar-700 transition-colors shadow-xs"
            >
              + Register New Staff
            </button>
          )}
        </div>
      </div>

      {/* Department Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEPARTMENT_CONFIG.map((dept) => {
          const count = deptCounts[dept.id] || 0;
          const Icon = dept.icon;
          const isSelected = selectedDept === dept.id;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => setSelectedDept(selectedDept === dept.id ? "ALL" : dept.id)}
              className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
                isSelected
                  ? "border-scholar-500 bg-scholar-50/50 ring-2 ring-scholar-500/20 shadow-xs"
                  : "border-scholar-100 bg-white hover:border-scholar-300 hover:shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`rounded-xl p-2.5 ${dept.headerColor}`}>
                  <Icon size={20} />
                </div>
                <span className="text-2xl font-bold text-scholar-900">{count}</span>
              </div>
              <h3 className="text-sm font-bold text-scholar-800 mt-3">{dept.title}</h3>
              <p className="text-xs text-scholar-500 line-clamp-2 mt-1 leading-relaxed">{dept.description}</p>
            </button>
          );
        })}
      </div>

      {/* Role Profiles Table */}
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-scholar-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-scholar-800">
              {selectedDept === "ALL"
                ? "All Configured Staff Roles (11 Roles)"
                : `${DEPARTMENT_CONFIG.find((d) => d.id === selectedDept)?.title} Roles`}
            </h3>
            <p className="text-xs text-scholar-500">
              Pre-configured role assignments and assigned staff personnel.
            </p>
          </div>
          {selectedDept !== "ALL" && (
            <button
              onClick={() => setSelectedDept("ALL")}
              className="text-xs font-semibold text-scholar-600 hover:underline"
            >
              Show all departments
            </button>
          )}
        </div>

        <div className="space-y-4">
          {filteredRoles.map((role) => {
            const assignedStaff = roleStaffMap.get(role.value) || [];
            const deptInfo = DEPARTMENT_CONFIG.find((d) => d.id === role.department);
            const DeptIcon = deptInfo?.icon || Users;

            return (
              <div
                key={role.value}
                className="rounded-2xl border border-scholar-100 bg-white p-4 transition-all hover:border-scholar-200"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-scholar-50 text-scholar-600">
                      <DeptIcon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-scholar-900">{role.label}</h4>
                        <span className="rounded-md bg-scholar-50 px-2 py-0.5 text-[11px] font-medium text-scholar-600 border border-scholar-200">
                          {role.value}
                        </span>
                      </div>
                      <p className="text-xs text-scholar-500 mt-0.5">
                        Department: <span className="font-medium text-scholar-700">{deptInfo?.title || role.department}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="rounded-xl border border-scholar-100 bg-scholar-50/60 px-3 py-1 text-xs font-semibold text-scholar-700">
                      {assignedStaff.length} {assignedStaff.length === 1 ? "Member" : "Members"}
                    </span>
                  </div>
                </div>

                {/* Assigned Personnel Chips */}
                {assignedStaff.length > 0 ? (
                  <div className="mt-3.5 pt-3 border-t border-scholar-100 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-scholar-400">Assigned:</span>
                    {assignedStaff.map((staff) => (
                      <span
                        key={staff.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-scholar-200 bg-paper px-2.5 py-1 text-xs font-medium text-scholar-800"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {staff.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 pt-2.5 border-t border-scholar-100 text-xs text-scholar-400 italic">
                    No active staff assigned to this role yet.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
