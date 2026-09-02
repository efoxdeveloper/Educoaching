import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return the same response.
    // This prevents attackers from discovering which emails have accounts.
    const successResponse = NextResponse.json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });

    if (!user) {
      return successResponse;
    }

    // Remove any previous unused/old reset tokens.
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Generate a cryptographically secure reset token.
    const token = crypto.randomBytes(32).toString("hex");

    // Token expires in 1 hour.
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Use the application URL for the reset link.
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const resetUrl =
      `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;



    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      resetUrl,
    });

    // Do not reveal email delivery failures to the user.
    // Log them server-side instead.
    if (!emailResult.sent) {
      console.warn(
        `Password reset email was not sent to ${user.email}:`,
        emailResult.reason
      );
    }

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}