import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Central helper for the audit trail (Phase 0 foundation item: "track
// important admin/tenant actions"). Call this from mutation routes after
// the real work has succeeded - it should record what happened, never
// decide whether it's allowed to happen (that's requireInstitute /
// requirePermission's job in tenant.ts).

export type AuditActor = {
  userId?: string | null;
  name?: string | null;
  role?: string | null;
};

type LogAuditInput = {
  // null for platform-level actions with no institute in scope.
  instituteId?: string | null;
  actor: AuditActor;
  // Free-form, e.g. "PAYMENT_RECORDED", "FACULTY_DELETED",
  // "INSTITUTE_SUSPENDED". Not an enum on purpose - new call sites
  // shouldn't need a migration to log a new kind of action.
  action: string;
  // e.g. "Payment", "Faculty", "Institute", "FileAsset"
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

// Pulls the {userId, name, role} triple out of a NextAuth session in the
// shape every route already has it in. Never throws.
export function actorFromSession(session: Session | null | undefined): AuditActor {
  const user = session?.user as { id?: string; name?: string | null; role?: string } | undefined;
  return {
    userId: user?.id ?? null,
    name: user?.name ?? null,
    role: user?.role ?? null,
  };
}

// Writes one audit trail row. Deliberately never throws - a logging
// failure (e.g. a transient DB hiccup) should never take down the request
// that triggered it. Failures are only surfaced to the server console.
export async function logAudit({
  instituteId,
  actor,
  action,
  entityType,
  entityId,
  metadata,
}: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        instituteId: instituteId ?? null,
        userId: actor.userId ?? null,
        actorName: actor.name ?? "Unknown",
        actorRole: actor.role ?? "UNKNOWN",
        action,
        entityType,
        entityId: entityId ?? null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", { action, entityType, entityId, err });
  }
}
