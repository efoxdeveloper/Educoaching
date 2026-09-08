import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { AuditLogsTable, type SerializedAuditLog } from "@/components/admin/AuditLogsTable";

export default async function AuditLogsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "PLATFORM_ADMIN") redirect("/login");

  // Read-only log viewer — fetch recent 200 platform actions, newest first
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { institute: { select: { name: true } } },
  });

  const serialized: SerializedAuditLog[] = logs.map((log) => ({
    id: log.id,
    instituteId: log.instituteId,
    userId: log.userId,
    actorName: log.actorName || "System",
    actorRole: log.actorRole || "—",
    action: log.action || "UNKNOWN",
    entityType: log.entityType || "—",
    entityId: log.entityId || null,
    metadata: log.metadata ? JSON.parse(JSON.stringify(log.metadata)) : null,
    createdAt: log.createdAt.toISOString(),
    institute: log.institute ? { name: log.institute.name } : null,
  }));

  return (
    <AdminShell title="Audit Logs" userName={session.user?.name ?? undefined}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>
          The most recent admin and tenant actions across the platform, newest first.
        </Typography>
      </Box>

      <AuditLogsTable initialLogs={serialized} />
    </AdminShell>
  );
}
