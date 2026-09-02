import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireInstitute } from "@/lib/tenant";
import { parseInstituteSettings } from "@/lib/institute-settings";

export async function POST() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  try {
    const institute = await prisma.institute.findUnique({
      where: { id: ctx.instituteId },
      select: { settings: true },
    });

    if (!institute) {
      return NextResponse.json({ error: "Institute not found" }, { status: 404 });
    }

    const currentSettings = parseInstituteSettings(institute.settings);
    const updatedSettings = {
      ...currentSettings,
      setupWizardDismissed: true,
    };

    await prisma.institute.update({
      where: { id: ctx.instituteId },
      data: {
        settings: updatedSettings as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, message: "Setup wizard dismissed" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to dismiss setup wizard" }, { status: 500 });
  }
}
