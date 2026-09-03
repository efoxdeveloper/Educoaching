import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { ReportsView } from "@/components/reports/ReportsView";
import { auth } from "@/lib/auth";
import { getBranchImpersonationState } from "@/lib/tenant";
import { getReportsData } from "@/lib/reports-data";

export default async function ReportsPage() {
  const session = await auth();
  const { branchId: activeBranchId } = await getBranchImpersonationState();
  const instituteId = (session?.user as any)?.instituteId as string | null;
  if (!instituteId || !activeBranchId) redirect("/login");

  const role = String((session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN" && role !== "ACCOUNTANT") {
    redirect("/dashboard");
  }

  const initialData = await getReportsData(instituteId, activeBranchId);

  return (
    <Shell title="Reports & Analytics" userName={session?.user?.name ?? undefined}>
      <ReportsView initialData={initialData} />
    </Shell>
  );
}
