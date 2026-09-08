// @ts-nocheck
/**
 * One-off backfill: fix Students, Attendance, and Batches with branchId: null or unlinked branch.
 * Caused by AddStudentDrawer single-branch bug where form.branchId stayed "" -> null.
 * For each institute, finds the Main Branch and sets branchId for Students, Attendance, and Batches where branchId is null.
 * Also ensures batches are linked in the many-to-many `branches` relation.
 * Run: npx tsx prisma/scripts/backfill-student-branch.ts
 * Safe to re-run (idempotent).
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
  console.log("==================================================");
  console.log("STARTING BRANCH DATA AUDIT & BACKFILL");
  console.log("==================================================\n");

  const institutes = await prisma.institute.findMany({ select: { id: true, name: true } });
  console.log(`Found ${institutes.length} institute(s) in database.\n`);

  let totalStudentsFixed = 0;
  let totalAttendanceFixed = 0;
  let totalBatchesFixed = 0;
  let totalBatchBranchesLinked = 0;

  for (const inst of institutes) {
    const mainBranch = await findMainBranch(inst.id);
    if (!mainBranch) {
      console.log(`[INSTITUTE] ${inst.name} (${inst.id}) — No Main Branch found! Skipping.\n`);
      continue;
    }
    console.log(`[INSTITUTE] ${inst.name} (${inst.id})`);
    console.log(`  -> Main Branch: "${mainBranch.name}" (${mainBranch.id})`);

    // 1. Audit & Fix Students with NULL or empty branchId
    const nullStudentsRaw: any = await prisma.$queryRaw`
      SELECT id, name, mobile
      FROM "Student"
      WHERE "instituteId" = ${inst.id} AND ("branchId" IS NULL OR "branchId" = '');
    `;
    console.log(`  -> Students with NULL/empty branchId: ${nullStudentsRaw.length}`);
    if (nullStudentsRaw.length > 0) {
      const studentIds = nullStudentsRaw.map((s: any) => s.id);
      const updateResult = await prisma.student.updateMany({
        where: { id: { in: studentIds } },
        data: { branchId: mainBranch.id },
      });
      console.log(`     Fixed ${updateResult.count} student(s) -> set branchId = ${mainBranch.id}`);
      totalStudentsFixed += updateResult.count;
    }

    // 2. Audit & Fix Attendance with NULL or empty branchId
    const nullAttendanceRaw: any = await prisma.$queryRaw`
      SELECT count(*) as count
      FROM "Attendance"
      WHERE "instituteId" = ${inst.id} AND ("branchId" IS NULL OR "branchId" = '');
    `;
    const nullAttendanceCount = Number(nullAttendanceRaw[0]?.count || 0);
    console.log(`  -> Attendance records with NULL/empty branchId: ${nullAttendanceCount}`);
    if (nullAttendanceCount > 0) {
      const updateResult: any = await prisma.$executeRaw`
        UPDATE "Attendance"
        SET "branchId" = ${mainBranch.id}
        WHERE "instituteId" = ${inst.id} AND ("branchId" IS NULL OR "branchId" = '');
      `;
      console.log(`     Fixed ${updateResult} attendance record(s) -> set branchId = ${mainBranch.id}`);
      totalAttendanceFixed += Number(updateResult);
    }

    // 3. Audit & Fix Batches with NULL or empty branchId
    const nullBatchesRaw: any = await prisma.$queryRaw`
      SELECT id, name
      FROM "Batch"
      WHERE "instituteId" = ${inst.id} AND ("branchId" IS NULL OR "branchId" = '');
    `;
    console.log(`  -> Batches with NULL/empty branchId: ${nullBatchesRaw.length}`);
    if (nullBatchesRaw.length > 0) {
      const batchIds = nullBatchesRaw.map((b: any) => b.id);
      const updateResult = await prisma.batch.updateMany({
        where: { id: { in: batchIds } },
        data: { branchId: mainBranch.id },
      });
      console.log(`     Fixed ${updateResult.count} batch(es) -> set branchId = ${mainBranch.id}`);
      totalBatchesFixed += updateResult.count;
    }

    // 4. Audit Batch many-to-many `branches` relation
    // Check all batches for this institute that have branchId set but are not yet linked in `branches` relation
    const batchesForInst = await prisma.batch.findMany({
      where: { instituteId: inst.id },
      include: { branches: { select: { id: true } } },
    });
    for (const b of batchesForInst) {
      if (b.branchId && b.branches.length === 0) {
        await prisma.batch.update({
          where: { id: b.id },
          data: { branches: { connect: { id: b.branchId } } },
        });
        totalBatchBranchesLinked++;
        console.log(`     Linked Batch "${b.name}" (${b.id}) to branch ${b.branchId} in many-to-many relation`);
      }
    }

    // 5. Verify remaining nulls for this institute
    const remainingStudents: any = await prisma.$queryRaw`
      SELECT count(*) as count FROM "Student" WHERE "instituteId" = ${inst.id} AND ("branchId" IS NULL OR "branchId" = '');
    `;
    const remainingAttendance: any = await prisma.$queryRaw`
      SELECT count(*) as count FROM "Attendance" WHERE "instituteId" = ${inst.id} AND ("branchId" IS NULL OR "branchId" = '');
    `;
    const remainingBatches: any = await prisma.$queryRaw`
      SELECT count(*) as count FROM "Batch" WHERE "instituteId" = ${inst.id} AND ("branchId" IS NULL OR "branchId" = '');
    `;

    console.log(`  -> Verification: Remaining NULLs for ${inst.name}:`);
    console.log(`     Students: ${remainingStudents[0]?.count}, Attendance: ${remainingAttendance[0]?.count}, Batches: ${remainingBatches[0]?.count}\n`);
  }

  console.log("==================================================");
  console.log("DATA BACKFILL COMPLETE");
  console.log("==================================================");
  console.log(`Exact counts of affected rows fixed:`);
  console.log(`- Students branchId fixed:       ${totalStudentsFixed}`);
  console.log(`- Attendance branchId fixed:     ${totalAttendanceFixed}`);
  console.log(`- Batches branchId fixed:        ${totalBatchesFixed}`);
  console.log(`- Batch branches (m:m) linked:   ${totalBatchBranchesLinked}`);
  console.log("==================================================\n");
}

main()
  .catch((e) => {
    console.error("Backfill script error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
