import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { AttendanceView } from "@/components/attendance/AttendanceView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function AttendancePage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const [courses, batches, students] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { instituteId },
      include: { course: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { instituteId },
      select: { id: true, name: true, mobile: true, batchId: true },
    }),
  ]);

  return (
    <Shell title="Attendance" userName={session?.user?.name ?? undefined}>
      <AttendanceView courses={courses} batches={batches} students={students} />
    </Shell>
  );
}