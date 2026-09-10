import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function Home() {
  const session = await auth();

  if (session) {
    const role = (session.user as { role?: string } | undefined)?.role;
    const name = (session.user as { name?: string } | undefined)?.name || session.user?.email || "User";
    const dashboardHref =
      role === "PLATFORM_ADMIN" ? "/admin" : role === "STUDENT" || role === "PARENT" ? "/portal" : "/dashboard";

    return (
      <div className="min-h-screen bg-paper">
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-amber-900">
              Signed in as <span className="font-semibold">{name}</span>
              {role ? <span className="ml-1 text-amber-700">({role})</span> : null}
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={dashboardHref}
                className="rounded-lg bg-scholar-600 px-4 py-2 text-sm font-semibold text-white hover:bg-scholar-700"
              >
                Continue as {name}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg border border-scholar-200 bg-white px-4 py-2 text-sm font-semibold text-scholar-700 hover:bg-scholar-50"
                >
                  Sign out and choose a different portal
                </button>
              </form>
            </div>
          </div>
        </div>
        <LandingPage />
      </div>
    );
  }

  return <LandingPage />;
}