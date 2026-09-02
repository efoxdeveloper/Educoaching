"use client";

import { useState } from "react";
import { GraduationCap, Phone, Mail, MessageSquare, User, Send, CheckCircle2, AlertCircle, Loader2, Sparkles, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type PublicCourse = {
  id: string;
  name: string;
  fee: number;
  duration?: string | null;
  description?: string | null;
};

type PublicInstitute = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  guidePhone?: string | null;
  instituteSlug?: string | null;
  courses: PublicCourse[];
};

export function PublicEnquiryClient({ institute, slug }: { institute: PublicInstitute; slug: string }) {
  const [form, setForm] = useState({
    applicantName: "",
    mobile: "",
    email: "",
    courseId: institute.courses[0]?.id || "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanMobile = form.mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/enquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteSlug: slug,
          applicantName: form.applicantName.trim(),
          mobile: cleanMobile,
          email: form.email.trim() || undefined,
          courseId: form.courseId,
          message: form.message.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit enquiry. Please check the details.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = institute.courses.find((c) => c.id === form.courseId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-scholar-900 via-scholar-950 to-scholar-950 py-8 px-4 flex flex-col items-center justify-center font-sans antialiased text-ink">
      <div className="w-full max-w-lg">
        {/* Institute Header Card */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-marigold-400 shadow-xl mb-1">
            <GraduationCap size={32} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {institute.name}
          </h1>
          {(institute.city || institute.address) && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-scholar-200">
              <MapPin size={13} className="text-marigold-400 shrink-0" />
              <span>{[institute.address, institute.city, institute.state].filter(Boolean).join(", ")}</span>
            </p>
          )}
          {institute.guidePhone && (
            <p className="text-xs text-scholar-300">
              Helpline: <a href={`tel:${institute.guidePhone}`} className="text-marigold-300 hover:underline font-mono font-semibold">{institute.guidePhone}</a>
            </p>
          )}
        </div>

        {/* Form Container Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-scholar-100/20 overflow-hidden">
          {submitted ? (
            <div className="p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold text-ink">Enquiry Submitted!</h3>
                <p className="text-xs text-scholar-600 leading-relaxed max-w-sm mx-auto">
                  Thank you, <strong>{form.applicantName}</strong>. Our counselling team at <strong>{institute.name}</strong> will contact you on <strong>{form.mobile}</strong> shortly with syllabus, schedule, and fee details.
                </p>
              </div>

              {selectedCourse && (
                <div className="rounded-2xl border border-scholar-100 bg-scholar-50/60 p-4 text-xs text-left space-y-1">
                  <span className="text-[11px] font-semibold text-scholar-500 uppercase tracking-wider">Interested In</span>
                  <p className="font-bold text-sm text-ink">{selectedCourse.name}</p>
                  {selectedCourse.fee > 0 && (
                    <p className="text-xs font-semibold text-scholar-700">Course Fee: {formatCurrency(selectedCourse.fee)}</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setForm({
                    applicantName: "",
                    mobile: "",
                    email: "",
                    courseId: institute.courses[0]?.id || "",
                    message: "",
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-paper px-4 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50 transition-colors shadow-2xs"
              >
                Submit another inquiry
              </button>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-marigold-100 text-marigold-800 text-xs font-black">1</span>
                  <h2 className="font-display text-base font-bold text-ink">Admissions & Course Enquiry</h2>
                </div>
                <p className="text-xs text-scholar-500 mt-1">
                  Fill in your basic details below to request a callback or brochure.
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-danger-50 border border-danger-200 p-3.5 text-xs text-danger-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Applicant Name */}
                <div>
                  <label className="block text-xs font-bold text-scholar-800 mb-1.5">
                    Student / Candidate Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-scholar-400">
                      <User size={15} />
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="Enter full name"
                      value={form.applicantName}
                      onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                      className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 pl-10 pr-3.5 py-2.5 text-xs text-ink placeholder:text-scholar-400 focus:border-scholar-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-scholar-500/20 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-scholar-800 mb-1.5">
                    WhatsApp / Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-scholar-400">
                      <Phone size={15} />
                    </div>
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 pl-10 pr-3.5 py-2.5 text-xs text-ink placeholder:text-scholar-400 focus:border-scholar-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-scholar-500/20 transition-all font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-scholar-800 mb-1.5">
                    Email Address <span className="text-scholar-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-scholar-400">
                      <Mail size={15} />
                    </div>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 pl-10 pr-3.5 py-2.5 text-xs text-ink placeholder:text-scholar-400 focus:border-scholar-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-scholar-500/20 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Course Selection */}
                {institute.courses.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-scholar-800 mb-1.5">
                      Course of Interest <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-scholar-400">
                        <Sparkles size={15} />
                      </div>
                      <select
                        required
                        value={form.courseId}
                        onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                        className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 pl-10 pr-3.5 py-2.5 text-xs text-ink focus:border-scholar-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-scholar-500/20 transition-all font-medium"
                      >
                        {institute.courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.duration ? `(${c.duration})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Message / Learning Goals */}
                <div>
                  <label className="block text-xs font-bold text-scholar-800 mb-1.5">
                    Questions / Comments <span className="text-scholar-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-3.5 flex items-center pointer-events-none text-scholar-400">
                      <MessageSquare size={15} />
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Ask about batch timings, demo classes, syllabus, scholarship discounts..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-scholar-200 bg-scholar-50/40 pl-10 pr-3.5 py-2.5 text-xs text-ink placeholder:text-scholar-400 focus:border-scholar-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-scholar-500/20 transition-all font-medium resize-none"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-scholar-600 py-3 text-xs font-bold text-white shadow-md hover:bg-scholar-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending Enquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Request Information & Callback</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-scholar-400 mt-6">
          Powered by Vidyalaya Institute Suite &bull; Secure &amp; Confidential
        </p>
      </div>
    </div>
  );
}
