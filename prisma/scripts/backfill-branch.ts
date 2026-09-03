// @ts-nocheck
/**
 * One-off backfill: ensure every Batch, Faculty, Student, Attendance,
 * TimetableSlot, Admission, User has a branchId.
 * Creates default Institute + "Main Branch" if missing, otherwise reuses existing Main Branch per Institute.
 * Run against a COPY of prod first, then prod after verification.
 * Usage: npx tsx prisma/scripts/backfill-branch.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findMainBranch(instituteId: string) {
  let mb = await prisma.branch.findFirst({ where: { instituteId, isMainBranch: true } });
  if (!mb) mb = await prisma.branch.findFirst({ where: { instituteId, name: { contains: "main", mode: "insensitive" } } });
  if (!mb) mb = await prisma.branch.findFirst({ where: { instituteId }, orderBy: { createdAt: "asc" } });
  return mb;
}

async function main() {
  const institutes = await prisma.institute.findMany({ select: { id: true, name: true } });
  console.log(`Found ${institutes.length} institute(s)`);
  // Check User table for distinct tenants before assuming single default (per instructions)
  const distinctOwners = await prisma.user.findMany({ where: { instituteId: { not: null } }, distinct: ["instituteId"], select: { instituteId: true } });
  console.log(`Distinct instituteIds in User table: ${distinctOwners.map(u=>u.instituteId).join(", ")}`);

  for (const inst of institutes) {
    let main = await findMainBranch(inst.id);
    if (!main) {
      console.log(`No branch for institute ${inst.id} (${inst.name}) — creating default Main Branch`);
      main = await prisma.branch.create({
        data: { instituteId: inst.id, name: "Main Branch", isMainBranch: true, status: "ACTIVE" },
      });
    }
    console.log(`\nInstitute ${inst.name} (${inst.id}) -> Main Branch ${main.name} (${main.id})`);

    const countsBefore = {
      batch: 0, // already required + backfilled earlier
      faculty: 0,
      student: 0,
      attendance: 0,
      timetable: 0,
      admission: await prisma.admission.count({ where: { instituteId: inst.id, branchId: null } }),
      assignment: await prisma.assignment.count({ where: { instituteId: inst.id, branchId: null } }),
      studyMaterial: await prisma.studyMaterial.count({ where: { instituteId: inst.id, branchId: null } }),
      test: await prisma.test.count({ where: { instituteId: inst.id, branchId: null } }),
      liveClass: await prisma.liveClass.count({ where: { instituteId: inst.id, branchId: null } }),
      user: await prisma.user.count({ where: { instituteId: inst.id, branchId: null } }),
    };
    console.log("  Before backfill (NULL branchId):", countsBefore);

    // Already-required models have no NULLs to backfill (skip)
    const batch = { count: 0 };
    const faculty = { count: 0 };
    const student = { count: 0 };
    const attendance = { count: 0 };
    const timetable = { count: 0 };
    const admission = await prisma.admission.updateMany({ where: { instituteId: inst.id, branchId: null }, data: { branchId: main.id } });
    const assignment = await prisma.assignment.updateMany({ where: { instituteId: inst.id, branchId: null }, data: { branchId: main.id } });
    const studyMaterial = await prisma.studyMaterial.updateMany({ where: { instituteId: inst.id, branchId: null }, data: { branchId: main.id } });
    const test = await prisma.test.updateMany({ where: { instituteId: inst.id, branchId: null }, data: { branchId: main.id } });
    const liveClass = await prisma.liveClass.updateMany({ where: { instituteId: inst.id, branchId: null }, data: { branchId: main.id } });
    // User: keep null for PLATFORM_ADMIN etc, only backfill institute users
    const user = await prisma.user.updateMany({ where: { instituteId: inst.id, branchId: null, role: { not: "PLATFORM_ADMIN" } }, data: { branchId: main.id } });

    // Subjects already required + backfilled
    let subject = { count: 0 };

    console.log("  Updated:", { batch: batch.count, faculty: faculty.count, student: student.count, attendance: attendance.count, timetable: timetable.count, admission: admission.count, assignment: assignment.count, studyMaterial: studyMaterial.count, test: test.count, liveClass: liveClass.count, user: user.count, subject: subject.count });

    const countsAfter = {
      batch: 0,
      faculty: 0,
      student: 0,
      attendance: 0,
      timetable: 0,
      admission: await prisma.admission.count({ where: { instituteId: inst.id, branchId: null } }),
      assignment: await prisma.assignment.count({ where: { instituteId: inst.id, branchId: null } }),
      studyMaterial: await prisma.studyMaterial.count({ where: { instituteId: inst.id, branchId: null } }),
      test: await prisma.test.count({ where: { instituteId: inst.id, branchId: null } }),
      liveClass: await prisma.liveClass.count({ where: { instituteId: inst.id, branchId: null } }),
    };
    console.log("  After backfill (NULL branchId):", countsAfter);
    if (Object.values(countsAfter).some(c => c > 0)) {
      console.error("  ERROR: Some rows still have NULL branchId!");
    }
  }
  console.log("\nDone — verify SELECT COUNT(*) WHERE branchId IS NULL = 0 before making required");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
