import Link from "next/link";
import {
  GraduationCap,
  ShieldCheck,
  Phone,
  Mail,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  PLATFORM_PLANS,
  SUPPORT_CONTACT,
  TRIAL_DAYS,
  formatINR,
} from "@/lib/pricing";

const planOrder = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top bar */}
      <header className="border-b border-scholar-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-marigold-400 text-scholar-900">
              <GraduationCap size={20} strokeWidth={2.5} />
            </div>

            <span className="font-display text-lg font-semibold text-ink">
              Vidyalaya
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              href="/login?portal=institute"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-scholar-600 hover:bg-scholar-50"
            >
              Institute
            </Link>

            <Link
              href="/login?portal=admin"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-scholar-600 hover:bg-scholar-50"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-marigold-50 px-3 py-1 text-xs font-semibold text-marigold-600">
          <Sparkles size={13} />
          {TRIAL_DAYS}-day free trial, no card required
        </p>

        <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Run your coaching institute
          <br />
          from one clean dashboard.
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-scholar-500">
          Students, batches, faculty, attendance and fee collection — everything
          an owner checks each morning, built for Indian coaching institutes.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-scholar-600 px-6 py-3 text-sm font-semibold text-white hover:bg-scholar-700"
          >
            Start your {TRIAL_DAYS}-day free trial
          </Link>

          <a
            href="#plans"
            className="rounded-xl border border-scholar-200 px-6 py-3 text-sm font-semibold text-scholar-600 hover:bg-scholar-50"
          >
            See pricing
          </a>
        </div>
      </section>

      {/* Plans */}
      <section
        id="plans"
        className="border-t border-scholar-100 bg-white py-16"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink">
              Simple, transparent pricing
            </h2>

            <p className="mt-2 text-sm text-scholar-500">
              One plan, billed at whatever cadence suits you — longer
              commitments cost less per month.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {planOrder.map((key) => {
              const plan = PLATFORM_PLANS[key];
              const highlighted = key === "YEARLY";

              return (
                <div
                  key={key}
                  className={`rounded-2xl border p-6 shadow-card ${
                    highlighted
                      ? "border-scholar-600 bg-scholar-600 text-white"
                      : "border-scholar-100 bg-paper text-ink"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg font-semibold">
                      {plan.label}
                    </p>

                    {plan.discountPct > 0 && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          highlighted
                            ? "bg-white/15 text-white"
                            : "bg-success-50 text-success-600"
                        }`}
                      >
                        Save {plan.discountPct}%
                      </span>
                    )}
                  </div>

                  <p className="mt-4 font-display text-3xl font-semibold">
                    {formatINR(plan.effectiveMonthly)}

                    <span
                      className={`text-sm font-normal ${
                        highlighted
                          ? "text-scholar-200"
                          : "text-scholar-400"
                      }`}
                    >
                      {" "}
                      / month
                    </span>
                  </p>

                  <p
                    className={`mt-1 text-xs ${
                      highlighted
                        ? "text-scholar-200"
                        : "text-scholar-400"
                    }`}
                  >
                    Billed {formatINR(plan.amount)} every {plan.billedEvery}
                  </p>

                  <ul className="mt-5 space-y-2 text-sm">
                    {[
                      "Unlimited students & batches",
                      "Attendance & fee tracking",
                      "Faculty management",
                      "Email + SMS notifications",
                    ].map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2
                          size={15}
                          className={
                            highlighted
                              ? "text-marigold-300"
                              : "text-scholar-400"
                          }
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs text-scholar-400">
            Every Institute starts with a free {TRIAL_DAYS}-day trial. Choose a
            plan any time before it ends to keep access.
          </p>
        </div>
      </section>

      {/* Support */}
      <section className="border-t border-scholar-100 py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-scholar-50 text-scholar-600">
            <ShieldCheck size={20} />
          </div>

          <h2 className="font-display text-xl font-semibold text-ink">
            Need help?
          </h2>

          <p className="mt-2 text-sm text-scholar-500">
            Our team is here for anything from a billing question to something
            not working right.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-8">
            <a
              href={`tel:+91${SUPPORT_CONTACT.phone}`}
              className="flex items-center gap-2 text-sm font-semibold text-scholar-600 hover:text-scholar-700"
            >
              <Phone size={16} />
              {SUPPORT_CONTACT.phoneDisplay}
            </a>

            <a
              href={`mailto:${SUPPORT_CONTACT.email}`}
              className="flex items-center gap-2 text-sm font-semibold text-scholar-600 hover:text-scholar-700"
            >
              <Mail size={16} />
              {SUPPORT_CONTACT.email}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-scholar-100 py-6 text-center text-xs text-scholar-400">
        © {new Date().getFullYear()} Vidyalaya. All rights reserved.
      </footer>
    </div>
  );
}