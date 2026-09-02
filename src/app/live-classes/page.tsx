import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { LiveClassesView, type LiveClassItem } from "@/components/live-classes/LiveClassesView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function LiveClassesPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const [courses, batches, facultyList, rawLiveClasses] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { instituteId },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.faculty.findMany({
      where: { instituteId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        subject: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.liveClass.findMany({
      where: { instituteId },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            course: { select: { id: true, name: true } },
            _count: { select: { students: true } },
          },
        },
        faculty: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    }),
  ]);

  const liveClasses: LiveClassItem[] = rawLiveClasses.map((c) => ({
    id: c.id,
    title: c.title,
    subject: c.subject,
    description: c.description,
    scheduledAt: c.scheduledAt.toISOString(),
    durationMinutes: c.durationMinutes,
    meetingLink: c.meetingLink,
    status: c.status as LiveClassItem["status"],
    reminderSent: c.reminderSent,
    batchId: c.batchId,
    batchName: c.batch?.name,
    courseName: c.batch?.course?.name,
    totalStudents: c.batch?._count?.students,
    facultyId: c.facultyId,
    facultyName: c.faculty?.name,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <Shell title="Live Classes & Webinars" userName={session?.user?.name ?? undefined}>
      <LiveClassesView
        liveClasses={liveClasses}
        courses={courses}
        batches={batches}
        facultyList={facultyList}
      />
    </Shell>
  );
}
