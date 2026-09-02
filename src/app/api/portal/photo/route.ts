import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();

  const body = await req.json();
  const { studentId, photoUrl } = body;

  if (!photoUrl) {
    return NextResponse.json({ error: "Photograph data is required" }, { status: 400 });
  }

  // Identify the target student
  let targetStudent = null;
  if (studentId) {
    targetStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });
  } else if (session?.user?.email) {
    targetStudent = await prisma.student.findFirst({
      where: { email: session.user.email },
    });
  }

  if (!targetStudent) {
    return NextResponse.json({ error: "Student record not found" }, { status: 404 });
  }

  const updated = await prisma.student.update({
    where: { id: targetStudent.id },
    data: { photoUrl: String(photoUrl).trim() },
    select: { id: true, name: true, photoUrl: true },
  });

  return NextResponse.json({ success: true, student: updated });
}
