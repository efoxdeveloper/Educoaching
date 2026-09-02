import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type SecurityRecord = {
  id: string;
  instituteId: string;
  userId: string;
  type: "PASSWORD_CHANGE" | "EMAIL_CHANGE";
  token: string;
  targetEmail: string | null;
  expiresAt: Date;
  usedAt: Date | null;
};

// GET: Validate token & return request details
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRawUnsafe<SecurityRecord[]>(
      `SELECT * FROM "SecurityVerificationRequest" WHERE "token" = $1 LIMIT 1`,
      token
    );

    const record = rows[0];

    if (!record) {
      return NextResponse.json(
        { error: "This verification link is invalid. Please request a new one." },
        { status: 400 }
      );
    }

    if (record.usedAt) {
      return NextResponse.json(
        { error: "This verification link has already been used." },
        { status: 400 }
      );
    }

    if (new Date(record.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This verification link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const institute = await prisma.institute.findUnique({
      where: { id: record.instituteId },
      select: { id: true, name: true, email: true },
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({
      valid: true,
      type: record.type,
      targetEmail: record.targetEmail,
      currentEmail: targetUser?.email || institute?.email,
      instituteName: institute?.name,
      userRole: targetUser?.role || "STUDENT",
      userName: targetUser?.name,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json({ error: "Failed to verify token." }, { status: 500 });
  }
}

// POST: Execute the verified change
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body?.token?.trim();
    const newPassword = body?.newPassword;

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<SecurityRecord[]>(
      `SELECT * FROM "SecurityVerificationRequest" WHERE "token" = $1 LIMIT 1`,
      token
    );

    const record = rows[0];

    if (!record || record.usedAt || new Date(record.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (record.type === "PASSWORD_CHANGE") {
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters long." },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: record.userId },
          data: { password: hashedPassword },
        }),
        prisma.$executeRawUnsafe(
          `UPDATE "SecurityVerificationRequest" SET "usedAt" = NOW() WHERE "id" = $1`,
          record.id
        ),
      ]);

      return NextResponse.json({
        success: true,
        message: "Your password has been successfully updated! You can now log in with your new password.",
      });
    } else if (record.type === "EMAIL_CHANGE") {
      const targetEmail = record.targetEmail?.trim().toLowerCase();
      if (!targetEmail) {
        return NextResponse.json({ error: "Invalid target email" }, { status: 400 });
      }

      // Check for collision right before updating
      const conflictUser = await prisma.user.findUnique({
        where: { email: targetEmail },
        select: { id: true },
      });
      if (conflictUser && conflictUser.id !== record.userId) {
        return NextResponse.json(
          { error: "The email is already registered with another account." },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: record.userId },
          data: { email: targetEmail },
        }),
        prisma.institute.update({
          where: { id: record.instituteId },
          data: { email: targetEmail, emailVerified: true },
        }),
        prisma.$executeRawUnsafe(
          `UPDATE "SecurityVerificationRequest" SET "usedAt" = NOW() WHERE "id" = $1`,
          record.id
        ),
      ]);

      return NextResponse.json({
        success: true,
        message: `Your institute and login email has been successfully changed to ${targetEmail}.`,
      });
    }

    return NextResponse.json({ error: "Invalid verification action type." }, { status: 400 });
  } catch (error) {
    console.error("Failed to execute verified security update:", error);
    return NextResponse.json(
      { error: "Failed to update account credentials. Please try again." },
      { status: 500 }
    );
  }
}
