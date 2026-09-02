"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Mail, Lock, GraduationCap, AlertCircle, Phone, ArrowRight, Clock, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal"); // "admin" | "institute" | null
  const isAdminPortal = portal === "admin";

  const [authMode, setAuthMode] = useState<"staff" | "student">("staff");
  const emailParam = searchParams.get("email");
  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Student Login state
  const [studentInput, setStudentInput] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentMobile, setStudentMobile] = useState("");

  const [error, setError] = useState("");
  const [pendingNotice, setPendingNotice] = useState<{
    title: string;
    message: string;
    type?: string;
  } | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendingNotice(null);
    setNeedsVerification(false);
    setLoading(true);

    const isStudent = authMode === "student";
    const loginIdentifier = isStudent ? studentInput.trim() : email.trim();
    const loginPassword = isStudent ? studentPassword : password;

    if (!loginIdentifier || !loginPassword) {
      setError(
        isStudent
          ? "Please enter your registered mobile number / email and password."
          : "Please enter your email and password."
      );
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      email: loginIdentifier,
      password: loginPassword,
      portal: portal ?? "",
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      // Check if this account or institute/branch is currently pending platform admin approval or suspended
      try {
        const checkRes = await fetch("/api/auth/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginIdentifier }),
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.status === "PENDING_APPROVAL") {
            setPendingNotice({
              title: checkData.title || "Request Currently in Processing",
              message:
                checkData.message ||
                "Your registration request is currently in processing. Our platform administrator is verifying your details and you will receive an email once access is granted.",
              type: checkData.type,
            });
            return;
          }
          if (checkData.status === "SUSPENDED" || checkData.status === "INACTIVE") {
            setError(checkData.message);
            return;
          }
        }
      } catch {
        // Fallback to error code mapping
      }

      const messages: Record<string, string> = {
        InstituteSuspended: "Your institute's account has been suspended. Please contact support.",
        InstitutePendingApproval:
          "Your registration request is in processing. Our platform administrator is verifying your details and you will receive an email once access is granted.",
        BranchPendingApproval:
          "Your sub-branch access request is in processing. You can sign in once the platform administrator grants access.",
        UseInstitutePortal: "This is an Institute account. Please sign in from the Institute login.",
        UseAdminPortal: "This is a Platform Admin account. Please sign in from the Admin login.",
        EmailNotVerified: "Please verify your email before signing in.",
      };
      const errorCode = (res as { code?: string })?.code || res.error;
      if (messages[errorCode]) {
        setError(messages[errorCode]);
      } else {
        setError(
          isStudent
            ? "Incorrect student credentials. The mobile number/email or password you entered does not match any registered student record. Please try again."
            : "Invalid email or password. Please check your credentials and try again."
        );
      }
      setNeedsVerification(errorCode === "EmailNotVerified");
      return;
    }

    const session = await getSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    router.push(role === "PLATFORM_ADMIN" ? "/admin" : role === "STUDENT" ? "/portal" : "/dashboard");
    router.refresh();
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendingNotice(null);
    setNeedsVerification(false);
    setLoading(true);

    const identifier = (studentInput || studentMobile).trim();

    if (!identifier) {
      setError("Please enter your registered mobile number or email address.");
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      email: identifier,
      password: studentPassword.trim() || "student-portal",
      portal: portal ?? "",
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(
        "No matching student record found. Please verify your mobile number / email or enter your password."
      );
      return;
    }

    const session = await getSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    router.push(role === "STUDENT" ? "/portal" : "/dashboard");
    router.refresh();
  };

  const handleFillDemoStudent = () => {
    setStudentInput("9876543210");
    setStudentMobile("9876543210");
    setStudentPassword("password123");
    setError("");
  };

  const handleFillDemoStaff = () => {
    setEmail("owner@vidyalaya.test");
    setPassword("password123");
    setError("");
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-scholar-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-semibold">Vidyalaya</span>
        </div>

        <div>
          <p className="font-display text-3xl font-semibold leading-tight">
            Run your institute from
            <br /> one clean platform.
          </p>
          <p className="mt-4 max-w-sm text-sm text-scholar-200">
            Role-separated dashboards for Owners, Faculty, Counsellors, Accountants, and Students.
          </p>
        </div>

        <p className="text-xs text-scholar-300">© {new Date().getFullYear()} Vidyalaya Admin</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-paper p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
              <GraduationCap size={22} strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-semibold text-ink">Vidyalaya</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink">
            {isAdminPortal ? "Platform Admin" : "Sign In to Portal"}
          </h2>
          <p className="mt-1 text-sm text-scholar-400">
            {isAdminPortal
              ? "Sign in to manage institutes on the platform."
              : "Access your role-specific dashboard or student workspace."}
          </p>

          {/* Mode Switcher (Staff vs Student) */}
          {!isAdminPortal && (
            <div className="mt-6 flex rounded-xl border border-scholar-200 bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("staff");
                  setError("");
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  authMode === "staff"
                    ? "bg-scholar-600 text-white shadow-xs"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                Staff & Faculty
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("student");
                  setError("");
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  authMode === "student"
                    ? "bg-scholar-600 text-white shadow-xs"
                    : "text-scholar-600 hover:text-scholar-900"
                }`}
              >
                Student / Parent
              </button>
            </div>
          )}

          {pendingNotice && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 shadow-xs">
              <div className="flex items-start gap-2.5">
                <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900 text-sm leading-tight">
                    {pendingNotice.title}
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    {pendingNotice.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-danger-500/20 bg-danger-50 px-3 py-2.5 text-sm text-danger-600">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Staff & Faculty Login Form */}
          {authMode === "staff" ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {needsVerification && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="block text-center text-xs font-medium text-scholar-600 hover:text-scholar-700 hover:underline"
                >
                  Resend verification email
                </Link>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Official Email</label>
                <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-2.5 focus-within:border-scholar-400">
                  <Mail size={16} className="text-scholar-300" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="you@institute.com"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-ink">Password</label>
                  <Link
                    href={`/forgot-password${portal ? `?portal=${portal}` : ""}`}
                    className="text-xs font-medium text-scholar-600 hover:text-scholar-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-2.5 focus-within:border-scholar-400">
                  <Lock size={16} className="text-scholar-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-scholar-400 hover:text-scholar-700 transition shrink-0 p-0.5 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scholar-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in to Dashboard"}
              </button>
            </form>
          ) : (
            /* Student / Parent Access Form (Supports Mobile & Email + Password) */
            <form onSubmit={handleStudentSubmit} className="mt-6 space-y-4">
              <div className="rounded-xl border border-scholar-200 bg-scholar-50/60 p-3 text-xs text-scholar-700">
                <p className="font-semibold text-scholar-900">Student & Parent Portal Access</p>
                <p className="mt-0.5 text-scholar-600">
                  Sign in using your registered 10-digit mobile number or student email.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Registered Mobile Number or Email
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-2.5 focus-within:border-scholar-400">
                  <Phone size={16} className="text-scholar-300" />
                  <input
                    type="text"
                    required
                    value={studentInput || studentMobile}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentInput(val);
                      setStudentMobile(val);
                    }}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="e.g. 9876543210 or student@institute.com"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-ink">
                    Password <span className="text-xs font-normal text-scholar-400">(Optional for mobile)</span>
                  </label>
                  <Link
                    href={`/forgot-password${portal ? `?portal=${portal}` : ""}`}
                    className="text-xs font-medium text-scholar-600 hover:text-scholar-700 hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-scholar-100 bg-white px-3 py-2.5 focus-within:border-scholar-400">
                  <Lock size={16} className="text-scholar-300" />
                  <input
                    type={showStudentPassword ? "text" : "password"}
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Enter password or leave blank for mobile access"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="text-scholar-400 hover:text-scholar-700 transition shrink-0 p-0.5 focus:outline-none"
                    aria-label={showStudentPassword ? "Hide password" : "Show password"}
                  >
                    {showStudentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-scholar-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-scholar-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Access Student Portal"} <ArrowRight size={15} />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleFillDemoStudent}
                  className="text-xs font-medium text-scholar-600 hover:text-scholar-800 hover:underline inline-flex items-center gap-1"
                >
                  ⚡ Auto-fill Demo Student (Aarav Sharma)
                </button>
              </div>
            </form>
          )}

          {!isAdminPortal && authMode === "staff" && (
            <div className="mt-5 space-y-3">
              <p className="text-center text-xs text-scholar-500">
                New institute owner?{" "}
                <Link href="/signup" className="font-bold text-scholar-700 hover:underline">
                  Register your Institute (14-day Free Trial)
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}