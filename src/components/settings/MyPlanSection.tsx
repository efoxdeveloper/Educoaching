"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, AlertCircle, ArrowUpRight, Sparkles, Clock, MessageSquare, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PLATFORM_PLANS, SMS_PLANS, formatINR } from "@/lib/pricing";
import { usePlatformSubscription } from "@/lib/usePlatformSubscription";
import { daysLeft } from "@/lib/subscription";

type MyPlanSectionProps = {
  profile: {
    name: string;
    ownerName: string;
    billingCycle?: "TRIAL" | "MONTHLY" | "QUARTERLY" | "YEARLY";
    platformSubscriptionStatus?: "TRIAL" | "ACTIVE" | "EXPIRED";
    currentPeriodAmount?: number | null;
    trialStartedAt?: string | null;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
  };
  onPlanUpdated: () => void;
};

export function MyPlanSection({ profile, onPlanUpdated }: MyPlanSectionProps) {
  const { subscribe, processing, payError } = usePlatformSubscription();
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLATFORM_PLANS>("YEARLY");

  const billingCycle = profile.billingCycle || "TRIAL";
  const subStatus = profile.platformSubscriptionStatus || "TRIAL";
  const isTrial = billingCycle === "TRIAL";
  const isActivePaid = subStatus === "ACTIVE" && !isTrial;
  const isExpired = subStatus === "EXPIRED";

  const targetDate = (isTrial ? profile.trialEndsAt : profile.currentPeriodEnd) ?? null;
  const remainingDays = daysLeft(targetDate);

  const handleUpgrade = async (planKey: keyof typeof PLATFORM_PLANS) => {
    setSelectedPlan(planKey);
    await subscribe({
      plan: planKey,
      instituteName: profile.name,
      ownerName: profile.ownerName,
      onSuccess: () => {
        onPlanUpdated();
      },
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-scholar-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scholar-50 text-scholar-700">
            <CreditCard size={19} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-ink">My Plan & Subscription</h2>
            <p className="text-xs text-scholar-500">
              Manage your Vidyalaya platform membership, billing cycle, and upgrades.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isTrial && (
            <Badge tone={remainingDays !== null && remainingDays <= 0 ? "danger" : "warn"} dot>
              {remainingDays !== null && remainingDays <= 0 ? "Trial Expired" : `Free Trial (${remainingDays ?? 0} days left)`}
            </Badge>
          )}
          {isActivePaid && (
            <Badge tone="success" dot>
              {billingCycle} &middot; Active
            </Badge>
          )}
          {isExpired && (
            <Badge tone="danger" dot>
              Subscription Expired
            </Badge>
          )}
        </div>
      </div>

      {payError && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle size={15} className="shrink-0" />
          <span>{payError}</span>
        </div>
      )}

      {/* Current Overview Banner */}
      <div className="mb-6 rounded-2xl border border-scholar-100 bg-scholar-50/50 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-scholar-400">Current Plan</span>
            <p className="font-display text-lg font-bold text-ink">
              {isTrial ? "Trial Account" : `${billingCycle} Plan`}
            </p>
            <p className="text-xs text-scholar-500">
              {isTrial ? "Full features during evaluation" : "Unlimited students, courses & tests"}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-scholar-400">
              {isTrial ? "Trial Valid Until" : "Renewal Date"}
            </span>
            <p className="text-sm font-semibold text-ink">
              {targetDate ? new Date(targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
            </p>
            <p className="text-xs text-scholar-500">
              {remainingDays !== null && remainingDays > 0 ? (
                <span className="text-emerald-700 font-medium">{remainingDays} days remaining</span>
              ) : remainingDays !== null && remainingDays <= 0 ? (
                <span className="text-rose-600 font-medium">Expired</span>
              ) : (
                "Continuous access"
              )}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-scholar-400">Amount Billed</span>
            <p className="text-sm font-semibold text-ink">
              {profile.currentPeriodAmount ? formatINR(Number(profile.currentPeriodAmount)) : isTrial ? "₹0 (Free Trial)" : "Included"}
            </p>
            <p className="text-xs text-scholar-500">All features & Razorpay payments included</p>
          </div>
        </div>
      </div>

      {/* Available Plans Selection */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-scholar-500 mb-3">
          Available Subscription Plans
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(Object.entries(PLATFORM_PLANS) as [keyof typeof PLATFORM_PLANS, (typeof PLATFORM_PLANS)[keyof typeof PLATFORM_PLANS]][]).map(([key, plan]) => {
            const isCurrent = billingCycle === key && isActivePaid;
            const isBestValue = key === "YEARLY";

            return (
              <div
                key={key}
                className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                  isCurrent
                    ? "border-emerald-500 bg-emerald-50/20"
                    : isBestValue
                    ? "border-scholar-300 bg-scholar-50/30 ring-1 ring-scholar-300"
                    : "border-scholar-100 bg-white hover:border-scholar-300"
                }`}
              >
                {isBestValue && (
                  <div className="absolute -top-2.5 right-4 rounded-full bg-scholar-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                    Best Value &middot; Save 20%
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-sm font-bold text-ink">{plan.label}</h4>
                    {isCurrent && (
                      <span className="text-[11px] font-semibold text-emerald-600">Current</span>
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold text-ink">
                      {formatINR(plan.amount)}
                    </span>
                    <span className="text-xs text-scholar-400">/{plan.billedEvery}</span>
                  </div>

                  <p className="mt-1 text-xs text-scholar-500">
                    Effective {formatINR(plan.effectiveMonthly)}/month
                  </p>

                  <ul className="mt-4 space-y-2 text-xs text-scholar-600">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      Unlimited batches & students
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      Multi-branch & staff access
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      Exam tests, LMS & timetables
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      WhatsApp & Email alerts
                    </li>
                  </ul>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    disabled={processing || isCurrent}
                    onClick={() => handleUpgrade(key)}
                    className={`w-full rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
                      isCurrent
                        ? "bg-emerald-100 text-emerald-800 cursor-default"
                        : isBestValue
                        ? "bg-scholar-700 text-white hover:bg-scholar-800 shadow-xs"
                        : "border border-scholar-200 bg-white text-ink hover:bg-scholar-50"
                    } disabled:opacity-50`}
                  >
                    {processing && selectedPlan === key
                      ? "Processing…"
                      : isCurrent
                      ? "Active Plan"
                      : isTrial
                      ? `Activate ${plan.label}`
                      : `Upgrade / Renew (${plan.label})`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SMS Plans Section for Vidyalaya Institute */}
      <div className="mt-8 border-t border-scholar-100 pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-marigold-50 text-marigold-700">
              <MessageSquare size={17} />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-ink">SMS Plans & Credits</h3>
              <p className="text-xs text-scholar-500">
                Purchase high-deliverability DLT-approved SMS packs for Vidyalaya Institute with 5-year validity.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck size={13} /> 5 Years Validity
          </span>
        </div>

        {/* SMS Plan Comparison Table */}
        <div className="overflow-x-auto rounded-2xl border border-scholar-100 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-scholar-100 bg-scholar-50/60 text-[11px] font-bold uppercase tracking-wider text-scholar-600">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">SMS Credits</th>
                <th className="px-4 py-3">Rate / SMS</th>
                <th className="px-4 py-3">Total Price</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Savings</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scholar-100">
              {SMS_PLANS.map((sms) => (
                <tr
                  key={sms.plan}
                  className={`hover:bg-scholar-50/40 transition-colors ${
                    sms.popular ? "bg-marigold-50/30" : ""
                  }`}
                >
                  <td className="px-4 py-3.5 font-bold text-ink">
                    <div className="flex items-center gap-1.5">
                      <span>{sms.plan}</span>
                      {sms.popular && (
                        <span className="rounded bg-marigold-100 px-1.5 py-0.5 text-[9px] font-bold text-marigold-800 uppercase tracking-wide">
                          Popular
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-scholar-800">
                    {sms.smsCredits} SMS
                  </td>
                  <td className="px-4 py-3.5 font-mono text-scholar-700">
                    {sms.ratePerSms}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-display font-bold text-ink">
                      {formatINR(sms.totalPrice)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-scholar-600">
                    {sms.validity}
                  </td>
                  <td className="px-4 py-3.5">
                    {sms.savings === "—" ? (
                      <span className="text-scholar-400">—</span>
                    ) : (
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                        {sms.savings}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <a
                      href={`mailto:yadavsarthak2409@gmail.com?subject=Purchase ${sms.plan} SMS Plan (${sms.smsCredits} credits)&body=Hi Vidyalaya Support,%0D%0A%0D%0AWe would like to recharge our SMS pack with the ${sms.plan} plan (${sms.smsCredits} SMS credits for ${formatINR(sms.totalPrice)}).%0D%0A%0D%0AInstitute: ${encodeURIComponent(profile.name)}%0D%0AOwner: ${encodeURIComponent(profile.ownerName)}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-scholar-600 hover:bg-scholar-700 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors shadow-2xs"
                    >
                      Buy Pack
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Benefits footer banner */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-scholar-50/70 p-3 text-[11px] text-scholar-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-600" /> Instant activation
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-600" /> DLT entity registration assistance
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-600" /> Priority transactional route
            </span>
          </div>
          <span className="text-scholar-400">
            For custom volume packs &gt; 50,000 SMS, contact support.
          </span>
        </div>
      </div>
    </Card>
  );
}
