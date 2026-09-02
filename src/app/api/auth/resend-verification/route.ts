import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Always return the same response, whether or not the email exists or
    // is already verified - prevents account enumeration.
    const successResponse = NextResponse.json({
      message: "If that email needs verification, we've sent a new link.",
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { instituteId: true },
    });

    if (!user?.instituteId) {
      return successResponse;
    }

    const institute = await prisma.institute.findUnique({
      where: { id: user.instituteId },
      select: { id: true, email: true, ownerName: true, emailVerified: true },
    });

    if (!institute || institute.emailVerified) {
      return successResponse;
    }

    // Invalidate any previous unused tokens for this institute.
    await prisma.emailVerificationToken.deleteMany({
      where: { instituteId: institute.id, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: { instituteId: institute.id, token, expiresAt },
    });

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const emailResult = await sendVerificationEmail({
      to: institute.email,
      ownerName: institute.ownerName,
      verifyUrl,
    });

    if (!emailResult.sent) {
      console.warn(`Verification email not sent to ${institute.email}:`, emailResult.reason);
    }

    return successResponse;
  } catch (error) {
    console.error("Resend verification error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}