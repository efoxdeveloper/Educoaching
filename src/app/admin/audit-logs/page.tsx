import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TablePagination from "@mui/material/TablePagination";
import Chip from "@mui/material/Chip";

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

  // Read-only log viewer — cursor-based pagination (take PAGE_SIZE, no filter) — visual restyle only, query unchanged
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { institute: { select: { name: true } } },
  });

  return (
    <AdminShell title="Audit Logs" userName={session.user?.name ?? undefined}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#7E9BBC" }}>
          The most recent {PAGE_SIZE} admin and tenant actions across the platform, newest first.
        </Typography>
      </Box>

      <Card sx={{ overflow: "hidden" }}>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "16px", borderColor: "#D6E0EB", boxShadow: "none" }}>
          <Table size="small" sx={{ minWidth: 880 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(238,242,247,0.5)", "& th": { fontSize: "0.70rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", py: 1.5, borderBottom: "1px solid #D6E0EB" } }}>
                <TableCell>When</TableCell>
                <TableCell>Institute</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                  <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.75rem", color: "#64748b" }}>
                    {formatDate(log.createdAt.toISOString())}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", color: "#64748b" }}>{log.institute?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>{log.actorName}</Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.70rem", color: "#7E9BBC" }}>{log.actorRole}</Typography>
                  </TableCell>
                  <TableCell>
                    <Badge tone={actionTone(log.action)} dot>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem", color: "#7E9BBC" }} title={log.metadata ? JSON.stringify(log.metadata) : undefined}>
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId}` : ""}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: "#94A3B8", fontSize: "0.875rem" }}>
                    No audit activity recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Cursor pagination — visual restyle only, query still take PAGE_SIZE newest first */}
          <TablePagination
            count={logs.length < PAGE_SIZE ? logs.length : -1}
            rowsPerPage={PAGE_SIZE}
            page={0}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            rowsPerPageOptions={[PAGE_SIZE]}
            labelDisplayedRows={({ from, to }) => `${from}–${to} of ${logs.length < PAGE_SIZE ? logs.length : `at least ${logs.length}`}`}
            labelRowsPerPage="Rows per page:"
            slotProps={{
              select: { inputProps: { "aria-label": "rows per page" } },
            }}
            sx={{
              borderTop: "1px solid #D6E0EB",
              bgcolor: "rgba(238,242,247,0.3)",
              "& .MuiTablePagination-toolbar": { px: 2 },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: "0.75rem", color: "#475569" },
            }}
          />
        </TableContainer>
      </Card>
    </AdminShell>
  );
}
