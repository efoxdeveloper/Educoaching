// Central RBAC permission matrix for Institute-scoped roles.
// PLATFORM_ADMIN is a separate concern, handled by requirePlatformAdmin() in tenant.ts
// and never passes through here.

export type InstituteRole =
  | "OWNER"
  | "ADMIN"
  | "STAFF"
  | "FACULTY"
  | "COUNSELLOR"
  | "ACCOUNTANT"
  | "TECHNICIAN"
  | "STUDENT"
  | "PARENT";

export type Permission =
  | "students:write" // enroll new students
  | "batches:write" // create/edit batches
  | "faculty:write" // add/edit faculty
  | "faculty:delete" // remove faculty
  | "faculty:assign" // assign/unassign faculty to batches
  | "attendance:write" // mark attendance
  | "payments:write" // record a fee payment
  | "payments:refund" // process student fee refund
  | "renewals:write" // record a subscription renewal
  | "team:manage" // invite/remove institute users, change roles
  | "billing:manage" // change/upgrade the institute's own subscription plan
  | "files:write" // upload/delete documents (student docs, faculty docs, etc.)
  | "institute:manage" // edit institute profile, logo, academic session, preferences
  | "subjects:read" // view subjects
  | "subjects:write" // create/edit subjects
  | "courses:write" // create/edit/delete courses/programs
  | "branches:write"
  | "admissions:read"
  | "admissions:write"
  | "timetable:write" // create/edit/delete timetable slots
  | "tests:write" // create/edit/delete tests and enter marks
  | "expenses:write" // create/edit/delete expenses
  | "income:write" // create/edit/delete income and non-fee revenue
  | "communication:write" // send bulk notifications/SMS/WhatsApp
  | "questions:write" // create/edit/delete questions in bank
  | "studyMaterials:write" // upload/manage LMS study materials
  | "assignments:write" // create/evaluate assignments and DPPs
  | "live-classes:write" // schedule and manage live video classes
  | "certificates:write" // design templates and issue course certificates
  | "staff:manage" // manage staff members
  | "staff:roles" // manage staff roles
  | "staff:rights" // manage staff action rights
  | "staff:attendance"; // mark and view staff attendance

export type PermissionCategory = {
  category: string;
  permissions: {
    key: Permission;
    label: string;
    description: string;
  }[];
};

export const STAFF_PERMISSIONS_CATALOG: PermissionCategory[] = [
  {
    category: "Academic & Teaching",
    permissions: [
      { key: "attendance:write", label: "Student Attendance", description: "Mark and update daily student attendance" },
      { key: "tests:write", label: "Tests & Marks Entry", description: "Create exams, CBT tests, and grade submissions" },
      { key: "questions:write", label: "Question Bank", description: "Create and edit questions in the question bank" },
      { key: "assignments:write", label: "Assignments & DPP", description: "Create, assign, and evaluate student assignments" },
      { key: "live-classes:write", label: "Live Classes", description: "Schedule and broadcast live video classes" },
      { key: "certificates:write", label: "Course Certificates", description: "Generate completion certificates & manage templates" },
      { key: "studyMaterials:write", label: "Study Materials", description: "Upload and organize notes, PDFs, and lectures" },
      { key: "timetable:write", label: "Timetable Management", description: "Create and modify schedule slots" },
      { key: "subjects:read", label: "View Subjects", description: "Access subjects list and syllabus breakdown" },
      { key: "subjects:write", label: "Manage Subjects", description: "Create and edit course subjects and topics" },
    ],
  },
  {
    category: "Admissions & Students",
    permissions: [
      { key: "students:write", label: "Student Enrollment", description: "Register new students and edit profiles" },
      { key: "batches:write", label: "Batch Allocation", description: "Create batches and assign student batches" },
      { key: "admissions:read", label: "Lead CRM View", description: "View prospective student inquiries" },
      { key: "admissions:write", label: "Manage Admissions", description: "Convert leads and manage admission pipeline" },
      { key: "courses:write", label: "Course Management", description: "Add and configure course structures and fees" },
    ],
  },
  {
    category: "Finance & Operations",
    permissions: [
      { key: "payments:write", label: "Collect Fees", description: "Accept cash/online fees and issue receipts" },
      { key: "payments:refund", label: "Process Refunds", description: "Refund student fee payments and issue receipts" },
      { key: "renewals:write", label: "Subscription Renewals", description: "Record student renewals and plan extensions" },
      { key: "expenses:write", label: "Manage Expenses", description: "Log daily office and campus expenses" },
      { key: "income:write", label: "Extra Income & Revenue", description: "Record non-fee revenue, book sales, rentals, penalties" },
      { key: "communication:write", label: "Broadcast & SMS", description: "Send bulk SMS, WhatsApp, and email alerts" },
      { key: "files:write", label: "Document Assets", description: "Upload verification files and agreements" },
    ],
  },
  {
    category: "Administration & Staff Control",
    permissions: [
      { key: "staff:manage", label: "Manage Staff", description: "Add, edit, and deactivate staff and teachers" },
      { key: "staff:roles", label: "Manage Roles", description: "Assign staff designations and departments" },
      { key: "staff:rights", label: "Action Rights", description: "Configure system permissions for staff accounts" },
      { key: "staff:attendance", label: "Staff Attendance", description: "Track daily staff and teacher attendance" },
      { key: "branches:write", label: "Branch Campuses", description: "Configure multi-campus branch locations" },
      { key: "institute:manage", label: "Institute Setup", description: "Modify branding, academic sessions, and core settings" },
      { key: "billing:manage", label: "Subscription & Billing", description: "Manage platform tier subscription and payments" },
      { key: "team:manage", label: "Team Access", description: "Invite administrators and manage staff access accounts" },
    ],
  },
];

const ROLE_PERMISSIONS: Record<InstituteRole, Set<Permission>> = {
  OWNER: new Set<Permission>([
    "students:write",
    "batches:write",
    "faculty:write",
    "faculty:delete",
    "faculty:assign",
    "attendance:write",
    "payments:write",
    "payments:refund",
    "renewals:write",
    "team:manage",
    "billing:manage",
    "files:write",
    "institute:manage",
    "subjects:read",
    "subjects:write",
    "courses:write",
    "branches:write",
    "admissions:read",
    "admissions:write",
    "timetable:write",
    "tests:write",
    "expenses:write",
    "income:write",
    "communication:write",
    "questions:write",
    "studyMaterials:write",
    "assignments:write",
    "live-classes:write",
    "certificates:write",
    "staff:manage",
    "staff:roles",
    "staff:rights",
    "staff:attendance",
  ]),
  ADMIN: new Set<Permission>([
    "students:write",
    "batches:write",
    "faculty:write",
    "faculty:delete",
    "faculty:assign",
    "attendance:write",
    "payments:write",
    "payments:refund",
    "renewals:write",
    "files:write",
    "institute:manage",
    "subjects:read",
    "subjects:write",
    "courses:write",
    "branches:write",
    "admissions:read",
    "admissions:write",
    "timetable:write",
    "tests:write",
    "expenses:write",
    "income:write",
    "communication:write",
    "questions:write",
    "studyMaterials:write",
    "assignments:write",
    "live-classes:write",
    "certificates:write",
    "staff:manage",
    "staff:roles",
    "staff:rights",
    "staff:attendance",
  ]),
  STAFF: new Set<Permission>([
    "attendance:write",
    "payments:write",
    "renewals:write",
    "files:write",
    "subjects:read",
    "admissions:read",
    "tests:write",
    "communication:write",
    "questions:write",
    "studyMaterials:write",
    "assignments:write",
  ]),
  FACULTY: new Set<Permission>([
    "attendance:write",
    "tests:write",
    "questions:write",
    "studyMaterials:write",
    "assignments:write",
    "live-classes:write",
    "subjects:read",
    "files:write",
  ]),
  COUNSELLOR: new Set<Permission>([
    "admissions:read",
    "admissions:write",
    "communication:write",
    "subjects:read",
  ]),
  ACCOUNTANT: new Set<Permission>([
    "payments:write",
    "payments:refund",
    "renewals:write",
    "expenses:write",
    "income:write",
    "files:write",
  ]),
  TECHNICIAN: new Set<Permission>([
    "tests:write",
    "questions:write",
    "studyMaterials:write",
    "files:write",
  ]),
  STUDENT: new Set<Permission>([]),
  PARENT: new Set<Permission>([]),
};

export type UserPermissionContext = {
  role?: string | null;
  permissions?: string[] | null;
  grantedPermissions?: string[] | null;
};

export function hasPermission(
  userOrRole: string | UserPermissionContext | null | undefined,
  permission: Permission,
  explicitPermissions?: string[] | null
): boolean {
  if (!userOrRole) return false;

  let role: string | undefined | null;
  let grantedPermissions: string[] | undefined | null = explicitPermissions;

  if (typeof userOrRole === "string") {
    role = userOrRole;
  } else {
    role = userOrRole.role;
    if (grantedPermissions === undefined || grantedPermissions === null) {
      grantedPermissions = userOrRole.permissions || userOrRole.grantedPermissions;
    }
  }

  if (!role) return false;
  const upper = role.toUpperCase() as InstituteRole;

  // OWNER and ADMIN always retain full access regardless of permissions array
  if (upper === "OWNER" || upper === "ADMIN") {
    const roleSet = ROLE_PERMISSIONS[upper];
    return roleSet ? roleSet.has(permission) : false;
  }

  // If specific permissions are granted / configured for this staff/faculty member
  if (grantedPermissions !== undefined && grantedPermissions !== null) {
    return grantedPermissions.includes(permission);
  }

  // Fallback to role-level default permissions when no specific permissions array was supplied
  const roleSet = ROLE_PERMISSIONS[upper];
  if (!roleSet) return false;
  return roleSet.has(permission);
}