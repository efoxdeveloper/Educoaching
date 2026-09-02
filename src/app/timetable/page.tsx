import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { TimetableView } from "@/components/timetable/TimetableView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";

export default async function TimetablePage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canManage = hasPermission(role, "timetable:write");

  const [courses, slots, batches, faculty] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.timetableSlot.findMany({
      where: { instituteId },
      include: {
        batch: { select: { id: true, name: true, timing: true, course: { select: { id: true, name: true } } } },
        faculty: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.batch.findMany({
      where: { instituteId },
      include: { course: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.faculty.findMany({ where: { instituteId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <Shell title="Timetable" userName={session?.user?.name ?? undefined}>
      <TimetableView
        courses={courses}
        slots={slots}
        batches={batches}
        faculty={faculty}
        canManage={canManage}
      />
    </Shell>
  );
}