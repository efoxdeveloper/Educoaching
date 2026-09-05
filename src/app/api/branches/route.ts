import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { BranchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import {
  sendBranchProcessingEmail,
  sendAdminBranchAlertEmail,
  sendBranchApprovedEmail,
} from "@/lib/email";
import { BRANCH_LIMITS_BY_PLAN } from "@/lib/pricing";

// Reading branches is available to any logged-in Institute user (Owner,
// Admin, Staff) - same convention as courses.
export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const branches = await prisma.branch.findMany({
    where: { instituteId: ctx.instituteId },
    include: {
      users: {
        where: { role: { in: ["ADMIN", "STAFF"] } },
        select: { id: true, email: true, name: true, role: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(branches);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("branches:write");
  if ("error" in ctx) return ctx.error;

  try {
    const body = await req.json();
    const { name, city, state, address, contact, guidePhone, inChargeName, isMainBranch, email, password } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    // Mandatory: Branch Owner Name — matches setup wizard (Branch In-Charge Name *)
    if (!inChargeName || !String(inChargeName).trim()) {
      return NextResponse.json({ error: "Branch Owner Name is required" }, { status: 400 });
    }

    // Optional credentials for sub-branch sign-in
    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
    const trimmedPassword = password ? String(password).trim() : null;

    if (trimmedEmail) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json({ error: "Please enter a valid email address for the branch login" }, { status: 400 });
      }

      // Check if email already in use
      const existingUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: `The email "${trimmedEmail}" is already registered. Please provide a different email.` },
          { status: 409 }
        );
      }

      if (!trimmedPassword || trimmedPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long when setting branch login credentials" },
          { status: 400 }
        );
      }
    }

    // Branch has no DB-level unique constraint on (instituteId, name) -
    // application-level check to keep the list sane, not a hard schema guarantee.
    const existing = await prisma.branch.findFirst({
      where: { instituteId: ctx.instituteId, name: String(name).trim() },
    });
    if (existing) {
      return NextResponse.json({ error: "A branch with this name already exists" }, { status: 409 });
    }

    // Fetch the institute with its owner & main branch info
    const institute = await prisma.institute.findUnique({
      where: { id: ctx.instituteId },
      include: {
        users: {
          where: { role: { in: ["OWNER", "ADMIN"] } },
          select: { id: true, name: true, email: true, role: true, branchId: true },
        },
        branches: {
          where: { isMainBranch: true },
          select: { id: true, name: true, contact: true },
        },
      },
    });

    if (!institute) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }

  if (isMainBranch) {
    // Only one primary Main Branch (Head Office)
    await prisma.branch.updateMany({
      where: { instituteId: ctx.instituteId },
      data: { isMainBranch: false },
    });
  }

  // Check if institute is currently within its free trial period
  const now = new Date();
  const isTrialActive = institute.trialEndsAt ? new Date(institute.trialEndsAt) > now : false;

  let initialStatus: BranchStatus = BranchStatus.PENDING_APPROVAL;

  if (isMainBranch || isTrialActive) {
    // Main branch or during free trial period, creating new branches is automatically ACTIVE
    initialStatus = BranchStatus.ACTIVE;
  } else {
    // Free trial has ended: enforce active subscription plan and branch limits
    const currentBranchCount = await prisma.branch.count({
      where: { instituteId: ctx.instituteId },
    });

    const isPaidActive =
      institute.platformSubscriptionStatus === "ACTIVE" &&
      institute.billingCycle &&
      institute.billingCycle !== "TRIAL";

    if (!isPaidActive) {
      return NextResponse.json(
        {
          error:
            "Your free trial has ended. Please subscribe to an active platform plan to add new branches.",
        },
        { status: 403 }
      );
    }

    const planLimit = BRANCH_LIMITS_BY_PLAN[institute.billingCycle] ?? 3;
    if (currentBranchCount >= planLimit) {
      return NextResponse.json(
        {
          error: `You have reached the maximum limit of ${planLimit} branches for your ${institute.billingCycle} plan. Please upgrade your subscription plan to add more branches.`,
        },
        { status: 403 }
      );
    }

    // Within paid plan limit: active if institute is active, otherwise pending
    initialStatus = institute.status === "ACTIVE" ? BranchStatus.ACTIVE : BranchStatus.PENDING_APPROVAL;
  }

  const branch = await prisma.branch.create({
    data: {
      instituteId: ctx.instituteId,
      name: String(name).trim(),
      city: city ? String(city).trim() : null,
      state: state ? String(state).trim() : null,
      address: address ? String(address).trim() : null,
      contact: contact ? String(contact).trim() : null,
      guidePhone: guidePhone ? String(guidePhone).trim() : null,
      inChargeName: inChargeName ? String(inChargeName).trim() : null,
      isMainBranch: Boolean(isMainBranch),
      status: initialStatus,
    },
  });

  // If email and password provided, create sub-branch user
  let createdUser = null;
  if (trimmedEmail && trimmedPassword) {
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    createdUser = await prisma.user.create({
      data: {
        name: `${branch.name} Admin`,
        email: trimmedEmail,
        password: hashedPassword,
        role: "ADMIN",
        instituteId: ctx.instituteId,
        branchId: branch.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
      },
    });
  }

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: initialStatus === BranchStatus.PENDING_APPROVAL ? "BRANCH_REQUESTED" : "BRANCH_CREATED",
    entityType: "Branch",
    entityId: branch.id,
    metadata: {
      name: branch.name,
      city: branch.city,
      state: branch.state,
      status: branch.status,
      branchUserEmail: createdUser?.email ?? null,
    },
  });

  // Approval gating based on trial period (same source of truth: institute.trialEndsAt)
  // isTrialActive is computed above at line 113 using trialEndsAt > now.
  // Trial active  → ACTIVE (no approval, welcome email directly)
  // Trial expired → PENDING_APPROVAL (requires admin, processing email + admin alert)
  // Welcome email for trial path reuses sendBranchApprovedEmail — same template
  // as post-trial admin-approved flow (src/app/api/admin/branches/[id]/route.ts:145)

  // If sub-branch requires approval, dispatch emails in background without blocking response
  if (initialStatus === BranchStatus.PENDING_APPROVAL) {
    const appUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    (async () => {
      // 1. Send processing email to Institute Owner & Main Branch Owner / Admins
      try {
        const recipients = new Map<string, string>(); // email -> name
        // Institute Owner email
        if (institute.email) {
          recipients.set(institute.email.toLowerCase(), institute.ownerName);
        }
        // Main branch users / Institute Admins
        for (const u of institute.users) {
          if (u.email && (u.role === "OWNER" || u.role === "ADMIN")) {
            recipients.set(u.email.toLowerCase(), u.name || "Administrator");
          }
        }
        // Sub-branch admin user (if registered during creation)
        if (createdUser?.email) {
          recipients.set(createdUser.email.toLowerCase(), createdUser.name || `${branch.name} Admin`);
        }

        for (const [email, recipientName] of Array.from(recipients.entries())) {
          const isBranchUser = createdUser?.email && email === createdUser.email.toLowerCase();
          await sendBranchProcessingEmail({
            to: email,
            recipientName,
            branchName: branch.name,
            instituteName: institute.name,
            city: branch.city,
            loginEmail: isBranchUser ? email : undefined,
          }).catch((err) => console.error("Failed to send branch processing email:", err));
        }
      } catch (err) {
        console.error("Failed to send branch processing email:", err);
      }

      // 2. Send alert email to Platform Admin(s)
      try {
        const platformAdmins = await prisma.user.findMany({
          where: { role: "PLATFORM_ADMIN" },
          select: { email: true },
        });

        const adminEmails = platformAdmins.map((a) => a.email);
        if (adminEmails.length === 0 && process.env.SMTP_USER) {
          adminEmails.push(process.env.SMTP_USER);
        }

        const adminPortalUrl = `${appUrl}/admin/branches`;

        for (const adminEmail of adminEmails) {
          await sendAdminBranchAlertEmail({
            to: adminEmail,
            branchName: branch.name,
            instituteName: institute.name,
            ownerName: institute.ownerName,
            city: branch.city,
            state: branch.state,
            contact: branch.contact,
            adminPortalUrl,
          }).catch((err) => console.error("Failed to send admin branch alert email:", err));
        }
      } catch (err) {
        console.error("Failed to send admin branch alert email:", err);
      }

      // 3. Record platform notification for admin
      try {
        await prisma.platformNotification.create({
          data: {
            instituteId: institute.id,
            type: "BRANCH_REGISTRATION",
            message: `${institute.name} requested to add sub-branch "${branch.name}" (${branch.city || "N/A"}). Awaiting Platform Admin approval.`,
          },
        });
      } catch (err) {
        console.error("Failed to record branch platform notification:", err);
      }
    })().catch((err) => {
      console.error("[branch background notification error]:", err);
    });
  } else if (initialStatus === BranchStatus.ACTIVE && createdUser?.email) {
    // Trial auto-activated (or main branch / paid-active): send welcome email
    // immediately, reusing the SAME template as admin-approved flow.
    // Requirement #4: welcome email must fire for trial ACTIVE path too.
    const appUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const portalUrl = `${appUrl}/login?portal=institute`;
    (async () => {
      try {
        await sendBranchApprovedEmail({
          to: createdUser.email,
          recipientName: createdUser.name || `${branch.name} Admin`,
          branchName: branch.name,
          instituteName: institute.name,
          portalUrl,
          loginEmail: createdUser.email,
        }).catch((err) => console.error("Failed to send trial branch welcome email:", err));
      } catch (err) {
        console.error("Failed to send trial branch welcome email:", err);
      }
    })().catch((err) => console.error("[branch welcome email error]:", err));
  }

  return NextResponse.json(
    {
      ...branch,
      message:
        initialStatus === BranchStatus.PENDING_APPROVAL
          ? "Branch access request submitted. Your request is in processing and platform admin has been notified."
          : "Branch created successfully.",
    },
    { status: 201 }
  );
  } catch (error: unknown) {
    console.error("POST /api/branches error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save branch" },
      { status: 500 }
    );
  }
}