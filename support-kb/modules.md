# Modules Reference

## Batches
- Model `Batch { branchId, courseId, name, timing, capacity, status }`
- Main Branch multi-select creates separate rows per branch (copy-on-create).

## Timetable
- Model `TimetableSlot { branchId, batchId, facultyId, dayOfWeek, startTime, endTime, room }`
- Scoped per branch; edits check `branchId === activeBranchId` (sub-branch STAFF allowed if same branch).

## Subjects
- Model `Subject { branchId, courseId, name }` unique `[courseId, branchId, name]`. Per-branch.

## Fees & Collection
- Student finance: `totalFee, paidFee, dueDate, installmentPlan`. Payment via `Payment` join `student.branchId`.
- List `WHERE student.branchId === activeBranchId`. Parent sees per-child.

## Tests / CBT
- Model `Test { branchId, batchId, courseId, testDate, startTime, endTime, durationMinutes, status }`
- Results `TestResult` and attempts `StudentTestAttempt`. Time window enforced server-side.

## Live Classes
- Model `LiveClass { branchId, batchId, facultyId, scheduledAt, meetingLink, status }`
- Targeting via `batchId` + `branchId`. Student join requires `isStudentTargeted`.

## Assignments / DPP & Study Material
- Models `Assignment { branchId, batchId, courseId }`, `StudyMaterial { branchId, batchId, courseId }`
- Targeting helper `isStudentTargetedForContent`.

## Branch & Impersonation
- `activeBranchId` = sub-branch locked own, Main defaults to Main Branch id, impersonation via JWT claim `impersonatingBranchId` (4h expiry, per-session, audit logs).
- Only OWNER/ADMIN at Main can impersonate.

## Support & Tickets
- `SupportTicket { instituteId, userId, subject, description, status }`
- Contact fallback: POST /api/support-tickets.
