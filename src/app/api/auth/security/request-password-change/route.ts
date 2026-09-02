import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendSecurityVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const session = await auth();
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { studentId, email: bodyEmail } = body as { studentId?: string; email?: string };

    let targetUser: { id: string; email: string; name: string; instituteId: string | null; role: string } | null = null;
    let targetInstituteName = "Vidyalaya Institute";

    // 1. If user is logged in (faculty, staff, student, owner)
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, name: true, instituteId: true, role: true },
      });
      if (user) {
        targetUser = user;
      }
    }

    // 2. If studentId is passed (e.g. from Student Portal)
    if (!targetUser && studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, email: true, name: true, instituteId: true },
      });
      if (student?.email) {
        const user = await prisma.user.findUnique({
          where: { email: student.email.toLowerCase().trim() },
          select: { id: true, email: true, name: true, instituteId: true, role: true },
        });
        if (user) {
          targetUser = user;
        } else {
          // Provision student user account if it doesn't exist yet
          const newUser = await prisma.user.create({
            data: {
              name: student.name,
              email: student.email.toLowerCase().trim(),
              password: "change-pending",
              role: "STUDENT",
              instituteId: student.instituteId,
            },
            select: { id: true, email: true, name: true, instituteId: true, role: true },
          });
          targetUser = newUser;
        }
      }
    }

    // 3. If direct email passed
    if (!targetUser && bodyEmail) {
      const cleanEmail = bodyEmail.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true, email: true, name: true, instituteId: true, role: true },
      });
      if (user) {
        targetUser = user;
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Could not locate your user profile to send the password reset verification." },
        { status: 404 }
      );
    }

    if (targetUser.instituteId) {
      const institute = await prisma.institute.findUnique({
        where: { id: targetUser.instituteId },
        select: { name: true },
      });
      if (institute?.name) {
        targetInstituteName = institute.name;
      }
    }

    // Invalidate any existing unused password verification requests for this user
    await prisma.$executeRawUnsafe(
      `DELETE FROM "SecurityVerificationRequest" WHERE "userId" = $1 AND "type" = 'PASSWORD_CHANGE' AND "usedAt" IS NULL`,
      targetUser.id
    );

    const token = crypto.randomBytes(32).toString("hex");
    const id = "sec_" + crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SecurityVerificationRequest" ("id", "instituteId", "userId", "type", "token", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, 'PASSWORD_CHANGE', $4, $5, NOW())`,
      id,
      targetUser.instituteId,
      targetUser.id,
      token,
      expiresAt
    );

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-security?token=${encodeURIComponent(token)}`;

    const emailResult = await sendSecurityVerificationEmail({
      to: targetUser.email,
      recipientName: targetUser.name,
      instituteName: targetInstituteName,
      type: "PASSWORD_CHANGE",
      verifyUrl,
    });

    if (!emailResult.sent) {
      console.warn("[request-password-change] Security verification email warning:", emailResult.reason);
    }

    return NextResponse.json({
      success: true,
      message: `A verification link has been sent to ${targetUser.email}. Please click the link to confirm and set your new password.`,
    });
  } catch (error) {
    console.error("Failed to request password change:", error);
    return NextResponse.json(
      { error: "Failed to initiate password change request. Please try again." },
      { status: 500 }
    );
  }
}
