import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { sendSecurityVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  const ctx = await requirePermission("institute:manage");
  if ("error" in ctx) return ctx.error;

  try {
    const body = await req.json();
    const newEmail = body?.newEmail?.trim().toLowerCase();

    if (!newEmail) {
      return NextResponse.json({ error: "New email address is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const institute = await prisma.institute.findUnique({
      where: { id: ctx.instituteId },
      select: { id: true, name: true, ownerName: true, email: true },
    });

    if (!institute) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }

    if (institute.email.toLowerCase() === newEmail) {
      return NextResponse.json({ error: "New email must be different from current email" }, { status: 400 });
    }

    // Check if new email is already in use by another user or institute
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered with another account" },
        { status: 400 }
      );
    }

    const existingInst = await prisma.institute.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existingInst && existingInst.id !== ctx.instituteId) {
      return NextResponse.json(
        { error: "This email is already registered with another institute" },
        { status: 400 }
      );
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

    // Invalidate any existing unused email verification requests for this user
    await prisma.$executeRawUnsafe(
      `DELETE FROM "SecurityVerificationRequest" WHERE "userId" = $1 AND "type" = 'EMAIL_CHANGE' AND "usedAt" IS NULL`,
      ownerUser.id
    );

    const token = crypto.randomBytes(32).toString("hex");
    const id = "sec_" + crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SecurityVerificationRequest" ("id", "instituteId", "userId", "type", "token", "targetEmail", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, 'EMAIL_CHANGE', $4, $5, $6, NOW())`,
      id,
      ctx.instituteId,
      ownerUser.id,
      token,
      newEmail,
      expiresAt
    );

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/settings/verify-security?token=${encodeURIComponent(token)}`;

    // Send verification email to CURRENT owner email to confirm the change
    const emailResult = await sendSecurityVerificationEmail({
      to: institute.email,
      ownerName: institute.ownerName || ownerUser.name,
      instituteName: institute.name,
      type: "EMAIL_CHANGE",
      targetEmail: newEmail,
      verifyUrl,
    });

    if (!emailResult.sent) {
      console.warn("Security verification email failed:", emailResult.reason);
    }

    return NextResponse.json({
      success: true,
      message: `A verification link has been sent to your current email (${institute.email}). Please confirm the request to update your email to ${newEmail}.`,
    });
  } catch (error) {
    console.error("Failed to request email change:", error);
    return NextResponse.json(
      { error: "Failed to initiate email change request. Please try again." },
      { status: 500 }
    );
  }
}
