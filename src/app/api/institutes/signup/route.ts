import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { TRIAL_DAYS } from "@/lib/pricing";
import {
  sendRegistrationProcessingEmail,
  sendAdminRegistrationAlertEmail,
  sendBranchProcessingEmail,
} from "@/lib/email";
import { buildStorageKey, getStorageProvider, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/storage";
import { DEFAULT_INSTITUTE_SETTINGS } from "@/lib/institute-settings";

interface BranchSignupInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  contact?: string;
  guidePhone?: string;
  email?: string;
  password?: string;
}

interface LogoInput {
  fileName: string;
  mimeType: string;
  base64: string;
}

// Public route - no auth required, this IS how an Institute account gets
// created. Registers the Institute with PENDING_APPROVAL status so the
// platform admin can review and grant access.
export async function POST(req: Request) {
  const body = await req.json();
  const {
    instituteName,
    ownerName,
    email,
    mobile,
    password,
    address,
    city,
    state,
    academicYearLabel,
    guidePhone,
    taxNumber,
    logo,
    branches,
  } = body as {
    instituteName?: string;
    ownerName?: string;
    email?: string;
    mobile?: string;
    password?: string;
    address?: string;
    city?: string;
    state?: string;
    academicYearLabel?: string;
    guidePhone?: string;
    taxNumber?: string;
    logo?: LogoInput;
    branches?: BranchSignupInput[];
  };

  if (!instituteName || !ownerName || !email || !mobile || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const [existingInstitute, existingUser] = await Promise.all([
    prisma.institute.findFirst({ where: { OR: [{ email }, { mobile }] } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (existingInstitute || existingUser) {
    return NextResponse.json(
      { error: "An account with that email or mobile number already exists" },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const initialSettings = {
    ...DEFAULT_INSTITUTE_SETTINGS,
    taxNumber: taxNumber?.trim() || undefined,
  };

  const institute = await prisma.institute.create({
    data: {
      name: instituteName.trim(),
      ownerName: ownerName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      academicYearLabel: academicYearLabel?.trim() || null,
      guidePhone: guidePhone?.trim() || null,
      settings: initialSettings as unknown as Prisma.InputJsonValue,
      status: "PENDING_APPROVAL",
      emailVerified: false,
      trialStartedAt: now,
      trialEndsAt,
      users: {
        create: {
          name: ownerName.trim(),
          email: email.trim(),
          password: hashed,
          role: "OWNER",
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      ownerName: true,
      status: true,
      trialEndsAt: true,
      users: { select: { id: true, email: true, role: true } },
    },
  });

  const ownerUserId = institute.users[0]?.id;

  // Auto-create the Main Campus branch for the new Institute
  let mainBranchId: string | null = null;
  try {
    const mainBranch = await prisma.branch.create({
      data: {
        instituteId: institute.id,
        name: `${instituteName.trim()} (Main Campus)`,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        contact: mobile.trim(),
        guidePhone: guidePhone?.trim() || null,
        status: "PENDING_APPROVAL",
        isMainBranch: true,
      },
    });
    mainBranchId = mainBranch.id;

    if (ownerUserId) {
      await prisma.user.update({
        where: { id: ownerUserId },
        data: { branchId: mainBranch.id },
      });
    }
  } catch (mainBranchErr) {
    console.error("Failed to create main branch during signup:", mainBranchErr);
  }

  // Process Logo if uploaded during Step 2
  if (logo && logo.base64 && logo.fileName && logo.mimeType) {
    try {
      if (ALLOWED_MIME_TYPES.has(logo.mimeType)) {
        // Strip data url prefix if present
        const base64Data = logo.base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        if (buffer.length <= MAX_FILE_SIZE_BYTES) {
          const storageKey = buildStorageKey(institute.id, "INSTITUTE_LOGO", logo.fileName);
          await getStorageProvider().save(storageKey, buffer);

          await prisma.fileAsset.create({
            data: {
              instituteId: institute.id,
              uploadedByUserId: ownerUserId || null,
              category: "INSTITUTE_LOGO",
              fileName: logo.fileName,
              mimeType: logo.mimeType,
              sizeBytes: buffer.length,
              storageKey,
              relatedType: "Institute",
              relatedId: institute.id,
            },
          });
        }
      }
    } catch (logoErr) {
      console.error("Failed to process logo during signup:", logoErr);
    }
  }

  // Process Branches if provided during Step 3
  if (Array.isArray(branches) && branches.length > 0) {
    for (const b of branches) {
      if (!b.name || !b.name.trim()) continue;
      try {
        const branch = await prisma.branch.create({
          data: {
            instituteId: institute.id,
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

        // If branch email & password provided, create sub-branch user account
        if (b.email && b.email.trim() && b.password && b.password.trim()) {
          const branchEmail = b.email.trim();
          const existingBranchUser = await prisma.user.findUnique({ where: { email: branchEmail } });
          if (!existingBranchUser) {
            const branchPasswordHash = await bcrypt.hash(b.password.trim(), 10);
            await prisma.user.create({
              data: {
                name: `${branch.name} Admin`,
                email: branchEmail,
                password: branchPasswordHash,
                role: "ADMIN",
                instituteId: institute.id,
                branchId: branch.id,
              },
            });
          }
        }
      } catch (branchErr) {
        console.error("Failed to create branch during signup:", branchErr);
      }
    }
  }

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // 1. Send confirmation to the institute owner that request is in processing
  try {
    await sendRegistrationProcessingEmail({
      to: institute.email,
      ownerName: institute.ownerName,
      instituteName: institute.name,
    });
  } catch (err) {
    console.error("Failed to send processing email to institute owner:", err);
  }

  // 1b. Send processing and credentials email to any sub-branch accounts registered
  if (Array.isArray(branches) && branches.length > 0) {
    for (const b of branches) {
      if (b.email && b.email.trim()) {
        try {
          await sendBranchProcessingEmail({
            to: b.email.trim(),
            recipientName: `${b.name.trim()} Admin`,
            branchName: b.name.trim(),
            instituteName: institute.name,
            city: b.city?.trim() || null,
            loginEmail: b.email.trim(),
          });
        } catch (branchEmailErr) {
          console.error(`Failed to send processing email to sub-branch ${b.email}:`, branchEmailErr);
        }
      }
    }
  }

  // 2. Send email notification to all platform admin(s)
  try {
    const platformAdmins = await prisma.user.findMany({
      where: { role: "PLATFORM_ADMIN" },
      select: { email: true },
    });

    const adminEmails = platformAdmins.map((a) => a.email);
    // Fallback to SMTP_USER or EMAIL_FROM if no PLATFORM_ADMIN user in DB
    if (adminEmails.length === 0 && process.env.SMTP_USER) {
      adminEmails.push(process.env.SMTP_USER);
    }

    const adminPortalUrl = `${appUrl}/admin`;

    for (const adminEmail of adminEmails) {
      await sendAdminRegistrationAlertEmail({
        to: adminEmail,
        instituteName: institute.name,
        ownerName: institute.ownerName,
        instituteEmail: institute.email,
        instituteMobile: institute.mobile,
        adminPortalUrl,
      });
    }
  } catch (err) {
    console.error("Failed to send registration alert email to admin:", err);
  }

  // Record platform notification
  try {
    await prisma.platformNotification.create({
      data: {
        instituteId: institute.id,
        type: "INSTITUTE_REGISTERED",
        message: `${institute.name} submitted a registration request awaiting approval.`,
      },
    });
  } catch {
    // Ignore notification failure if schema doesn't mandate
  }

  return NextResponse.json({
    ...institute,
    message: "Registration request submitted. Your request is in processing.",
  }, { status: 201 });
}