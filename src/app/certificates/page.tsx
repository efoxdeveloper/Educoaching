import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { CertificatesView } from "@/components/certificates/CertificatesView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function CertificatesPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const [templates, courses, batches] = await Promise.all([
    prisma.certificateTemplate.findMany({
      where: { instituteId },
      include: {
        _count: { select: { issuedCertificates: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { instituteId },
      select: { id: true, name: true, courseId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <Shell title="Course Certificates" userName={session?.user?.name ?? undefined}>
      <CertificatesView
        initialTemplates={templates}
        courses={courses}
        batches={batches}
      />
    </Shell>
  );
}
