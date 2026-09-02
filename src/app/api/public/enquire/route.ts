import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCustomAlert } from "@/lib/whatsapp";
import { sendBroadcastEmail } from "@/lib/email";
import { checkEnquiryRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const body = await req.json().catch(() => ({}));
    const { instituteSlug, applicantName, mobile, email, courseId, message } = body as {
      instituteSlug?: string;
      applicantName?: string;
      mobile?: string;
      email?: string;
      courseId?: string;
      message?: string;
    };

    if (!instituteSlug || !instituteSlug.trim()) {
      return NextResponse.json({ error: "Institute identifier is required" }, { status: 400 });
    }

    if (!applicantName || !applicantName.trim()) {
      return NextResponse.json({ error: "Applicant name is required" }, { status: 400 });
    }

    const cleanMobile = String(mobile || "").trim().replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length < 10) {
      return NextResponse.json({ error: "A valid 10-digit mobile number is required" }, { status: 400 });
    }

    // Rate Limit Check
    const rateLimit = checkEnquiryRateLimit(ip, cleanMobile);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many enquiry submissions from this device. Please try again tomorrow or contact the institute directly." },
        { status: 429 }
      );
    }

    // Resolve active institute
    const cleanSlug = instituteSlug.trim().toLowerCase();
    const institute = await prisma.institute.findFirst({
      where: {
        OR: [
          { instituteSlug: cleanSlug },
          { id: instituteSlug.trim() },
        ],
        status: "ACTIVE",
      },
      include: {
        courses: {
          select: { id: true, name: true, fee: true },
        },
        faculty: {
          where: { status: "ACTIVE" },
          select: { id: true, name: true, email: true, mobile: true, roleType: true },
        },
      },
    });

    if (!institute) {
      return NextResponse.json({ error: "Institute not found or currently inactive" }, { status: 404 });
    }

    // Validate course if provided
    let selectedCourse = institute.courses.find((c) => c.id === courseId);
    if (!selectedCourse && institute.courses.length > 0) {
      // Pick first course or generic
      selectedCourse = institute.courses[0];
    }

    if (!selectedCourse) {
      return NextResponse.json({ error: "No active courses available for enquiry" }, { status: 400 });
    }

    // Auto-assign counsellor if available
    const counsellors = institute.faculty.filter((f) => f.roleType === "COUNSELLOR");
    const assignedCounsellor = counsellors.length > 0 ? counsellors[0] : null;

    // Create Admission record (Write-Only)
    const admission = await prisma.admission.create({
      data: {
        instituteId: institute.id,
        applicantName: applicantName.trim(),
        mobile: cleanMobile,
        email: email ? email.trim().toLowerCase() : null,
        courseId: selectedCourse.id,
        feePlan: selectedCourse.fee,
        source: "WEBSITE",
        stage: "NEW",
        priority: "WARM",
        assignedTo: assignedCounsellor?.name || null,
        assignedToId: assignedCounsellor?.id || null,
        note: message ? message.trim() : "Online website inquiry form",
        nextFollowUpDate: new Date(), // Immediate follow-up needed
      },
    });

    // Notify Counsellors / Institute Owner asynchronously
    (async () => {
      try {
        const notifyMobile = assignedCounsellor?.mobile || institute.mobile;
        const notifyEmail = assignedCounsellor?.email || institute.email;
        const noteSnippet = message ? ` — Note: "${message.trim()}"` : "";

        if (notifyMobile) {
          await sendCustomAlert(
            notifyMobile,
            applicantName.trim(),
            `🌐 New Website Lead received for ${selectedCourse.name}! Contact: ${cleanMobile}${noteSnippet}`
          );
        }

        if (notifyEmail) {
          await sendBroadcastEmail({
            to: notifyEmail,
            subject: `🌐 New Website Enquiry: ${applicantName.trim()} (${selectedCourse.name})`,
            message: `A new prospective student enquiry was submitted through your public website form:\n\n• Applicant: ${applicantName.trim()}\n• Mobile: ${cleanMobile}\n• Email: ${email || "Not provided"}\n• Course Interest: ${selectedCourse.name}\n• Message: ${message || "No message left"}\n\nPlease check your Admissions CRM to log initial counselling.`,
            recipientName: assignedCounsellor?.name || institute.ownerName,
            instituteName: institute.name,
          });
        }
      } catch (notifyErr) {
        console.error("[public/enquire] Failed to dispatch counsellor notification:", notifyErr);
      }
    })();

    // Write-only response: never leak database IDs or candidate lists to public
    return NextResponse.json({
      ok: true,
      message: "Thank you for reaching out! Our academic counselling team has received your enquiry and will connect with you shortly.",
    });
  } catch (err) {
    console.error("[public/enquire] Internal error:", err);
    return NextResponse.json({ error: "Failed to submit enquiry. Please try again later." }, { status: 500 });
  }
}
