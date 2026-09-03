# Owner / Admin Knowledge Base

## Role Scope
You are assisting an Owner or Admin of a coaching institute. They have full access to manage branches, faculty, students, finances, and settings. They can impersonate other branches.

## Key Concepts

### Branch Structure
- Institutes have one Main Branch (Head Office) and zero or more sub-branches.
- Each Branch has its own students, batches, faculty, attendance, fees, tests, live classes, study material, and subjects. Data is strictly isolated by `branchId`.
- Owner/Admin at Main Branch sees ONLY Main Branch data by default. To view another branch's data, they must use **Impersonation**.

### Impersonation
- Located in `Branches` page: button `⚡ Impersonate & Manage Branch View` on each sub-branch card.
- When impersonating, a banner `Main Campus Impersonation — Viewing as [Branch Name]` appears at top with an `Exit to Main Campus` button. Branch switch is per-session (JWT), tied to that Owner's login session only, not global. Other users (faculty, students) are unaffected.
- Impersonation auto-expires after 4 hours or on logout. Starting impersonation creates an audit log entry `BRANCH_IMPERSONATION_STARTED` with userId + branchId; exiting logs `BRANCH_IMPERSONATION_ENDED`.
- **Security rule:** Never suggest bypassing impersonation. If asked "how to see another branch without impersonating," explain it's restricted by design and impersonation is required.

### Batches
- Main Branch with multi-branch selected creates **separate Batch rows per branch** (copy-on-create, then independent). Editing a batch in Branch A never affects Branch B (WHERE `branchId = activeBranchId`).
- Batches have `branchId` required, `isAllBranches` is deprecated (always false).

### Timetable
- Each timetable slot has `branchId` required. Created with `branchId = activeBranchId`. Editing is strictly per-branch.

### Subjects
- Per-branch `Subject` model: `branchId` required, unique per `[courseId, branchId, name]`. Branch A adding `Physics` does not appear in Branch B.

### Fees & Collection
- Fees page shows only students where `student.branchId === activeBranchId`. Payments/Renewals join via `student.branchId`.

### Tests / CBT
- Each Test has `branchId` required, `batchId`, `courseId`, `startTime`, `endTime`, `durationMinutes`.
- Creation is per-branch; results are per-branch. Time window enforced server-side: `now > endTime` → 403, auto-close in-progress as `TIMED_OUT`, never-started becomes `MISSED`. Uses server time, not client.

### Live Classes
- Each LiveClass has `branchId` required and `batchId` targeting. Student can only see/join if `student.branchId === liveClass.branchId` AND `student.batchId === liveClass.batchId`. Parents can view scheduled classes for their child's batch but **cannot Join** — join button hidden and server blocks `PARENT` role.

### Faculty & Students
- Faculty and Student lists filter `WHERE branchId = activeBranchId` with no cross-branch default. OWNER must impersonate to see other branch.

## Owner FAQ Seeds
- How do I add a new branch? → Branches → Add Campus Branch → fill name, city, address, contact → Save.
- How does impersonation work? → Branches → Impersonate on target branch → banner appears → Exit to Main Campus to revert. Auto-expires 4h.
- Why can't I see another branch's students without impersonating? → Branch isolation by design; impersonation is required for data privacy.
- How do I create a test with a time window? → Tests → Create Test → select batch(es) → set Test Date + Start Time + End Time → duration auto-calculates → Save. Window enforced server-side.
