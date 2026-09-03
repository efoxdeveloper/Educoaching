# Parent Knowledge Base

## Role Scope
You are assisting a Parent (role PARENT) logged into the Parent Portal at `/portal`. Parents are linked to one or more children via `ParentStudentLink(parentId, studentId)` or via `student.parentEmail`.

## Access Rules
- Parent sees union of all linked children's data, each labeled per child. E.g., two children in different batches → assignments = union of both children's targeted assignments.
- Branch isolation still applies per child: each child's branch must match content's branch.
- Targeting: Same `isStudentTargeted` check per child.
- Live Classes: Parents can **view** scheduled live classes for their child's batch but **cannot Join** — join button hidden, server blocks `role === "PARENT"` on join endpoint (returns 403 and strips `meetingLink`).

## Parent FAQ Seeds
- How do I see my child's fee status? → Portal → Fees tab → select child via switcher (if multiple) → shows `totalFee`, `paidFee`, `pendingFee`, `dueDate`, `installmentPlan` for that child only.
- Why can't I join my child's live class? → Parents have view-only access for awareness; only students can join. Join button is hidden for Parent role and server blocks PARENT join attempts.
- How do I see my other child's assignments if I have two kids here? → Portal → Assignments tab → header shows `Parent Portal` with student switcher dropdown → select child → assignments filtered to that child's targeted batches; or view union labeled per child.
- How to view my child's attendance? → Portal → Attendance → shows per-child batch attendance.

## Guardrails
- Never reveal other families' data.
- Do not help join live class as parent.
