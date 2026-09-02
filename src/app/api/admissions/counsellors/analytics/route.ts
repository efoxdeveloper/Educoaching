import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

export async function GET(req: Request) {
  const ctx = await requirePermission("admissions:read");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const timeRange = searchParams.get("timeRange") || "ALL"; // "ALL" | "THIS_MONTH" | "LAST_30_DAYS"

  let dateFilter: { gte?: Date } = {};
  const now = new Date();
  if (timeRange === "THIS_MONTH") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = { gte: startOfMonth };
  } else if (timeRange === "LAST_30_DAYS") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    dateFilter = { gte: thirtyDaysAgo };
  }

  // Fetch all admissions, follow-ups, faculty, and users for this institute
  const [admissions, followUps, facultyList, instituteUsers] = await Promise.all([
    prisma.admission.findMany({
      where: {
        instituteId: ctx.instituteId,
        ...(dateFilter.gte ? { createdAt: dateFilter } : {}),
      },
      select: {
        id: true,
        applicantName: true,
        mobile: true,
        feePlan: true,
        stage: true,
        status: true,
        assignedTo: true,
        assignedToId: true,
        assignedCounsellor: { select: { id: true, name: true } },
        createdAt: true,
      },
    }),
    prisma.leadFollowUp.findMany({
      where: {
        instituteId: ctx.instituteId,
        ...(dateFilter.gte ? { createdAt: dateFilter } : {}),
      },
      select: {
        id: true,
        counsellor: true,
        callStatus: true,
        scheduledAt: true,
        createdAt: true,
        admissionId: true,
      },
    }),
    prisma.faculty.findMany({
      where: {
        instituteId: ctx.instituteId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        roleType: true,
      },
    }),
    prisma.user.findMany({
      where: {
        instituteId: ctx.instituteId,
        role: { in: ["STAFF", "ADMIN", "OWNER", "COUNSELLOR"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
  ]);

  const facultyMap = new Map(facultyList.map((f) => [f.id, f.name]));

  // Helper to resolve an admission's counsellor name
  const getAdmissionCounsellorName = (a: (typeof admissions)[number]) => {
    if (a.assignedCounsellor?.name) return a.assignedCounsellor.name;
    if (a.assignedToId && facultyMap.has(a.assignedToId)) return facultyMap.get(a.assignedToId)!;
    if (a.assignedTo && a.assignedTo.trim()) return a.assignedTo.trim();
    return null;
  };

  // Gather all unique counselor names
  const counsellorSet = new Set<string>();
  facultyList.forEach((f) => {
    if (f.roleType === "COUNSELLOR") counsellorSet.add(f.name);
  });
  instituteUsers.forEach((u) => {
    if (u.name) counsellorSet.add(u.name);
  });
  admissions.forEach((a) => {
    const name = getAdmissionCounsellorName(a);
    if (name) counsellorSet.add(name);
  });
  followUps.forEach((f) => {
    if (f.counsellor && f.counsellor.trim()) counsellorSet.add(f.counsellor.trim());
  });

  // Calculate per-counselor metrics
  const counsellorsList = Array.from(counsellorSet);

  const counsellorStats = counsellorsList.map((name) => {
    const assigned = admissions.filter((a) => {
      const counsellorName = getAdmissionCounsellorName(a);
      return counsellorName?.toLowerCase() === name.toLowerCase();
    });
    const calls = followUps.filter((f) => f.counsellor?.toLowerCase() === name.toLowerCase());

    const enrolled = assigned.filter((a) => a.stage === "ENROLLED" || a.status === "ENROLLED");
    const lost = assigned.filter((a) => a.stage === "LOST" || a.status === "REJECTED");
    const active = assigned.filter((a) =>
      ["NEW", "CONTACTED", "DEMO_SCHEDULED", "COUNSELLING"].includes(a.stage)
    );

    const demos = calls.filter((f) => f.callStatus === "DEMO_BOOKED" || f.callStatus === "VISIT_PLANNED");
    const revenue = enrolled.reduce((acc, a) => acc + Number(a.feePlan || 0), 0);
    const conversionRate = assigned.length > 0 ? (enrolled.length / assigned.length) * 100 : 0;

    const dispositionBreakdown: Record<string, number> = {};
    calls.forEach((c) => {
      dispositionBreakdown[c.callStatus] = (dispositionBreakdown[c.callStatus] || 0) + 1;
    });

    const avgCallsPerLead = assigned.length > 0 ? Number((calls.length / assigned.length).toFixed(1)) : 0;

    return {
      counsellor: name,
      assignedCount: assigned.length,
      callsLogged: calls.length,
      demosBooked: demos.length,
      enrolledCount: enrolled.length,
      lostCount: lost.length,
      activePipeline: active.length,
      conversionRate: Number(conversionRate.toFixed(1)),
      revenueGenerated: revenue,
      avgCallsPerLead,
      dispositionBreakdown,
    };
  });

  // Sort by enrolled count then revenue
  counsellorStats.sort((a, b) => b.enrolledCount - a.enrolledCount || b.revenueGenerated - a.revenueGenerated);

  // Calculate overall institute benchmarks
  const totalLeads = admissions.length;
  const totalCalls = followUps.length;
  const totalEnrolled = admissions.filter(
    (a) => a.stage === "ENROLLED" || a.status === "ENROLLED"
  ).length;
  const overallConversionRate = totalLeads > 0 ? Number(((totalEnrolled / totalLeads) * 100).toFixed(1)) : 0;
  const totalRevenue = admissions
    .filter((a) => a.stage === "ENROLLED" || a.status === "ENROLLED")
    .reduce((acc, a) => acc + Number(a.feePlan || 0), 0);

  const topCounsellor = counsellorStats.length > 0 && counsellorStats[0].enrolledCount > 0
    ? counsellorStats[0]
    : null;

  // Overall call disposition totals
  const overallDispositions: Record<string, number> = {};
  followUps.forEach((f) => {
    overallDispositions[f.callStatus] = (overallDispositions[f.callStatus] || 0) + 1;
  });

  return NextResponse.json({
    counsellors: counsellorStats,
    summary: {
      totalLeads,
      totalCalls,
      totalEnrolled,
      overallConversionRate,
      totalRevenue,
      topCounsellor,
      overallDispositions,
    },
  });
}
