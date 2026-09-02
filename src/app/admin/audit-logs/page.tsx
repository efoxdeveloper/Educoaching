import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 50;

function actionTone(action: string): "success" | "danger" | "warn" | "neutral" {
  if (action.includes("DELETE") || action.includes("SUSPEND")) return "danger";
  if (action.includes("UPDATE") || action.includes("REACTIVAT")) return "warn";
  if (action.includes("RECORDED") || action.includes("RENEWED") || action.includes("UPLOAD") || action.includes("APPROV")) return "success";
  return "neutral";
}

export default async function AuditLogsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") redirect("/login");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { institute: { select: { name: true } } },
  });

  return (
    <AdminShell title="Audit Logs" userName={session.user?.name ?? undefined}>
      <div className="mb-6">
        <p className="text-sm text-scholar-400">
          The most recent {PAGE_SIZE} admin and tenant actions across the platform, newest first.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-scholar-100 text-left text-xs font-medium uppercase tracking-wide text-scholar-400">
                <th className="py-3 pl-5 pr-4">When</th>
                <th className="py-3 pr-4">Institute</th>
                <th className="py-3 pr-4">Actor</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-5">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-scholar-50 last:border-0 hover:bg-paper/60">
                  <td className="py-3 pl-5 pr-4 whitespace-nowrap text-scholar-500">
                    {formatDate(log.createdAt.toISOString())}
                  </td>
                  <td className="py-3 pr-4 text-scholar-500">{log.institute?.name ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-ink">{log.actorName}</div>
                    <div className="text-xs text-scholar-400">{log.actorRole}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge tone={actionTone(log.action)} dot>
                      {log.action}
                    </Badge>
                  </td>
                  <td className="py-3 pr-5 max-w-[320px] truncate text-xs text-scholar-400" title={log.metadata ? JSON.stringify(log.metadata) : undefined}>
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId}` : ""}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-scholar-400">
                    No audit activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}