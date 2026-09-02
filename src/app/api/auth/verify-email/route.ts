import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        {
          error:
            "This verification link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.institute.update({
        where: { id: verificationToken.instituteId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      message: "Your email has been verified. You can now sign in.",
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}