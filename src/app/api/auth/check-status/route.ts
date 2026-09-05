import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email ? String(body.email).trim().toLowerCase() : null;

    if (!email) {
      return NextResponse.json({ status: "UNKNOWN" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        institute: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            status: true,
            isMainBranch: true,
          },
        },
      },
    });

    if (!user) {
      // Also check if an institute was created directly with this email
      const institute = await prisma.institute.findUnique({
        where: { email },
        select: { id: true, name: true, status: true },
      });
      if (institute) {
        if (institute.status === "PENDING_APPROVAL") {
          return NextResponse.json({
            status: "PENDING_APPROVAL",
            type: "institute",
            title: "Registration Request in Processing",
            message: `Your registration request for "${institute.name}" is currently in processing. Our platform administrator is verifying your institute details and physical campus. You will receive an email once access is granted.`,
          });
        }
        if (institute.status === "SUSPENDED") {
          return NextResponse.json({
            status: "SUSPENDED",
            type: "institute",
            title: "Institute Account Suspended",
            message: "Your institute's account has been suspended. Please contact support.",
          });
        }
      }
      return NextResponse.json({ status: "UNKNOWN" });
    }

    // 1. Check parent institute status
    if (user.institute) {
      if (user.institute.status === "PENDING_APPROVAL") {
        return NextResponse.json({
          status: "PENDING_APPROVAL",
          type: "institute",
          title: "Registration Request in Processing",
          message: `Your registration request for "${user.institute.name}" is currently in processing. Our platform administrator is verifying your institute details and physical campus. You will receive an email once access is granted.`,
        });
      }
      if (user.institute.status === "SUSPENDED") {
        return NextResponse.json({
          status: "SUSPENDED",
          type: "institute",
          title: "Institute Account Suspended",
          message: "Your institute's account has been suspended. Please contact support.",
        });
      }
    }

    // 2. Check branch status
    if (user.branch && user.branch.status === "PENDING_APPROVAL") {
      return NextResponse.json({
        status: "PENDING_APPROVAL",
        type: "branch",
        title: "Sub-Branch Access Request in Processing",
        message: `Your sub-branch access request for "${user.branch.name}" is currently in processing. You will receive an email and can sign in once the platform administrator grants access.`,
      });
    }

    if (user.branch && user.branch.status === "INACTIVE") {
      return NextResponse.json({
        status: "INACTIVE",
        type: "branch",
        title: "Sub-Branch Currently Inactive",
        message: `Sub-branch "${user.branch.name}" is currently inactive. Please contact your main branch administrator.`,
      });
    }

    return NextResponse.json({ status: "ACTIVE" });
  } catch {
    return NextResponse.json({ status: "ERROR" }, { status: 500 });
  }
}
