import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getImpersonationState } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getImpersonationState();
  if (!state.isImpersonating || !state.instituteId) {
    return NextResponse.json(
      { isImpersonating: false, instituteName: null },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    );
  }

  const institute = await prisma.institute.findUnique({
    where: { id: state.instituteId },
    select: { id: true, name: true },
  });

  return NextResponse.json(
    {
      isImpersonating: true,
      instituteId: state.instituteId,
      instituteName: institute?.name ?? "Unknown Institute",
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
  );
}
