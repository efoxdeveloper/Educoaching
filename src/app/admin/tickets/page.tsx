import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { SupportTicketsTable } from "@/components/admin/SupportTicketsTable";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminTicketsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") redirect("/login");

  const tickets = await prisma.supportTicket.findMany({
    include: {
      institute: {
        select: { id: true, name: true, email: true, mobile: true, ownerName: true },
      },
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = tickets.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <AdminShell title="Support Tickets" userName={session?.user?.name ?? undefined}>
      <div className="mb-6">
        <h2 className="font-display text-lg font-bold text-ink">Institute Support Tickets</h2>
        <p className="text-xs text-scholar-500">
          Review, track, and update support queries and technical requests submitted by coaching institutes.
        </p>
      </div>

      <SupportTicketsTable initialTickets={serialized} />
    </AdminShell>
  );
}
