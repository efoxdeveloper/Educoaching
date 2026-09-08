"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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

export interface SerializedAuditLog {
  id: string;
  instituteId?: string | null;
  userId?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: any;
  createdAt: string;
  institute?: { name: string } | null;
}

function actionTone(action?: string | null): "success" | "danger" | "warn" | "neutral" {
  if (!action) return "neutral";
  const upper = String(action).toUpperCase();
  if (upper.includes("DELETE") || upper.includes("SUSPEND")) return "danger";
  if (upper.includes("UPDATE") || upper.includes("REACTIVAT")) return "warn";
  if (
    upper.includes("RECORDED") ||
    upper.includes("RENEWED") ||
    upper.includes("UPLOAD") ||
    upper.includes("APPROV") ||
    upper.includes("CREATED")
  )
    return "success";
  return "neutral";
}

function safeStringify(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return undefined;
  }
}

export function AuditLogsTable({ initialLogs }: { initialLogs: SerializedAuditLog[] }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const displayedLogs = initialLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
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
            {displayedLogs.map((log) => (
              <TableRow key={log.id} hover sx={{ "& td": { borderBottom: "1px solid #F1F5F9", py: 1.5 } }}>
                <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.75rem", color: "#64748b" }}>
                  {log.createdAt ? formatDate(log.createdAt) : "—"}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", color: "#64748b" }}>{log.institute?.name ?? "—"}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#171A21", fontSize: "0.75rem" }}>
                    {log.actorName || "System"}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.70rem", color: "#7E9BBC" }}>
                    {log.actorRole || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Badge tone={actionTone(log.action)} dot>
                    {log.action || "UNKNOWN"}
                  </Badge>
                </TableCell>
                <TableCell
                  sx={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem", color: "#7E9BBC" }}
                  title={safeStringify(log.metadata)}
                >
                  {log.entityType || "—"}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </TableCell>
              </TableRow>
            ))}
            {initialLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5, color: "#94A3B8", fontSize: "0.875rem" }}>
                  No audit activity recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          count={initialLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
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
  );
}
