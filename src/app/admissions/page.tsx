import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { AdmissionsTable } from "@/components/admissions/AdmissionsTable";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function AdmissionsPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const role = String((session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN" && role !== "COUNSELLOR") {
    redirect("/dashboard");
  }

  const [admissions, courses, batches, branches, facultyList, institute] = await Promise.all([
    prisma.admission.findMany({
      where: { instituteId },
      include: {
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        assignedCounsellor: { select: { id: true, name: true, roleType: true } },
        followUps: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({ where: { instituteId }, select: { id: true, name: true, fee: true }, orderBy: { name: "asc" } }),
    prisma.batch.findMany({ where: { instituteId }, select: { id: true, name: true, courseId: true } }),
    prisma.branch.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.faculty.findMany({
      where: { instituteId, status: "ACTIVE" },
      select: { id: true, name: true, roleType: true, email: true, userId: true },
      orderBy: { name: "asc" },
    }),
    prisma.institute.findUnique({
      where: { id: instituteId },
      select: { id: true, instituteSlug: true, name: true },
    }),
  ]);

  const userEmail = session?.user?.email;
  const userId = (session?.user as { id?: string })?.id;
  const currentFaculty = facultyList.find(
    (f) => (userId && f.userId === userId) || (userEmail && f.email === userEmail)
  );

  const serialized = admissions.map((a) => ({
    ...a,
    feePlan: a.feePlan.toString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    nextFollowUpDate: a.nextFollowUpDate ? a.nextFollowUpDate.toISOString() : null,
    demoDate: a.demoDate ? a.demoDate.toISOString() : null,
    followUps: a.followUps.map((f) => ({
      ...f,
      scheduledAt: f.scheduledAt ? f.scheduledAt.toISOString() : null,
      createdAt: f.createdAt.toISOString(),
    })),
  }));

  const serializedCourses = courses.map((c) => ({ ...c, fee: c.fee.toString() }));
  const serializedFaculty = facultyList.map((f) => ({ id: f.id, name: f.name, roleType: f.roleType }));
  const effectiveSlug = institute?.instituteSlug || instituteId;

  return (
    <Shell title="Lead CRM & Admissions" userName={session?.user?.name ?? undefined}>
      <AdmissionsTable
        admissions={serialized}
        courses={serializedCourses}
        batches={batches}
        branches={branches}
        faculty={serializedFaculty}
        defaultCounsellorId={currentFaculty?.id}
        instituteSlug={effectiveSlug}
        userName={session?.user?.name ?? undefined}
      />
    </Shell>
  );
}