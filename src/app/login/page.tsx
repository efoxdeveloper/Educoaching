import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) {
    const role = (session.user as { role?: string } | undefined)?.role;
    redirect(role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
