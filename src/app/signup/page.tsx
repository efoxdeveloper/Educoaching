import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignupForm } from "@/components/auth/SignupForm";

export default async function SignupPage() {
  const session = await auth();
  if (session) {
    const role = (session.user as { role?: string } | undefined)?.role;
    redirect(role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}