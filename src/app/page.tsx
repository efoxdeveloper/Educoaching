import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function Home() {
  const session = await auth();

  if (session) {
    const role = (session.user as { role?: string } | undefined)?.role;
    if (role === "PLATFORM_ADMIN") redirect("/admin");
    if (role === "STUDENT" || role === "PARENT") redirect("/portal");
    redirect("/dashboard");
  }

  return <LandingPage />;
}