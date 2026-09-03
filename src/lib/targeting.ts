import { prisma } from "@/lib/prisma";

/**
 * Shared targeting helper — checks if a student is in the audience for a content item.
 * All content types have branchId (required), plus targeting via batchId/courseId.
 * This is the single source of truth for student-facing visibility — never rely on list filtering alone.
 */

type TargetContent = {
  branchId: string | null;
  batchId?: string | null;
  courseId?: string | null;
};

type StudentInfo = {
  branchId: string | null;
  batchId: string | null;
  courseId: string;
};

export function isStudentTargetedForContent(content: TargetContent, student: StudentInfo): boolean {
  // Branch must match — strict isolation
  if (!content.branchId || !student.branchId) return false;
  if (content.branchId !== student.branchId) return false;

  // If content targets a specific batch, student must be in that batch
  if (content.batchId) {
    return content.batchId === student.batchId;
  }
  // If no batch but targets a course, student must be in that course
  if (content.courseId) {
    return content.courseId === student.courseId;
  }
  // If neither batch nor course specified, it's branch-wide (all students in branch)
  return true;
}

export async function isStudentTargeted(
  contentType: "assignment" | "studyMaterial" | "test" | "liveClass",
  contentId: string,
  studentId: string
): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { branchId: true, batchId: true, courseId: true },
  });
  if (!student) return false;

  let content: TargetContent | null = null;

  if (contentType === "assignment") {
    const a = await prisma.assignment.findUnique({ where: { id: contentId }, select: { branchId: true, batchId: true, courseId: true } });
    if (a) content = a;
  } else if (contentType === "studyMaterial") {
    const m = await prisma.studyMaterial.findUnique({ where: { id: contentId }, select: { branchId: true, batchId: true, courseId: true } });
    if (m) content = m;
  } else if (contentType === "test") {
    const t = await prisma.test.findUnique({ where: { id: contentId }, select: { branchId: true, batchId: true, courseId: true } });
    if (t) content = t;
  } else if (contentType === "liveClass") {
    const l = await prisma.liveClass.findUnique({ where: { id: contentId }, select: { branchId: true, batchId: true, courseId: true } });
    if (l) content = l;
  }

  if (!content) return false;
  return isStudentTargetedForContent(content, student as StudentInfo);
}

/**
 * For parent portal: get all child studentIds linked to a parent user, then check each.
 * Returns map of contentId -> array of child names for which it's targeted, for labeling.
 */
export async function getParentTargetedContent(
  parentUserId: string,
  contentType: "assignment" | "studyMaterial" | "test" | "liveClass"
): Promise<Map<string, string[]>> {
  const links = await (prisma as any).parentStudentLink.findMany({
    where: { parentUserId },
    include: { student: { select: { id: true, name: true, branchId: true, batchId: true, courseId: true } } },
  });
  const students = links.map((l: any) => l.student).filter(Boolean);
  if (students.length === 0) return new Map();

  let contents: any[] = [];
  if (contentType === "assignment") {
    contents = await prisma.assignment.findMany({ select: { id: true, branchId: true, batchId: true, courseId: true } });
  } else if (contentType === "studyMaterial") {
    contents = await prisma.studyMaterial.findMany({ select: { id: true, branchId: true, batchId: true, courseId: true } });
  } else if (contentType === "test") {
    contents = await prisma.test.findMany({ select: { id: true, branchId: true, batchId: true, courseId: true } });
  } else if (contentType === "liveClass") {
    contents = await prisma.liveClass.findMany({ select: { id: true, branchId: true, batchId: true, courseId: true } });
  }

  const map = new Map<string, string[]>();
  for (const content of contents) {
    const targetedChildren: string[] = [];
    for (const s of students) {
      if (isStudentTargetedForContent(content, s)) {
        targetedChildren.push(s.name);
      }
    }
    if (targetedChildren.length > 0) {
      map.set(content.id, targetedChildren);
    }
  }
  return map;
}
