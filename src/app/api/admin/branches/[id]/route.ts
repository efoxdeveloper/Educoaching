import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { sendBranchApprovedEmail } from "@/lib/email";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const branch = await prisma.branch.findUnique({
    where: { id: params.id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
      institute: {
        select: {
          id: true,
          name: true,
          ownerName: true,
          email: true,
          mobile: true,
          address: true,
          city: true,
          state: true,
          status: true,
          billingCycle: true,
          platformSubscriptionStatus: true,
          createdAt: true,
          _count: {
            select: {
              branches: true,
              students: true,
              faculty: true,
              batches: true,
            },
          },
        },
      },
      _count: {
        select: { students: true, batches: true, faculty: true },
      },
    },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json(branch);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { status } = body as { status?: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL" };

  if (status !== "ACTIVE" && status !== "INACTIVE" && status !== "PENDING_APPROVAL") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id: params.id },
    include: {
      users: {
        where: { role: { in: ["ADMIN", "STAFF"] } },
        select: { id: true, name: true, email: true, role: true },
      },
      institute: {
        include: {
          users: {
            where: { role: { in: ["OWNER", "ADMIN"] } },
            select: { id: true, name: true, email: true, role: true, branchId: true },
          },
        },
      },
    },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const isGrantingAccess = branch.status === "PENDING_APPROVAL" && status === "ACTIVE";

  const updated = await prisma.branch.update({
    where: { id: params.id },
    data: { status },
  });

  const actionName = isGrantingAccess
    ? "BRANCH_APPROVED"
    : status === "ACTIVE"
    ? "BRANCH_REACTIVATED"
    : "BRANCH_DEACTIVATED";

  await logAudit({
    instituteId: branch.instituteId,
    actor: actorFromSession(ctx.session),
    action: actionName,
    entityType: "Branch",
    entityId: updated.id,
    metadata: {
      name: updated.name,
      instituteName: branch.institute.name,
      previousStatus: branch.status,
      newStatus: status,
    },
  });

  if (isGrantingAccess) {
    const appUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const portalUrl = `${appUrl}/login?portal=institute`;

    try {
      const recipients = new Map<string, { name: string; isBranchUser?: boolean }>();
      if (branch.institute.email) {
        recipients.set(branch.institute.email.toLowerCase(), { name: branch.institute.ownerName });
      }
      for (const u of branch.institute.users) {
        if (u.email && (u.role === "OWNER" || u.role === "ADMIN")) {
          recipients.set(u.email.toLowerCase(), { name: u.name || "Administrator" });
        }
      }
      // Sub-branch users created for this branch
      for (const bu of branch.users) {
        if (bu.email) {
          recipients.set(bu.email.toLowerCase(), { name: bu.name || `${branch.name} Admin`, isBranchUser: true });
        }
      }

      for (const [email, info] of Array.from(recipients.entries())) {
        await sendBranchApprovedEmail({
          to: email,
          recipientName: info.name,
          branchName: branch.name,
          instituteName: branch.institute.name,
          portalUrl,
          loginEmail: info.isBranchUser ? email : undefined,
        });
      }
    } catch (err) {
      console.error("Failed to send branch approval email:", err);
    }
  }

  return NextResponse.json(updated);
}
