"use client";

import { useState } from "react";
import { Users, ShieldCheck, KeyRound, CalendarCheck } from "lucide-react";
import { FacultyTable, type FacultyRow, type BatchOption, type BranchOption, type CourseOption } from "./FacultyTable";
import { ManageStaffRolesView } from "./ManageStaffRolesView";
import { ManageStaffActionRightsView } from "./ManageStaffActionRightsView";
import { StaffAttendanceView } from "./StaffAttendanceView";
import { AddFacultyDrawer } from "./AddFacultyDrawer";

type ActiveTab = "DIRECTORY" | "ROLES" | "ACTION_RIGHTS" | "ATTENDANCE";

export function FacultyManagerView({
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("DIRECTORY");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRow | null>(null);

  const openAdd = () => {
    setEditingFaculty(null);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Level Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-scholar-200 bg-white px-3 py-2 rounded-2xl shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("DIRECTORY")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "DIRECTORY"
              ? "bg-scholar-600 text-white shadow-xs"
              : "text-scholar-600 hover:bg-scholar-50"
          }`}
        >
          <Users size={16} />
          <span>Manage Staff</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              activeTab === "DIRECTORY" ? "bg-white/20 text-white" : "bg-scholar-100 text-scholar-700"
            }`}
          >
            {faculty.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ROLES")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "ROLES"
              ? "bg-scholar-600 text-white shadow-xs"
              : "text-scholar-600 hover:bg-scholar-50"
          }`}
        >
          <ShieldCheck size={16} />
          <span>Manage Staff Roles</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ACTION_RIGHTS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "ACTION_RIGHTS"
              ? "bg-scholar-600 text-white shadow-xs"
              : "text-scholar-600 hover:bg-scholar-50"
          }`}
        >
          <KeyRound size={16} />
          <span>Manage Staff Action Rights</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "ATTENDANCE"
              ? "bg-scholar-600 text-white shadow-xs"
              : "text-scholar-600 hover:bg-scholar-50"
          }`}
        >
          <CalendarCheck size={16} />
          <span>Staff Attendance</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "DIRECTORY" && (
        <FacultyTable faculty={faculty} batches={batches} courses={courses} branches={branches} />
      )}

      {activeTab === "ROLES" && (
        <ManageStaffRolesView faculty={faculty} onOpenAdd={openAdd} />
      )}

      {activeTab === "ACTION_RIGHTS" && (
        <ManageStaffActionRightsView faculty={faculty} />
      )}

      {activeTab === "ATTENDANCE" && (
        <StaffAttendanceView faculty={faculty} branches={branches} />
      )}

      {/* Shared Drawer for Adding Staff */}
      <AddFacultyDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingFaculty(null);
        }}
        batches={batches}
        courses={courses}
        branches={branches}
        editing={editingFaculty}
      />
    </div>
  );
}
