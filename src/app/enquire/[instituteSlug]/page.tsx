import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicEnquiryClient } from "./PublicEnquiryClient";

export default async function PublicEnquiryPage({
  params,
}: {
  params: { instituteSlug: string };
}) {
  const rawSlug = params.instituteSlug?.trim() || "";
  if (!rawSlug) notFound();

  const institute = await prisma.institute.findFirst({
    where: {
      OR: [
        { instituteSlug: rawSlug.toLowerCase() },
        { id: rawSlug },
      ],
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      address: true,
      guidePhone: true,
      instituteSlug: true,
      courses: {
        select: {
          id: true,
          name: true,
          fee: true,
          duration: true,
          description: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!institute) {
    return (
      <div className="min-h-screen bg-scholar-950 flex flex-col items-center justify-center p-4 text-white text-center">
        <div className="max-w-md bg-white text-ink p-8 rounded-3xl shadow-2xl space-y-3">
          <h1 className="font-display text-xl font-bold text-ink">Institute Not Found</h1>
          <p className="text-xs text-scholar-500">
            The enquiry link you followed does not exist or this coaching institute is not currently accepting online submissions.
          </p>
        </div>
      </div>
    );
  }

  const serialized = {
    ...institute,
    courses: institute.courses.map((c) => ({
      ...c,
      fee: Number(c.fee),
    })),
  };

  return <PublicEnquiryClient institute={serialized} slug={rawSlug} />;
}
