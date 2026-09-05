import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const pathname = req.nextUrl.pathname;

  // Allow public access to security verification routes
  if (
    pathname === "/settings/verify-security" ||
    pathname.startsWith("/verify-security") ||
    pathname === "/admin/verify-email" ||
    pathname.startsWith("/admin/verify-email")
  ) {
    return NextResponse.next();
  }

  // Whitelisted public API routes that do not require session auth
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/institutes/signup") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/public-enquiry") ||
    pathname.startsWith("/api/verify-security") ||
    pathname.startsWith("/api/admin/me/verify-email-change") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/exam") ||
    pathname.startsWith("/api/cron")
  ) {
    return NextResponse.next();
  }

  // If not logged in and accessing protected route:
  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = String((req.auth.user as { role?: string })?.role || "").toUpperCase();
  // Impersonation detection for middleware — must allow PLATFORM_ADMIN to stay on /portal when impersonating
  // Branch impersonation via JWT (impersonatingBranchId / isImpersonatingBranch), platform impersonation via cookie
  const isImpersonatingBranch = Boolean(
    (req.auth.user as any)?.impersonatingBranchId || (req.auth.user as any)?.isImpersonatingBranch
  );
  const isPlatformImpersonating = Boolean(
    req.cookies.get("platform_impersonate_institute")?.value || req.cookies.get("platform_impersonating_branch")?.value
  );
  const isImpersonating = isImpersonatingBranch || isPlatformImpersonating;

  // If role is STUDENT or PARENT, strictly confine access to /portal (skip API requests)
  if ((role === "STUDENT" || role === "PARENT") && !pathname.startsWith("/portal") && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // If staff/admin role accesses /portal, redirect them away to their dashboard
  if (
    (role === "OWNER" ||
      role === "ADMIN" ||
      role === "STAFF" ||
      role === "FACULTY" ||
      role === "ACCOUNTANT" ||
      role === "COUNSELLOR" ||
      role === "TECHNICIAN") &&
    pathname.startsWith("/portal")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (role === "PLATFORM_ADMIN" && pathname.startsWith("/portal") && !isImpersonating) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/students/:path*",
    "/admissions/:path*",
    "/courses/:path*",
    "/batches/:path*",
    "/timetable/:path*",
    "/subjects/:path*",
    "/faculty/:path*",
    "/attendance/:path*",
    "/tests/:path*",
    "/live-classes/:path*",
    "/certificates/:path*",
    "/study-material/:path*",
    "/assignments/:path*",
    "/fees/:path*",
    "/expenses/:path*",
    "/income/:path*",
    "/communication/:path*",
    "/reports/:path*",
    "/branches/:path*",
    "/settings/:path*",
    "/plans/:path*",
    "/my-plans/:path*",
    "/portal/:path*",
    "/admin/:path*",
    "/support/:path*",
  ],
};