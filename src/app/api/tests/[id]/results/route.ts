import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const perm = await requirePermission("tests:write");
  if ("error" in perm) return perm.error;

  const testId = params.id;

  try {
    const test = await prisma.test.findFirst({
      where: { id: testId, instituteId: perm.instituteId },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const body = await req.json();
    const { records } = body as {
      records: {
        studentId: string;
        marksObtained: number | null;
        isAbsent: boolean;
        remarks?: string;
      }[];
    };

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: "Records must be an array" }, { status: 400 });
    }

    // Validate marks
    for (const r of records) {
      if (!r.isAbsent && r.marksObtained !== null && r.marksObtained !== undefined) {
        const mark = Number(r.marksObtained);
        if (isNaN(mark) || mark < 0 || mark > test.totalMarks) {
          return NextResponse.json(
            {
              error: `Marks for student must be between 0 and total marks (${test.totalMarks})`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Upsert all student results in a database transaction
    await prisma.$transaction(
      records.map((r) => {
        const isAbsent = Boolean(r.isAbsent);
        const marks =
          isAbsent || r.marksObtained === null || r.marksObtained === undefined
            ? null
            : Number(r.marksObtained);

        return prisma.testResult.upsert({
          where: {
            testId_studentId: {
              testId,
              studentId: r.studentId,
            },
          },
          update: {
            marksObtained: marks,
            isAbsent,
            remarks: r.remarks ? r.remarks.trim() : null,
          },
          create: {
            testId,
            studentId: r.studentId,
            marksObtained: marks,
            isAbsent,
            remarks: r.remarks ? r.remarks.trim() : null,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: "Marks saved successfully",
      savedCount: records.length,
    });
  } catch (error) {
    console.error("Error saving test results:", error);
    return NextResponse.json({ error: "Failed to save marks" }, { status: 500 });
  }
}
