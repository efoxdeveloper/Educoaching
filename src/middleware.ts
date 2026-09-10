import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isInstituteSubscriptionExpired, isRouteRestrictedBySubscription } from "@/lib/subscription";

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
    // "/" must remain public – page.tsx handles both logged-in (banner + LandingPage)
    // and logged-out (LandingPage) cases. Don't force redirect to /login.
    if (pathname === "/") {
      return NextResponse.next();
    }
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

  // Subscription Expiry Gate:
  // Confine institute staff to only /plans and /settings once expired.
  // Every redirect MUST preserve ?expired=1 so the destination always shows the banner.
  const user = req.auth.user as any;
  const isExpired = isInstituteSubscriptionExpired({
    billingCycle: user?.billingCycle,
    trialEndsAt: user?.trialEndsAt,
    currentPeriodEnd: user?.currentPeriodEnd,
  });

  // If expired and on /plans without ?expired=1, redirect to add the banner param
  // so direct visits to /plans also show why navigation is blocked.
  if (
    isExpired &&
    !isPlatformImpersonating &&
    !["STUDENT", "PARENT", "PLATFORM_ADMIN"].includes(role) &&
    (pathname === "/plans" || pathname === "/my-plans") &&
    req.nextUrl.searchParams.get("expired") !== "1"
  ) {
    const url = req.nextUrl.clone();
    url.searchParams.set("expired", "1");
    return NextResponse.redirect(url);
  }

  // Root "/" should cleanly redirect to /plans when expired, not appear as broken dashboard link
  if (
    isExpired &&
    !isPlatformImpersonating &&
    !["STUDENT", "PARENT", "PLATFORM_ADMIN"].includes(role) &&
    pathname === "/"
  ) {
    const plansUrl = new URL("/plans", req.url);
    plansUrl.searchParams.set("expired", "1");
    return NextResponse.redirect(plansUrl);
  }

  if (
    isRouteRestrictedBySubscription({
      pathname,
      role,
      isImpersonating: isPlatformImpersonating,
      isExpired,
    })
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Subscription expired. Please renew your plan to continue access." },
        { status: 402 }
      );
    }
    // Always re-apply ?expired=1 so the banner is visible on every bounce, not just the first
    const plansUrl = new URL("/plans", req.url);
    plansUrl.searchParams.set("expired", "1");
    return NextResponse.redirect(plansUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/api/:path*",
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