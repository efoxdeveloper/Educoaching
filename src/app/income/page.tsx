import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { IncomeView } from "@/components/income/IncomeView";
import { auth } from "@/lib/auth";
import { getInstituteId } from "@/lib/tenant";

export default async function IncomePage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  return (
    <Shell title="Extra Revenue & Income" userName={session?.user?.name ?? undefined}>
      <IncomeView />
    </Shell>
  );
}
