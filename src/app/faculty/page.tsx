import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { FacultyManagerView } from "@/components/faculty/FacultyManagerView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState, getSubBranches } from "@/lib/tenant";

export default async function FacultyPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const { branchId: activeBranchId } = await getBranchImpersonationState();
  if (!activeBranchId) redirect("/login");

  const role = String((session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  const facultyWhere: any = { instituteId, branchId: activeBranchId };

  const [staffList, batches, courses, branches] = await Promise.all([
    prisma.faculty.findMany({
      where: facultyWhere,
      include: {
        branch: { select: { id: true, name: true, city: true } },
        branches: { select: { id: true, name: true, city: true } },
        batches: { include: { batch: { include: { course: true } } } },
        user: { select: { id: true, email: true, role: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.batch.findMany({
      where: { instituteId, branchId: activeBranchId },
      include: {
        course: true,
        branch: { select: { id: true, name: true, city: true } },
        branches: { select: { id: true, name: true, city: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true, duration: true },
      orderBy: { name: "asc" },
    }),
    getSubBranches(instituteId),
  ]);

  const serialized = staffList.map((f) => ({
    ...f,
    joiningDate: f.joiningDate.toISOString(),
    createdAt: f.createdAt.toISOString(),
    monthlySalary: f.monthlySalary ? Number(f.monthlySalary) : null,
    branch: f.branch ? { id: f.branch.id, name: f.branch.name, city: f.branch.city } : null,
    branches: f.branches.map((b) => ({ id: b.id, name: b.name, city: b.city })),
    isAllBranches: f.isAllBranches,
    subjects: f.subjects && f.subjects.length > 0 ? f.subjects : (f.subject ? f.subject.split(",").map((s) => s.trim()).filter(Boolean) : []),
    batches: f.batches.map((bf) => ({
      batchId: bf.batchId,
      batchName: bf.batch.name,
      courseId: bf.batch.courseId,
      courseName: bf.batch.course.name,
    })),
    permissions: f.permissions || [],
    user: f.user ? { id: f.user.id, email: f.user.email, role: f.user.role } : null,
  }));

  const serializedBatches = batches.map((b) => {
    const branchLabel = b.isAllBranches
      ? "All Branches"
      : b.branches && b.branches.length > 0
      ? b.branches.map((br) => br.name).join(", ")
      : b.branch
      ? b.branch.name
      : "Main Branch";

    return {
      id: b.id,
      name: b.name,
      timing: b.timing,
      courseId: b.courseId,
      courseName: b.course.name,
      branchName: branchLabel,
      isAllBranches: b.isAllBranches,
    };
  });

  return (
    <Shell title="Staff & Faculty Management" userName={session?.user?.name ?? undefined}>
      <FacultyManagerView
        faculty={serialized}
        batches={serializedBatches}
        courses={courses}
        branches={branches}
      />
    </Shell>
  );
}