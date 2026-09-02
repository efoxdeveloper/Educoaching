import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if ("error" in ctx) return ctx.error;

  const institutes = await prisma.institute.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      ownerName: true,
      email: true,
      mobile: true,
      status: true,
      billingCycle: true,
      platformSubscriptionStatus: true,
      currentPeriodAmount: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      createdAt: true,
      _count: {
        select: { students: true, batches: true, faculty: true },
      },
    },
  });

  return NextResponse.json(institutes);
}