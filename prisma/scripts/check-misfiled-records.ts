// @ts-nocheck
/**
 * Audit script: Identifies students, batches, and attendance records created during
 * a sub-branch impersonation window that were inadvertently misfiled under the Main Branch.
 *
 * It cross-references AuditLog entries ("BRANCH_IMPERSONATION_STARTED" and "BRANCH_IMPERSONATION_ENDED")
 * against Student, Attendance, and Batch records created by the same actor during the impersonation interval.
 *
 * Run: npx tsx prisma/scripts/check-misfiled-records.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface ImpersonationSession {
  instituteId: string;
  userId: string | null;
  actorName: string;
  targetBranchId: string;
  targetBranchName: string;
  mainBranchId: string;
  mainBranchName: string;
  startTime: Date;
  endTime: Date;
}

async function findMainBranch(instituteId: string) {
  let mb = await prisma.branch.findFirst({ where: { instituteId, isMainBranch: true } });
  if (!mb) mb = await prisma.branch.findFirst({ where: { instituteId, name: { contains: "main", mode: "insensitive" } } });
  if (!mb) mb = await prisma.branch.findFirst({ where: { instituteId }, orderBy: { createdAt: "asc" } });
  return mb;
}

async function main() {
  console.log("================================================================");
  console.log("AUDITING MISFILED RECORDS CREATED DURING BRANCH IMPERSONATION");
  console.log("================================================================\n");

  // Fetch all branch impersonation logs
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["BRANCH_IMPERSONATION_STARTED", "BRANCH_IMPERSONATION_ENDED"] },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${logs.length} branch impersonation audit log entries.\n`);

  if (logs.length === 0) {
    console.log("No branch impersonation events recorded in AuditLog.");
    console.log("No records to cross-reference.");
    return;
  }

  // Build impersonation sessions
  const sessions: ImpersonationSession[] = [];
  const openSessions = new Map<string, any>(); // key: `${instituteId}:${userId}`

  for (const log of logs) {
    const key = `${log.instituteId}:${log.userId}`;

    if (log.action === "BRANCH_IMPERSONATION_STARTED" && log.entityId) {
      // If there's an existing open session, close it at this log's timestamp
      if (openSessions.has(key)) {
        const prev = openSessions.get(key);
        prev.endTime = log.createdAt;
        sessions.push(prev);
        openSessions.delete(key);
      }

      const mainBranch = await findMainBranch(log.instituteId!);
      const targetBranch = await prisma.branch.findUnique({
        where: { id: log.entityId },
        select: { id: true, name: true, isMainBranch: true },
      });

      // Only care about sessions impersonating non-main (satellite) branches
      if (targetBranch && !targetBranch.isMainBranch && mainBranch && targetBranch.id !== mainBranch.id) {
        openSessions.set(key, {
          instituteId: log.instituteId!,
          userId: log.userId,
          actorName: log.actorName,
          targetBranchId: targetBranch.id,
          targetBranchName: targetBranch.name,
          mainBranchId: mainBranch.id,
          mainBranchName: mainBranch.name,
          startTime: log.createdAt,
          endTime: new Date(log.createdAt.getTime() + 4 * 60 * 60 * 1000), // default 4hr max
        });
      }
    } else if (log.action === "BRANCH_IMPERSONATION_ENDED") {
      if (openSessions.has(key)) {
        const open = openSessions.get(key);
        open.endTime = log.createdAt;
        sessions.push(open);
        openSessions.delete(key);
      }
    }
  }

  // Push any remaining open sessions
  for (const open of openSessions.values()) {
    sessions.push(open);
  }

  console.log(`Identified ${sessions.length} satellite branch impersonation session(s).\n`);

  let totalSuspectStudents = 0;
  let totalSuspectAttendance = 0;
  let totalSuspectBatches = 0;

  const suspectReport: any[] = [];

  for (const session of sessions) {
    // 1. Check students created during this session that ended up in Main Branch
    const suspectStudents = await prisma.student.findMany({
      where: {
        instituteId: session.instituteId,
        createdAt: {
          gte: session.startTime,
          lte: session.endTime,
        },
        branchId: session.mainBranchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        createdAt: true,
        branchId: true,
      },
    });

    // 2. Check attendance marked during this session under Main Branch
    const suspectAttendance = await prisma.attendance.findMany({
      where: {
        instituteId: session.instituteId,
        createdAt: {
          gte: session.startTime,
          lte: session.endTime,
        },
        branchId: session.mainBranchId,
      },
      select: {
        id: true,
        date: true,
        status: true,
        createdAt: true,
        studentId: true,
        student: { select: { id: true, name: true, branchId: true } },
      },
    });

    // 3. Check batches created during this session under Main Branch
    const suspectBatches = await prisma.batch.findMany({
      where: {
        instituteId: session.instituteId,
        createdAt: {
          gte: session.startTime,
          lte: session.endTime,
        },
        branchId: session.mainBranchId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (suspectStudents.length > 0 || suspectAttendance.length > 0 || suspectBatches.length > 0) {
      totalSuspectStudents += suspectStudents.length;
      totalSuspectAttendance += suspectAttendance.length;
      totalSuspectBatches += suspectBatches.length;

      suspectReport.push({
        session: {
          actor: session.actorName,
          targetBranch: `${session.targetBranchName} (${session.targetBranchId})`,
          mainBranch: `${session.mainBranchName} (${session.mainBranchId})`,
          window: `${session.startTime.toISOString()} -> ${session.endTime.toISOString()}`,
        },
        students: suspectStudents,
        attendance: suspectAttendance,
        attendanceCount: suspectAttendance.length,
        batches: suspectBatches,
      });
    }
  }

  if (suspectReport.length === 0) {
    console.log("================================================================");
    console.log("AUDIT RESULT: CLEAN");
    console.log("No students, batches, or attendance records were created under");
    console.log("Main Branch during any sub-branch impersonation window.");
    console.log("================================================================");
  } else {
    console.log("================================================================");
    console.log("AUDIT RESULT: SUSPECT RECORDS FOUND FOR MANUAL REVIEW");
    console.log("================================================================\n");
    console.log(`Total Suspect Students:   ${totalSuspectStudents}`);
    console.log(`Total Suspect Attendance: ${totalSuspectAttendance}`);
    console.log(`Total Suspect Batches:    ${totalSuspectBatches}\n`);

    for (const item of suspectReport) {
      console.log(`[SESSION] Actor: ${item.session.actor}`);
      console.log(`  Target Sub-Branch: ${item.session.targetBranch}`);
      console.log(`  Window: ${item.session.window}`);
      if (item.students.length > 0) {
        console.log("  Suspect Students created (currently under Main Branch):");
        for (const s of item.students) {
          console.log(`    - ID: ${s.id} | Name: ${s.name} | CreatedAt: ${s.createdAt.toISOString()}`);
        }
      }
      if (item.batches.length > 0) {
        console.log("  Suspect Batches created (currently under Main Branch):");
        for (const b of item.batches) {
          console.log(`    - ID: ${b.id} | Name: ${b.name} | CreatedAt: ${b.createdAt.toISOString()}`);
        }
      }
      if (item.attendance && item.attendance.length > 0) {
        console.log(`  Suspect Attendance rows (${item.attendance.length}):`);
        for (const a of item.attendance) {
          console.log(`    - ID: ${a.id} | Student: ${a.student?.name || a.studentId} | Date: ${a.date.toISOString().slice(0, 10)} | Status: ${a.status} | CreatedAt: ${a.createdAt.toISOString()}`);
        }
      }
      console.log("");
    }
  }
}

main()
  .catch((e) => {
    console.error("Error running audit script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
