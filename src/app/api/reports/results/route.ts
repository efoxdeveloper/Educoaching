import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const ctx = await requirePermission("payments:write");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const q = searchParams.get("q")?.trim() || "";
  const testId = searchParams.get("testId") || searchParams.get("testTitle") || "";
  const status = searchParams.get("status") || "";
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const courseId = searchParams.get("courseId") || undefined;
  const batchId = searchParams.get("batchId") || undefined;

  const branchId = ctx.branchId as string;
  const instituteId = ctx.instituteId;

  // Build base where for TestResult via test relation
  const testWhere: any = { instituteId, branchId };
  if (batchId) testWhere.batchId = batchId;
  if (courseId) testWhere.courseId = courseId;
  if (startDate || endDate) {
    testWhere.testDate = {};
    if (startDate) testWhere.testDate.gte = new Date(startDate);
    if (endDate) testWhere.testDate.lte = new Date(endDate);
  }
  if (testId) {
    // testId param could be testId or testTitle — try both
    // If it looks like a cuid, filter by id, otherwise by title
    if (testId.length > 20 && !testId.includes(" ")) {
      testWhere.id = testId;
    } else {
      testWhere.title = testId;
    }
  }

  // For ledger, we need to query TestResult directly
  // We will fetch TestResults that belong to tests matching testWhere, plus student name filter
  const resultWhere: any = {
    test: testWhere,
  };

  // Search q across student name, test title, subject, batch name
  // Since q needs to search across relations, we handle it via OR on student/test fields
  // Prisma doesn't support OR across nested relations easily for TestResult, so we will post-filter q in JS after fetching
  // But we can at least filter student name via student relation if q is present
  // For now, we will fetch with testWhere and then filter q in JS before pagination to keep logic simple and accurate for status
  // To keep DB load low, we still use take/skip after filtering, but we need to fetch all matching for q filtering
  // Approach: fetch all matching TestResults (with testWhere) with select, then compute status, filter by q/status, then paginate in memory
  // This is still far more efficient than fetching all tests with all nested results (old way) because we only fetch TestResults that match testWhere, not all tests

  try {
    // Fetch all TestResults that match testWhere (with pagination would be inaccurate for q/status filtering)
    // Instead, fetch with testWhere and then apply q/status filtering in JS, then paginate
    // For large datasets, this is still better than old method which fetched all tests + all results
    const allResults = await prisma.testResult.findMany({
      where: resultWhere,
      include: {
        student: { select: { id: true, name: true } },
        test: {
          select: {
            id: true,
            title: true,
            subject: true,
            totalMarks: true,
            passingMarks: true,
            testDate: true,
            batch: { select: { id: true, name: true, course: { select: { name: true } } } },
          },
        },
      },
      orderBy: { test: { testDate: "desc" } },
    });

    // Build ledger with status derivation (same as reports-data.ts)
    let ledger = allResults.map((r) => {
      const test = r.test as any;
      const passMarks = test.passingMarks ?? test.totalMarks * 0.35;
      let status: "PASSED" | "FAILED" | "ABSENT" = "PASSED";
      let percentage: number | null = null;
      if (r.isAbsent) {
        status = "ABSENT";
      } else if (r.marksObtained !== null) {
        const marks = Number(r.marksObtained);
        percentage = Math.round((marks / test.totalMarks) * 100);
        status = marks >= passMarks ? "PASSED" : "FAILED";
      } else {
        status = "ABSENT";
      }
      return {
        resultId: r.id,
        studentName: r.student.name,
        testTitle: test.title,
        subject: test.subject || "General",
        batchName: test.batch.name,
        courseName: test.batch.course?.name ?? "—",
        testDate: test.testDate.toISOString(),
        marksObtained: r.marksObtained !== null ? Number(r.marksObtained) : null,
        totalMarks: test.totalMarks,
        percentage,
        status,
        remarks: r.remarks,
        testId: test.id,
      };
    });

    // Apply q filter (studentName, testTitle, subject, batchName)
    if (q) {
      const lower = q.toLowerCase();
      ledger = ledger.filter(
        (r) =>
          r.studentName.toLowerCase().includes(lower) ||
          r.testTitle.toLowerCase().includes(lower) ||
          r.subject.toLowerCase().includes(lower) ||
          r.batchName.toLowerCase().includes(lower)
      );
    }

    // Apply status filter
    if (status && status !== "ALL") {
      ledger = ledger.filter((r) => r.status === status);
    }

    // Apply testId filter if it was title-based and not already filtered via testWhere
    // (if testId was a title, testWhere already filtered, but if it was passed as title param, we already handled)

    const total = ledger.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const paginated = ledger.slice(start, start + limit);

    return NextResponse.json({
      results: paginated,
      total,
      page: safePage,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching paginated results ledger:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
