import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { AttendanceView } from "@/components/attendance/AttendanceView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranchImpersonationState } from "@/lib/tenant";

export default async function AttendancePage() {
  const session = await auth();
  const { branchId: activeBranchId } = await getBranchImpersonationState();
  const instituteId = (session?.user as any)?.instituteId as string | null;
  if (!instituteId || !activeBranchId) redirect("/login");

  const [courses, batches, students] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { instituteId, branchId: activeBranchId },
      include: { course: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { instituteId, branchId: activeBranchId },
      select: { id: true, name: true, mobile: true, batchId: true },
    }),
  ]);

  return (
    <Shell title="Attendance" userName={session?.user?.name ?? undefined}>
      <AttendanceView courses={courses} batches={batches} students={students} />
    </Shell>
  );
}