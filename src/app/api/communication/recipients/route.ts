import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const targetAudience = url.searchParams.get("targetAudience") || "ALL_STUDENTS";
  const courseId = url.searchParams.get("courseId");
  const batchId = url.searchParams.get("batchId");
  const leadStage = url.searchParams.get("leadStage");

  type Recipient = {
    id: string;
    name: string;
    mobile: string;
    parentMobile: string | null;
    email: string | null;
    courseName?: string;
    batchName?: string;
    dueAmount?: number;
    type: "STUDENT" | "LEAD";
  };

  const recipients: Recipient[] = [];

  if (targetAudience === "ADMISSION_LEADS") {
    const where: Prisma.AdmissionWhereInput = { instituteId: ctx.instituteId };
    if (leadStage) where.stage = leadStage;
    if (courseId) where.courseId = courseId;

    const leads = await prisma.admission.findMany({
      where,
      include: { course: { select: { name: true } }, batch: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    for (const l of leads) {
      recipients.push({
        id: l.id,
        name: l.applicantName,
        mobile: l.mobile,
        parentMobile: null,
        email: l.email,
        courseName: l.course?.name,
        batchName: l.batch?.name,
        dueAmount: Number(l.feePlan),
        type: "LEAD",
      });
    }
  } else {
    const where: Prisma.StudentWhereInput = {
      instituteId: ctx.instituteId,
      status: "ACTIVE",
    };

    if (courseId) where.courseId = courseId;
    if (batchId) where.batchId = batchId;

    const students = await prisma.student.findMany({
      where,
      include: { course: { select: { name: true } }, batch: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const s of students) {
      const total = Number(s.totalFee);
      const paid = Number(s.paidFee);
      const due = Math.max(total - paid, 0);

      if (targetAudience === "FEE_PENDING" && due <= 0) continue;
      if (targetAudience === "FEE_OVERDUE") {
        if (due <= 0) continue;
        if (!s.dueDate || new Date(s.dueDate) >= today) continue;
      }

      recipients.push({
        id: s.id,
        name: s.name,
        mobile: s.mobile,
        parentMobile: s.parentMobile,
        email: s.email,
        courseName: s.course.name,
        batchName: s.batch?.name,
        dueAmount: due,
        type: "STUDENT",
      });
    }
  }

  return NextResponse.json({
    targetAudience,
    recipientCount: recipients.length,
    recipients,
  });
}
