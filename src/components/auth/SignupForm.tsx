"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Mail,
  Clock,
  Building2,
  Phone,
  Lock,
  User,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { TRIAL_DAYS } from "@/lib/pricing";

export function SignupForm() {
  const [instituteName, setInstituteName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!instituteName.trim() || !ownerName.trim() || !email.trim() || !mobile.trim() || !password) {
      setError("Please fill out all required fields.");
      return;
    }

    if (mobile.replace(/\D/g, "").length !== 10) {
      setError("Mobile number must be exactly 10 digits.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/institutes/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteName: instituteName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.replace(/\D/g, ""),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit registration request.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If successfully submitted, show processing screen
  if (submitted) {
    return (
      <div className="flex min-h-screen">
        {/* Brand sidebar panel */}
        <div className="relative hidden w-1/3 flex-col justify-between bg-scholar-800 p-12 text-white lg:flex">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-marigold-400 text-scholar-950 shadow-sm">
              <GraduationCap size={22} strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">Vidyalaya</span>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-scholar-700/60 px-3 py-1 text-xs font-semibold text-scholar-200 backdrop-blur-xs mb-4 border border-scholar-600/40">
              <ShieldCheck size={13} className="text-scholar-300" />
              Verified Multi-Tenant Platform
            </div>
            <h3 className="font-display text-2xl font-bold leading-snug">
              Welcome to the Vidyalaya network.
            </h3>
            <p className="mt-3 text-sm text-scholar-300 leading-relaxed">
              Your registration request has been dispatched to our platform administrators.
            </p>
          </div>

          <p className="text-xs text-scholar-400">© {new Date().getFullYear()} Vidyalaya</p>
        </div>

        {/* Success Confirmation panel */}
        <div className="flex w-full items-center justify-center bg-paper p-6 lg:w-2/3">
          <div className="w-full max-w-lg rounded-2xl border border-scholar-100 bg-white p-8 shadow-card text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock size={32} />
            </div>

            <h2 className="mt-5 font-display text-2xl font-bold text-ink">
              Registration Request in Processing
            </h2>

            <p className="mt-2 text-sm text-scholar-600">
              Thank you for registering <strong>{instituteName}</strong>. Your account has been created with email <strong className="text-ink">{email}</strong>.
            </p>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">
                  !
                </div>
                <div className="text-xs text-amber-900 space-y-1.5">
                  <p className="font-semibold">What happens next?</p>
                  <p className="text-amber-800 leading-relaxed">
                    1. Our Platform Administrator will review your institute credentials to verify authenticity.
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    2. Once verified, access is granted and you will receive a confirmation email.
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    3. On your first login, an interactive <strong>Step-by-Step Setup Wizard</strong> will open to guide you in setting your physical campus address, manual academic session, institute logo, and initial courses.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={`/login?portal=institute&email=${encodeURIComponent(email)}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-scholar-600 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-scholar-700"
              >
                Go to Sign In Portal <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="text-xs font-medium text-scholar-500 hover:text-scholar-800 transition"
              >
                Return to Login Screen
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand sidebar */}
      <div className="relative hidden w-1/3 flex-col justify-between bg-scholar-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-marigold-400 text-scholar-950 shadow-sm">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Vidyalaya</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-scholar-700/60 px-3 py-1 text-xs font-semibold text-scholar-200 backdrop-blur-xs mb-4 border border-scholar-600/40">
            <Sparkles size={13} className="text-marigold-400" />
            {TRIAL_DAYS}-Day Free Trial Included
          </div>
          <h3 className="font-display text-3xl font-bold leading-tight">
            Smart coaching &amp; institute management.
          </h3>
          <p className="mt-4 text-sm text-scholar-200/90 leading-relaxed">
            Run your admissions, batch scheduling, attendance, fees, automated reminders, and online exams from one unified dashboard.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Quick verification request to platform admin",
              "Interactive step-by-step setup wizard after approval",
              "Multi-branch and faculty permission controls",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-scholar-200">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-scholar-400">© {new Date().getFullYear()} Vidyalaya</p>
      </div>

      {/* Registration Form Panel */}
      <div className="flex w-full items-center justify-center bg-paper p-6 lg:w-2/3">
        <div className="w-full max-w-lg rounded-2xl border border-scholar-100 bg-white p-8 shadow-card">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
              <GraduationCap size={20} strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-ink">Vidyalaya</span>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-ink">
              Register Your Institute
            </h2>
            <p className="mt-1 text-xs text-scholar-500">
              Provide basic credentials to submit your registration request. Once approved by the Platform Administrator, a setup wizard will assist you with full profile details.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Institute Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink">
                Institute / Coaching Name <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 focus-within:border-scholar-500 focus-within:ring-2 focus-within:ring-scholar-100">
                <Building2 size={16} className="text-scholar-400 shrink-0" />
                <input
                  type="text"
                  required
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  placeholder="e.g. Apex Coaching Institute"
                  className="w-full bg-transparent text-xs text-ink outline-none"
                />
              </div>
            </div>

            {/* Owner Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink">
                Owner / Managing Director Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 focus-within:border-scholar-500 focus-within:ring-2 focus-within:ring-scholar-100">
                <User size={16} className="text-scholar-400 shrink-0" />
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full bg-transparent text-xs text-ink outline-none"
                />
              </div>
            </div>

            {/* Email & Mobile */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 focus-within:border-scholar-500 focus-within:ring-2 focus-within:ring-scholar-100">
                  <Mail size={16} className="text-scholar-400 shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@apexcoaching.com"
                    className="w-full bg-transparent text-xs text-ink outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink">
                  Mobile / WhatsApp (10 digits) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 focus-within:border-scholar-500 focus-within:ring-2 focus-within:ring-scholar-100">
                  <Phone size={16} className="text-scholar-400 shrink-0" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full bg-transparent text-xs text-ink outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 focus-within:border-scholar-500 focus-within:ring-2 focus-within:ring-scholar-100">
                  <Lock size={16} className="text-scholar-400 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-transparent text-xs text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-scholar-400 hover:text-scholar-700 transition shrink-0 p-0.5 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 focus-within:border-scholar-500 focus-within:ring-2 focus-within:ring-scholar-100">
                  <Lock size={16} className="text-scholar-400 shrink-0" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-transparent text-xs text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-scholar-400 hover:text-scholar-700 transition shrink-0 p-0.5 focus:outline-none"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-scholar-600 py-3 text-xs font-semibold text-white shadow-xs transition hover:bg-scholar-700 disabled:opacity-50"
            >
              {loading ? (
                <span>Submitting Request...</span>
              ) : (
                <>
                  <span>Submit Registration Request</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-scholar-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-scholar-700 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}