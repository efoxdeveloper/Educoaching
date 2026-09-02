import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { ExpensesView } from "@/components/expenses/ExpensesView";
import { auth } from "@/lib/auth";
import { getInstituteId } from "@/lib/tenant";

export default async function ExpensesPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const role = String((session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN" && role !== "ACCOUNTANT") {
    redirect("/dashboard");
  }

  return (
    <Shell title="Expense Management" userName={session?.user?.name ?? undefined}>
      <ExpensesView />
    </Shell>
  );
}
