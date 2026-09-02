import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { BulkCommunicationView } from "@/components/communication/BulkCommunicationView";
import { auth } from "@/lib/auth";
import { getInstituteId } from "@/lib/tenant";

export default async function CommunicationPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  return (
    <Shell title="Bulk Communication & Broadcasts" userName={session?.user?.name ?? undefined}>
      <BulkCommunicationView />
    </Shell>
  );
}
