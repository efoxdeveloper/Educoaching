import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { SupportView } from "@/components/support/SupportView";
import { auth } from "@/lib/auth";
import { getInstituteId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function SupportPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { name: true },
  });

  const instituteName = institute?.name || "Institute";
  const userName = session?.user?.name || "Staff Member";
  const userEmail = session?.user?.email || "";

  return (
    <Shell title="Help & Support" userName={session?.user?.name ?? undefined}>
      <SupportView
        userName={userName}
        userEmail={userEmail}
        instituteName={instituteName}
      />
    </Shell>
  );
}
