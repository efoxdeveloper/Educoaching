import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, mobile, email, parentMobile } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Student name is required" }, { status: 400 });
    }

    const cleanMobile = String(mobile || "").trim().replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length < 10) {
      return NextResponse.json({ error: "Valid 10-digit mobile number is required" }, { status: 400 });
    }

    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        batch: { select: { id: true, name: true, courseId: true, branchId: true } },
        questions: {
          include: { question: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if student already exists in this institute by mobile
    let student = await prisma.student.findFirst({
      where: {
        instituteId: test.instituteId,
        mobile: cleanMobile,
      },
    });

    if (!student) {
      // Create new student record — use batch's branch as branch context (required after backfill)
      let effectiveBranchId = (test.batch as any).branchId as string | null;
      if (!effectiveBranchId) {
        const fallback = await prisma.branch.findFirst({ where: { instituteId: test.instituteId }, orderBy: { createdAt: "asc" }, select: { id: true } });
        effectiveBranchId = fallback?.id ?? null;
      }
      student = await prisma.student.create({
        data: {
          instituteId: test.instituteId,
          branchId: effectiveBranchId as string,
          name: String(name).trim(),
          mobile: cleanMobile,
          email: email ? String(email).trim() : null,
          parentMobile: parentMobile ? String(parentMobile).trim() : null,
          courseId: test.courseId || test.batch.courseId,
          batchId: test.batchId,
          status: "ACTIVE",
          totalFee: 0,
          paidFee: 0,
        },
      });

      // Also log as an Admission lead for CRM prospective tracking
      try {
        await prisma.admission.create({
          data: {
            instituteId: test.instituteId,
            applicantName: student.name,
            mobile: student.mobile,
            email: student.email,
            courseId: student.courseId,
            batchId: student.batchId,
            source: "WHATSAPP_EXAM",
            stage: "DEMO_SCHEDULED",
            feePlan: 0,
            note: `Registered directly via WhatsApp exam link for: ${test.title}`,
            studentId: student.id,
          },
        });
      } catch (leadErr) {
        console.error("Failed to auto-log lead for exam registration:", leadErr);
      }
    }

    // Check if student already attempted this test
    const existingAttempt = await prisma.studentTestAttempt.findUnique({
      where: {
        testId_studentId: {
          testId: test.id,
          studentId: student.id,
        },
      },
    });

    if (existingAttempt && existingAttempt.status === "SUBMITTED") {
      return NextResponse.json({
        isAlreadyCompleted: true,
        studentId: student.id,
        studentName: student.name,
        attempt: existingAttempt,
      });
    }

    // Initialize or continue attempt
    await prisma.studentTestAttempt.upsert({
      where: {
        testId_studentId: {
          testId: test.id,
          studentId: student.id,
        },
      },
      update: {
        status: "IN_PROGRESS",
      },
      create: {
        testId: test.id,
        studentId: student.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    // Return exam paper WITHOUT leaking correct answers
    const secureQuestions = test.questions.map((tq) => ({
      id: tq.question.id,
      order: tq.order,
      section: tq.section,
      subject: tq.question.subject,
      topic: tq.question.topic,
      difficulty: tq.question.difficulty,
      questionText: tq.question.questionText,
      options: tq.question.options,
      marks: tq.question.marks,
      negativeMarks: tq.question.negativeMarks,
    }));

    return NextResponse.json({
      success: true,
      studentId: student.id,
      studentName: student.name,
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        durationMinutes: test.durationMinutes || 60,
        totalMarks: test.totalMarks,
        negativeMarks: test.negativeMarks !== null ? test.negativeMarks : 1,
        marksPerQuestion: test.marksPerQuestion || 4,
      },
      questions: secureQuestions,
      isAlreadyCompleted: false,
    });
  } catch (error) {
    console.error("Error in exam registration:", error);
    return NextResponse.json({ error: "Failed to register for exam" }, { status: 500 });
  }
}
