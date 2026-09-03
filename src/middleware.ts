import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  // Allow public access to security verification routes
  if (pathname === "/settings/verify-security" || pathname.startsWith("/verify-security")) {
    return NextResponse.next();
  }

  // If not logged in and accessing protected route, redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // If role is STUDENT or PARENT, strictly confine access to /portal
  if ((role === "STUDENT" || role === "PARENT") && !pathname.startsWith("/portal")) {
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

  if (role === "PLATFORM_ADMIN" && pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
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