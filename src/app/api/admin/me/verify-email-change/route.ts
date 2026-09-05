import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminEmailChangeCompletedEmail } from "@/lib/email";

// GET: validate token & return details (public, token-based)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  try {
    const record = await prisma.securityVerificationRequest.findUnique({
      where: { token },
    });

    if (!record || record.type !== "ADMIN_EMAIL_CHANGE") {
      return NextResponse.json({ error: "This verification link is invalid. Please request a new one." }, { status: 400 });
    }

    if (record.usedAt) {
      return NextResponse.json({ error: "This verification link has already been used." }, { status: 400 });
    }

    if (new Date(record.expiresAt) < new Date()) {
      return NextResponse.json({ error: "This verification link has expired. Please request a new one." }, { status: 400 });
    }

    // Verify the linked user is still a PLATFORM_ADMIN and fetch current email
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user || user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "This verification link is no longer valid for this account." }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      type: record.type,
      targetEmail: record.targetEmail,
      currentEmail: user.email,
      adminName: user.name,
      expiresAt: record.expiresAt,
    });
  } catch (error) {
    console.error("Admin verify-email GET error:", error);
    return NextResponse.json({ error: "Failed to verify token." }, { status: 500 });
  }
}

// POST: execute the verified email change (public, token-based, single-use)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.token?.trim();

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
    }

    const record = await prisma.securityVerificationRequest.findUnique({
      where: { token },
    });

    if (!record || record.type !== "ADMIN_EMAIL_CHANGE" || record.usedAt || new Date(record.expiresAt) < new Date()) {
      return NextResponse.json({ error: "This verification link is invalid or has expired. Please request a new one." }, { status: 400 });
    }

    const targetEmail = record.targetEmail?.trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json({ error: "Invalid target email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user || user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "This verification link is no longer valid for this account." }, { status: 400 });
    }

    const oldEmail = user.email;

    // Final collision check right before update (email could have been taken after request)
    const conflictUser = await prisma.user.findUnique({ where: { email: targetEmail }, select: { id: true } });
    if (conflictUser && conflictUser.id !== record.userId) {
      return NextResponse.json({ error: "The requested email is now already in use by another account." }, { status: 400 });
    }
    const conflictInst = await prisma.institute.findUnique({ where: { email: targetEmail }, select: { id: true } });
    if (conflictInst) {
      return NextResponse.json({ error: "The requested email is now already in use by another account." }, { status: 400 });
    }

    // Atomic update: change email + mark token used
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { email: targetEmail },
      });
      await tx.securityVerificationRequest.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
    });

    // Send completion notifications to BOTH old and new addresses (fire and forget, non-blocking for response)
    const adminName = user.name;
    const oldResult = await sendAdminEmailChangeCompletedEmail({
      to: oldEmail,
      oldEmail,
      newEmail: targetEmail,
      isOldAddress: true,
      adminName,
    });
    const newResult = await sendAdminEmailChangeCompletedEmail({
      to: targetEmail,
      oldEmail,
      newEmail: targetEmail,
      isOldAddress: false,
      adminName,
    });

    if (!oldResult.sent) console.warn("[admin verify-email] old email notification warning:", oldResult.reason);
    if (!newResult.sent) console.warn("[admin verify-email] new email notification warning:", newResult.reason);

    return NextResponse.json({
      success: true,
      message: `Your platform admin email has been successfully changed from ${oldEmail} to ${targetEmail}. Confirmation sent to both addresses.`,
      oldEmail,
      newEmail: targetEmail,
    });
  } catch (error) {
    console.error("Failed to execute admin email change:", error);
    return NextResponse.json({ error: "Failed to update email. Please try again." }, { status: 500 });
  }
}
