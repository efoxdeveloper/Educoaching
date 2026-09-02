import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { sendRegistrationApprovedEmail } from "@/lib/email";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const institute = await prisma.institute.findUnique({
    where: { id: params.id },
    include: {
      branches: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
      files: {
        where: { category: "INSTITUTE_LOGO" },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
      _count: {
        select: {
          students: true,
          batches: true,
          faculty: true,
          branches: true,
        },
      },
    },
  });

  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  return NextResponse.json(institute);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { status } = body as { status?: "ACTIVE" | "SUSPENDED" | "PENDING_APPROVAL" };

  if (status !== "ACTIVE" && status !== "SUSPENDED" && status !== "PENDING_APPROVAL") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const institute = await prisma.institute.findUnique({ where: { id: params.id } });
  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  const isGrantingAccess = institute.status === "PENDING_APPROVAL" && status === "ACTIVE";

  const updated = await prisma.institute.update({
    where: { id: params.id },
    data: {
      status,
      // If admin approves the institute, mark emailVerified: true as access is granted
      ...(isGrantingAccess ? { emailVerified: true } : {}),
    },
  });

  if (isGrantingAccess) {
    try {
      await prisma.branch.updateMany({
        where: { instituteId: updated.id, isMainBranch: true, status: "PENDING_APPROVAL" },
        data: { status: "ACTIVE" },
      });
    } catch (branchErr) {
      console.error("Failed to activate main branch on institute approval:", branchErr);
    }
  }

  const actionName =
    isGrantingAccess
      ? "INSTITUTE_APPROVED"
      : status === "SUSPENDED"
      ? "INSTITUTE_SUSPENDED"
      : "INSTITUTE_REACTIVATED";

  await logAudit({
    instituteId: updated.id,
    actor: actorFromSession(ctx.session),
    action: actionName,
    entityType: "Institute",
    entityId: updated.id,
    metadata: { name: updated.name, previousStatus: institute.status, newStatus: status },
  });

  await prisma.platformNotification.create({
    data: {
      instituteId: updated.id,
      type: actionName,
      message:
        isGrantingAccess
          ? `${updated.name} registration request was approved and access granted.`
          : status === "SUSPENDED"
          ? `${updated.name} was suspended by platform admin.`
          : `${updated.name} was reactivated by platform admin.`,
    },
  });

  // If granting access, send the institute owner the welcome email with login link!
  if (isGrantingAccess) {
    try {
      const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const loginUrl = `${appUrl}/login?portal=institute&email=${encodeURIComponent(updated.email)}`;

      await sendRegistrationApprovedEmail({
        to: updated.email,
        ownerName: updated.ownerName,
        instituteName: updated.name,
        loginUrl,
      });
    } catch (err) {
      console.error("Failed to send registration approved email:", err);
    }
  }

  return NextResponse.json(updated);
}