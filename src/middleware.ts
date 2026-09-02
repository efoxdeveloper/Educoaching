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

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/batches/:path*",
    "/attendance/:path*",
    "/fees/:path*",
    "/settings/:path*",
    "/plans/:path*",
    "/my-plans/:path*",
    "/portal/:path*",
    "/admin/:path*",
  ],
};