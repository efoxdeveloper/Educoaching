import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { sendAdminEmailChangeConfirmationEmail } from "@/lib/email";

export async function POST(req: Request) {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  try {
    const body = await req.json().catch(() => ({}));
    const newEmailRaw = body?.newEmail;
    const newEmail = typeof newEmailRaw === "string" ? newEmailRaw.trim().toLowerCase() : "";

    if (!newEmail) {
      return NextResponse.json({ error: "New email address is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Identify current admin user from session — only own account
    const sessionUser = ctx.session.user as { id?: string; email?: string; name?: string; role?: string };
    let currentUser: { id: string; email: string; name: string } | null = null;

    if (sessionUser.id) {
      currentUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, email: true, name: true },
      });
    }
    if (!currentUser && sessionUser.email) {
      currentUser = await prisma.user.findUnique({
        where: { email: sessionUser.email.toLowerCase().trim() },
        select: { id: true, email: true, name: true },
      });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    // Ensure role is still PLATFORM_ADMIN (prevent privilege drift)
    const dbRole = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { role: true } });
    if (dbRole?.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized — not a platform admin" }, { status: 403 });
    }

    const currentEmailLower = currentUser.email.toLowerCase().trim();
    if (currentEmailLower === newEmail) {
      return NextResponse.json({ error: "New email must be different from current email" }, { status: 400 });
    }

    // Check if new email already in use by another User (any role)
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ error: "This email is already in use by another account" }, { status: 400 });
    }

    // Check Institute email collision
    const existingInst = await prisma.institute.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (existingInst) {
      return NextResponse.json({ error: "This email is already in use by another account" }, { status: 400 });
    }

    // Invalidate any existing unused admin email change requests for this user
    await prisma.securityVerificationRequest.deleteMany({
      where: { userId: currentUser.id, type: "ADMIN_EMAIL_CHANGE", usedAt: null },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const id = "sec_" + crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.securityVerificationRequest.create({
      data: {
        id,
        instituteId: null,
        userId: currentUser.id,
        type: "ADMIN_EMAIL_CHANGE",
        token,
        targetEmail: newEmail,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/admin/verify-email?token=${encodeURIComponent(token)}`;

    const emailResult = await sendAdminEmailChangeConfirmationEmail({
      to: currentUser.email, // send to CURRENT email, not new
      newEmail,
      verifyUrl,
      adminName: currentUser.name,
    });

    if (!emailResult.sent) {
      console.warn("[admin request-email-change] email warning:", emailResult.reason);
    }

    return NextResponse.json({
      success: true,
      message: `A confirmation link has been sent to your current email (${currentUser.email}). Please click the approval link to change your email to ${newEmail}.`,
    });
  } catch (error) {
    console.error("Failed to request admin email change:", error);
    return NextResponse.json({ error: "Failed to initiate email change request. Please try again." }, { status: 500 });
  }
}
