import { NextResponse } from "next/server";
import { requireInstitute } from "@/lib/tenant";
import { getReportsData } from "@/lib/reports-data";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const courseId = searchParams.get("courseId") || undefined;
  const batchId = searchParams.get("batchId") || undefined;

  try {
    const data = await getReportsData(ctx.instituteId, ctx.branchId as string, {
      startDate,
      endDate,
      courseId,
      batchId,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating reports data:", error);
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 });
  }
}
