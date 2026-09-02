import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { StudyMaterialView } from "@/components/study-material/StudyMaterialView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function StudyMaterialPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const [batches, courses, rawMaterials] = await Promise.all([
    prisma.batch.findMany({
      where: { instituteId },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { instituteId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.studyMaterial.findMany({
      where: { instituteId },
      include: {
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const initialMaterials = rawMaterials.map((m) => ({
    id: m.id,
    title: m.title,
    subject: m.subject,
    topic: m.topic,
    fileType: m.fileType,
    fileUrl: m.fileUrl,
    description: m.description,
    createdAt: m.createdAt.toISOString(),
    course: m.course,
    batch: m.batch,
    uploadedBy: m.uploadedBy,
  }));

  return (
    <Shell title="Study Material" userName={session?.user?.name ?? undefined}>
      <StudyMaterialView
        batches={batches}
        courses={courses}
        initialMaterials={initialMaterials}
      />
    </Shell>
  );
}
