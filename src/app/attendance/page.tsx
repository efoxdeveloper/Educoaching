import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { AttendanceView } from "@/components/attendance/AttendanceView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState } from "@/lib/tenant";

export default async function AttendancePage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  const { branchId: activeBranchId } = await getBranchImpersonationState();
  if (!instituteId || !activeBranchId) redirect("/login");

  const roleUpper = String((session?.user as { role?: string })?.role || "").toUpperCase();
  const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;

  let facultyFacultyId: string | null = null;
  if (roleUpper === "FACULTY" && sessionUser) {
    const fac = await prisma.faculty.findFirst({
      where: {
        instituteId,
        OR: [
          ...(sessionUser.id ? [{ userId: sessionUser.id }] : []),
          ...(sessionUser.email ? [{ email: { equals: sessionUser.email, mode: "insensitive" as const } }] : []),
        ],
      },
      select: { id: true },
    });
    facultyFacultyId = fac?.id || null;
  }

  const facultyBatchIds = facultyFacultyId
    ? (
        await prisma.batchFaculty.findMany({
          where: { instituteId, facultyId: facultyFacultyId },
          select: { batchId: true },
        })
      ).map((r) => r.batchId)
    : [];

  // Also batches where faculty is primary via BatchFaculty? No, Batch model uses BatchFaculty only now (no facultyId field)
  // So filter batches where id in facultyBatchIds

  const batchWhere: any = { instituteId, branchId: activeBranchId };
  // We'll apply faculty filter after fetching if needed via in-memory, but for query we can filter by id in list
  // If FACULTY and facultyFacultyId exists, restrict to assigned batches

  const [courses, allBatches, allStudents] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: batchWhere,
      include: { course: true, faculty: { select: { facultyId: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { instituteId, branchId: activeBranchId },
      select: { id: true, name: true, mobile: true, batchId: true },
    }),
  ]);

  const batches = facultyFacultyId
    ? allBatches.filter((b) => facultyBatchIds.includes(b.id) || (b as any).faculty?.some((f: any) => f.facultyId === facultyFacultyId))
    : allBatches;

  // If faculty, only students in allowed batches
  const allowedBatchIdSet = new Set(batches.map((b) => b.id));
  const students = facultyFacultyId ? allStudents.filter((s) => s.batchId && allowedBatchIdSet.has(s.batchId)) : allStudents;

  return (
    <Shell title="Attendance" userName={session?.user?.name ?? undefined}>
      <AttendanceView courses={courses} batches={batches} students={students} />
    </Shell>
  );
}