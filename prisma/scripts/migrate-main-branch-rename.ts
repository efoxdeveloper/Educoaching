// @ts-nocheck
/**
 * One-off migration: rename stale Main Branch rows from "Main Campus" to correct convention.
 * Correct name: `${institute.name} (Main Branch)` (as used in signup route and setup wizard).
 * Finds every Branch where isMainBranch: true and renames if it doesn't match that pattern.
 * Run: npx tsx prisma/scripts/migrate-main-branch-rename.ts
 * Safe to re-run (idempotent) — only updates where name !== expected.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    where: { isMainBranch: true },
    include: { institute: { select: { id: true, name: true } } },
  });

  console.log(`Found ${branches.length} Main Branch row(s) (isMainBranch=true)`);

  let updated = 0;
  let skipped = 0;

  for (const branch of branches) {
    const instituteName = branch.institute?.name?.trim() || "Institute";
    const expected = `${instituteName} (Main Branch)`;

    // Consider correct if already exactly expected, or already ends with "(Main Branch)" and starts with institute name
    // For hardening, we strictly enforce `${institute.name} (Main Branch)` as the canonical name
    if (branch.name === expected) {
      console.log(`  SKIP: ${branch.id} already correct: "${branch.name}"`);
      skipped++;
      continue;
    }

    // Also consider already correct if name contains "(Main Branch)" and institute name is present — but spec says enforce exact pattern
    // So we rename any isMainBranch row that doesn't exactly match expected, including stale "Main Campus" variants
    const isStale = branch.name.includes("Main Campus") || branch.name !== expected;
    if (!isStale) {
      console.log(`  SKIP: ${branch.id} "${branch.name}" already matches expected pattern`);
      skipped++;
      continue;
    }

    console.log(`  UPDATE: ${branch.id} "${branch.name}" -> "${expected}" (institute: ${branch.institute?.name})`);
    await prisma.branch.update({
      where: { id: branch.id },
      data: { name: expected },
    });
    updated++;
  }

  console.log(`\nDone — updated: ${updated}, skipped: ${skipped}, total: ${branches.length}`);
  if (updated === 0) {
    console.log("No stale Main Campus branches found — all Main Branch names already correct.");
  } else {
    console.log(`Corrected ${updated} stale Main Branch name(s) to canonical "\${institute.name} (Main Branch)" convention.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
