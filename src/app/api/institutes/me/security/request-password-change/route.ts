import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { sendSecurityVerificationEmail } from "@/lib/email";

export async function POST() {
  const ctx = await requirePermission("institute:manage");
  if ("error" in ctx) return ctx.error;

  try {
    const institute = await prisma.institute.findUnique({
      where: { id: ctx.instituteId },
      select: { id: true, name: true, ownerName: true, email: true },
    });

    if (!institute) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }

    // Identify owner user
    let ownerUser = await prisma.user.findFirst({
      where: { instituteId: ctx.instituteId, role: "OWNER" },
      select: { id: true, email: true, name: true },
    });

    if (!ownerUser) {
      ownerUser = await prisma.user.findFirst({
        where: { instituteId: ctx.instituteId, email: institute.email },
        select: { id: true, email: true, name: true },
      });
    }

    if (!ownerUser) {
      return NextResponse.json({ error: "Owner user account not found" }, { status: 404 });
    }

    // Invalidate any existing unused password verification requests for this user
    await prisma.$executeRawUnsafe(
      `DELETE FROM "SecurityVerificationRequest" WHERE "userId" = $1 AND "type" = 'PASSWORD_CHANGE' AND "usedAt" IS NULL`,
      ownerUser.id
    );

    const token = crypto.randomBytes(32).toString("hex");
    const id = "sec_" + crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SecurityVerificationRequest" ("id", "instituteId", "userId", "type", "token", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, 'PASSWORD_CHANGE', $4, $5, NOW())`,
      id,
      ctx.instituteId,
      ownerUser.id,
      token,
      expiresAt
    );

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/settings/verify-security?token=${encodeURIComponent(token)}`;

    const emailResult = await sendSecurityVerificationEmail({
      to: institute.email,
      ownerName: institute.ownerName || ownerUser.name,
      instituteName: institute.name,
      type: "PASSWORD_CHANGE",
      verifyUrl,
    });

    if (!emailResult.sent) {
      console.warn("Security verification email failed:", emailResult.reason);
    }

    return NextResponse.json({
      success: true,
      message: `A verification link has been sent to ${institute.email}. Please click the link to confirm and set your new password.`,
    });
  } catch (error) {
    console.error("Failed to request password change:", error);
    return NextResponse.json(
      { error: "Failed to initiate password change request. Please try again." },
      { status: 500 }
    );
  }
}
