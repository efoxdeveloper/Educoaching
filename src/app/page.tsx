import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function Home() {
  const session = await auth();

  if (session) {
    // Platform admins and institute users land in different dashboards.
    // (Admin dashboard route arrives in a later step.)
    if ((session.user as { role?: string })?.role === "PLATFORM_ADMIN") {
      redirect("/admin");
    }
    redirect("/dashboard");
  }

  return <LandingPage />;
}