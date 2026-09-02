import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireInstitute } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { parseInstituteSettings } from "@/lib/institute-settings";
import { buildStorageKey, getStorageProvider, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/storage";
import { sendBranchProcessingEmail, sendAdminBranchAlertEmail } from "@/lib/email";

interface BranchInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  contact?: string;
  guidePhone?: string;
  email?: string;
  password?: string;
}

interface CourseInput {
  name: string;
  code?: string;
  fee: number;
  durationMonths?: number;
  feeType?: "ONE_TIME" | "MONTHLY" | "QUARTERLY" | "ANNUAL";
}

interface LogoInput {
  fileName: string;
  mimeType: string;
  base64: string;
}

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const role = (ctx.session.user as { role?: string } | undefined)?.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only Institute Owners and Admins can complete initial setup" }, { status: 403 });
  }

  const body = await req.json();
  const {
    address,
    city,
    state,
    guidePhone,
    taxNumber,
    academicYearLabel,
    logo,
    branches,
    courses,
  } = body as {
    address?: string;
    city?: string;
    state?: string;
    guidePhone?: string;
    taxNumber?: string;
    academicYearLabel?: string;
    logo?: LogoInput;
    branches?: BranchInput[];
    courses?: CourseInput[];
  };

  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    include: { users: true },
  });

  if (!institute) {
    return NextResponse.json({ error: "Institute not found" }, { status: 404 });
  }

  const currentSettings = parseInstituteSettings(institute.settings);
  const updatedSettings = {
    ...currentSettings,
    taxNumber: taxNumber !== undefined ? (taxNumber.trim() || undefined) : currentSettings.taxNumber,
    setupCompleted: true,
  };

  // 1. Update Institute Profile & Academic Session (manually inputted by owner)
  const updatedInstitute = await prisma.institute.update({
    where: { id: ctx.instituteId },
    data: {
      address: address !== undefined ? (address.trim() || null) : institute.address,
      city: city !== undefined ? (city.trim() || null) : institute.city,
      state: state !== undefined ? (state.trim() || null) : institute.state,
      guidePhone: guidePhone !== undefined ? (guidePhone.trim() || null) : institute.guidePhone,
      academicYearLabel: academicYearLabel !== undefined ? (academicYearLabel.trim() || null) : institute.academicYearLabel,
      settings: updatedSettings as unknown as Prisma.InputJsonValue,
    },
  });

  // 2. Update Main Campus address & city & state
  try {
    await prisma.branch.updateMany({
      where: { instituteId: ctx.instituteId, isMainBranch: true },
      data: {
        address: address !== undefined ? (address.trim() || null) : undefined,
        city: city !== undefined ? (city.trim() || null) : undefined,
        state: state !== undefined ? (state.trim() || null) : undefined,
        guidePhone: guidePhone !== undefined ? (guidePhone.trim() || null) : undefined,
      },
    });
  } catch (branchUpdateErr) {
    console.error("Failed to sync main branch address:", branchUpdateErr);
  }

  // 3. Process Logo if provided
  if (logo && logo.base64 && logo.fileName && logo.mimeType) {
    try {
      if (ALLOWED_MIME_TYPES.has(logo.mimeType)) {
        const base64Data = logo.base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        if (buffer.length <= MAX_FILE_SIZE_BYTES) {
          const storageKey = buildStorageKey(ctx.instituteId, "INSTITUTE_LOGO", logo.fileName);
          await getStorageProvider().save(storageKey, buffer);

          await prisma.fileAsset.create({
            data: {
              instituteId: ctx.instituteId,
              uploadedByUserId: (ctx.session?.user as { id?: string } | undefined)?.id || null,
              category: "INSTITUTE_LOGO",
              fileName: logo.fileName,
              mimeType: logo.mimeType,
              sizeBytes: buffer.length,
              storageKey,
              relatedType: "Institute",
              relatedId: ctx.instituteId,
            },
          });
        }
      }
    } catch (logoErr) {
      console.error("Failed to upload logo during setup wizard:", logoErr);
    }
  }

  // 4. Create any sub-branches
  if (Array.isArray(branches) && branches.length > 0) {
    for (const b of branches) {
      if (!b.name || !b.name.trim()) continue;
      try {
        const createdBranch = await prisma.branch.create({
          data: {
            instituteId: ctx.instituteId,
            name: b.name.trim(),
            address: b.address?.trim() || null,
            city: b.city?.trim() || null,
            state: b.state?.trim() || null,
            contact: b.contact?.trim() || null,
            guidePhone: b.guidePhone?.trim() || null,
            status: "PENDING_APPROVAL",
            isMainBranch: false,
          },
        });

        let createdBranchUser = null;
        if (b.email && b.email.trim() && b.password && b.password.trim()) {
          const branchEmail = b.email.trim().toLowerCase();
          const existingUser = await prisma.user.findUnique({ where: { email: branchEmail } });
          if (!existingUser) {
            const branchPasswordHash = await bcrypt.hash(b.password.trim(), 10);
            createdBranchUser = await prisma.user.create({
              data: {
                name: `${createdBranch.name} Admin`,
                email: branchEmail,
                password: branchPasswordHash,
                role: "ADMIN",
                instituteId: ctx.instituteId,
                branchId: createdBranch.id,
              },
            });
          }
        }

        // Send branch processing email & admin alert
        try {
          if (createdBranchUser?.email) {
            await sendBranchProcessingEmail({
              to: createdBranchUser.email,
              recipientName: createdBranchUser.name,
              branchName: createdBranch.name,
              instituteName: institute.name,
              city: createdBranch.city,
              loginEmail: createdBranchUser.email,
            });
          }

          const platformAdmins = await prisma.user.findMany({
            where: { role: "PLATFORM_ADMIN" },
            select: { email: true },
          });
          const adminEmails = platformAdmins.map((a) => a.email);
          const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

          for (const adminEmail of adminEmails) {
            await sendAdminBranchAlertEmail({
              to: adminEmail,
              branchName: createdBranch.name,
              instituteName: institute.name,
              ownerName: institute.ownerName,
              city: createdBranch.city,
              state: createdBranch.state,
              contact: createdBranch.contact,
              adminPortalUrl: `${appUrl}/admin/branches`,
            });
          }
        } catch (mailErr) {
          console.error("Failed to send branch alert email:", mailErr);
        }
      } catch (branchErr) {
        console.error("Failed to create sub-branch in setup wizard:", branchErr);
      }
    }
  }

  // 5. Create initial courses
  if (Array.isArray(courses) && courses.length > 0) {
    for (const c of courses) {
      if (!c.name || !c.name.trim()) continue;
      try {
        await prisma.course.create({
          data: {
            instituteId: ctx.instituteId,
            name: c.name.trim(),
            fee: Number(c.fee) || 0,
            feeType: c.feeType || "ONE_TIME",
            duration: c.durationMonths ? `${c.durationMonths} months` : null,
            targetExam: c.code?.trim() || null,
            isAllBranches: true,
          },
        });
      } catch (courseErr) {
        console.error("Failed to create course in setup wizard:", courseErr);
      }
    }
  }

  // 6. Log audit
  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "INSTITUTE_SETUP_COMPLETED",
    entityType: "Institute",
    entityId: ctx.instituteId,
    metadata: {
      name: updatedInstitute.name,
      academicYearLabel: updatedInstitute.academicYearLabel,
      branchesCount: branches?.length || 0,
      coursesCount: courses?.length || 0,
    },
  });

  return NextResponse.json({
    success: true,
    institute: updatedInstitute,
    settings: updatedSettings,
    message: "Institute setup completed successfully.",
  });
}
