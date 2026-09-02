"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Zap,
  Calculator,
  Phone,
  Mail,
  HelpCircle,
  Clock,
  Loader2,
  Check,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PLATFORM_PLANS, SMS_PLANS, SUPPORT_CONTACT, formatINR } from "@/lib/pricing";
import { usePlatformSubscription } from "@/lib/usePlatformSubscription";
import { daysLeft } from "@/lib/subscription";

type InstituteProfile = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  mobile: string;
  billingCycle?: "TRIAL" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  platformSubscriptionStatus?: "TRIAL" | "ACTIVE" | "EXPIRED";
  currentPeriodAmount?: number | null;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
};

export function PlansView({ canManage }: { canManage: boolean }) {
  const [profile, setProfile] = useState<InstituteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "platform" | "sms" | "calculator">("all");
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLATFORM_PLANS>("YEARLY");

  // Calculator State
  const [studentCount, setStudentCount] = useState<number>(150);
  const [attendanceSmsPerMonth, setAttendanceSmsPerMonth] = useState<number>(20);
  const [feeReminderSmsPerMonth, setFeeReminderSmsPerMonth] = useState<number>(2);
  const [testMarksSmsPerMonth, setTestMarksSmsPerMonth] = useState<number>(2);
  const [generalNoticesSmsPerMonth, setGeneralNoticesSmsPerMonth] = useState<number>(2);

  const { subscribe, processing, payError } = usePlatformSubscription();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/institutes/me");
      if (!res.ok) throw new Error("Failed to load institute profile");
      const data: InstituteProfile = await res.json();
      setProfile(data);
    } catch {
      setError("Couldn't load subscription details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const billingCycle = profile?.billingCycle || "TRIAL";
  const subStatus = profile?.platformSubscriptionStatus || "TRIAL";
  const isTrial = billingCycle === "TRIAL";
  const isActivePaid = subStatus === "ACTIVE" && !isTrial;
  const isExpired = subStatus === "EXPIRED";

  const targetDate = (isTrial ? profile?.trialEndsAt : profile?.currentPeriodEnd) ?? null;
  const remainingDays = daysLeft(targetDate);

  const handleUpgrade = async (planKey: keyof typeof PLATFORM_PLANS) => {
    if (!profile) return;
    setSelectedPlan(planKey);
    await subscribe({
      plan: planKey,
      instituteName: profile.name,
      ownerName: profile.ownerName,
      onSuccess: () => {
        load();
      },
    });
  };

  // Calculator estimates
  const totalSmsPerStudentMonthly =
    attendanceSmsPerMonth + feeReminderSmsPerMonth + testMarksSmsPerMonth + generalNoticesSmsPerMonth;
  const estimatedMonthlySms = studentCount * totalSmsPerStudentMonthly;
  const estimatedAnnualSms = estimatedMonthlySms * 12;

  const recommendedSmsPlan = useMemo(() => {
    if (estimatedAnnualSms <= 3000) return SMS_PLANS[0];
    if (estimatedAnnualSms <= 5000) return SMS_PLANS[1];
    if (estimatedAnnualSms <= 10000) return SMS_PLANS[2];
    return SMS_PLANS[3];
  }, [estimatedAnnualSms]);

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 p-12 text-sm text-scholar-500">
        <Loader2 size={20} className="animate-spin text-scholar-700" />
        <span>Loading your plans & subscription...</span>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="p-6 text-sm text-danger-600">
        {error || "Could not load subscription details."}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Status Overview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-scholar-800 via-scholar-900 to-scholar-950 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-scholar-200">
                {profile.name}
              </span>
              {isTrial && (
                <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                  remainingDays !== null && remainingDays <= 0 ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  <Zap size={13} /> {remainingDays !== null && remainingDays <= 0 ? "Free Trial Expired" : `Free Trial (${remainingDays ?? 0} days remaining)`}
                </span>
              )}
              {isActivePaid && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 size={13} /> {billingCycle} Plan &middot; Active
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/30">
                  <AlertCircle size={13} /> Subscription Expired
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Plans & Subscriptions
            </h1>
            <p className="max-w-2xl text-xs text-scholar-200 sm:text-sm">
              Manage your Vidyalaya software membership, upgrade your subscription cycle, and recharge DLT-approved transactional SMS credit packs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://wa.me/91${SUPPORT_CONTACT.phone}?text=${encodeURIComponent(`Hi Vidyalaya Team, I need assistance with our subscription / SMS recharge for ${profile.name}.`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-xs border border-white/10"
            >
              <Phone size={14} /> Helpdesk WhatsApp
            </a>
            <button
              onClick={() => {
                setActiveTab("platform");
                const el = document.getElementById("platform-plans-grid");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-marigold-400 px-4 py-2.5 text-xs font-bold text-scholar-950 hover:bg-marigold-300 transition-colors shadow-sm cursor-pointer"
            >
              <Sparkles size={14} /> Upgrade Platform Plan
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex flex-col justify-between border-scholar-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">Current Plan</span>
            <div className="rounded-lg bg-scholar-50 p-2 text-scholar-700">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl font-bold text-ink">
              {isTrial ? "Trial Version" : `${billingCycle} Plan`}
            </p>
            <p className="text-xs text-scholar-500 mt-0.5">
              {isTrial ? "7 Days Full Access" : `Billed ${billingCycle.toLowerCase()}`}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-scholar-100 flex items-center justify-between text-xs">
            <span className="text-scholar-500">Status</span>
            <span className={`font-semibold ${isActivePaid ? "text-emerald-700" : isTrial ? "text-amber-700" : "text-rose-600"}`}>
              {isActivePaid ? "Active" : isTrial ? "Trial" : "Expired"}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-scholar-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">Renewal / Validity</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl font-bold text-ink">
              {targetDate ? new Date(targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Active"}
            </p>
            <p className="text-xs text-scholar-500 mt-0.5">
              {remainingDays !== null && remainingDays > 0 ? (
                <span className="text-emerald-700 font-semibold">{remainingDays} days remaining</span>
              ) : remainingDays !== null && remainingDays <= 0 ? (
                <span className="text-rose-600 font-semibold">Expired</span>
              ) : (
                "Ongoing access"
              )}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-scholar-100 flex items-center justify-between text-xs">
            <span className="text-scholar-500">Amount Billed</span>
            <span className="font-bold text-ink">
              {profile.currentPeriodAmount ? formatINR(Number(profile.currentPeriodAmount)) : isTrial ? "₹0 (Trial)" : "Included"}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-scholar-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">SMS Credits Gateway</span>
            <div className="rounded-lg bg-marigold-50 p-2 text-marigold-700">
              <MessageSquare size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl font-bold text-ink">DLT Approved</p>
            <p className="text-xs text-emerald-700 font-semibold mt-0.5">5-Year Validity Packs</p>
          </div>
          <div className="mt-3 pt-2 border-t border-scholar-100 flex items-center justify-between text-xs">
            <span className="text-scholar-500">Route Type</span>
            <span className="font-semibold text-scholar-800">Priority Transactional</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-scholar-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-scholar-500">Platform Access</span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-700">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2">
            <p className="font-display text-xl font-bold text-ink">All Features</p>
            <p className="text-xs text-scholar-500 mt-0.5">Multi-Branch & Unlimited Batches</p>
          </div>
          <div className="mt-3 pt-2 border-t border-scholar-100 flex items-center justify-between text-xs">
            <span className="text-scholar-500">Online Fees</span>
            <span className="font-semibold text-emerald-700">0% Platform Fee</span>
          </div>
        </Card>
      </div>

      {/* Payment Error Alert */}
      {payError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 shadow-xs">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span>{payError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-scholar-100/70 p-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-white text-scholar-900 shadow-2xs font-bold"
              : "text-scholar-600 hover:text-scholar-900"
          }`}
        >
          <Layers size={15} /> All Plans Overview
        </button>
        <button
          onClick={() => setActiveTab("platform")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all cursor-pointer ${
            activeTab === "platform"
              ? "bg-white text-scholar-900 shadow-2xs font-bold"
              : "text-scholar-600 hover:text-scholar-900"
          }`}
        >
          <Sparkles size={15} className="text-scholar-700" /> Platform Subscriptions
        </button>
        <button
          onClick={() => setActiveTab("sms")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all cursor-pointer ${
            activeTab === "sms"
              ? "bg-white text-scholar-900 shadow-2xs font-bold"
              : "text-scholar-600 hover:text-scholar-900"
          }`}
        >
          <MessageSquare size={15} className="text-marigold-600" /> SMS Plans & Credits
        </button>
        <button
          onClick={() => setActiveTab("calculator")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all cursor-pointer ${
            activeTab === "calculator"
              ? "bg-white text-scholar-900 shadow-2xs font-bold"
              : "text-scholar-600 hover:text-scholar-900"
          }`}
        >
          <Calculator size={15} className="text-emerald-600" /> SMS Credits Calculator
        </button>
      </div>

      {/* SECTION 1: PLATFORM SUBSCRIPTION PLANS */}
      {(activeTab === "all" || activeTab === "platform") && (
        <div id="platform-plans-grid">
          <Card className="p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-scholar-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-scholar-50 text-scholar-800 border border-scholar-200">
                  <CreditCard size={18} />
                </div>
                <h2 className="font-display text-base font-bold text-ink">
                  Vidyalaya Platform Membership Plans
                </h2>
              </div>
              <p className="text-xs text-scholar-500 mt-1">
                Choose the billing cycle that works best for your institute. All features and multi-campus branches are included.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              ✓ 100% Feature-Unlocked on All Tiers
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {(Object.entries(PLATFORM_PLANS) as [keyof typeof PLATFORM_PLANS, (typeof PLATFORM_PLANS)[keyof typeof PLATFORM_PLANS]][]).map(([key, plan]) => {
              const isCurrent = billingCycle === key && isActivePaid;
              const isBestValue = key === "YEARLY";
              const isQuarterly = key === "QUARTERLY";

              return (
                <div
                  key={key}
                  className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-2xs ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20"
                      : isBestValue
                      ? "border-scholar-300 bg-scholar-50/40 ring-2 ring-scholar-400"
                      : "border-scholar-200 bg-white hover:border-scholar-300"
                  }`}
                >
                  {isBestValue && (
                    <div className="absolute -top-3 right-4 rounded-full bg-scholar-800 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-marigold-300 shadow-sm border border-scholar-700">
                      ⭐ Best Value &middot; Save 20%
                    </div>
                  )}
                  {isQuarterly && (
                    <div className="absolute -top-3 right-4 rounded-full bg-scholar-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-scholar-800 border border-scholar-200">
                      Save 10%
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-ink">{plan.label}</h3>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          Current Plan
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="font-display text-3xl font-extrabold text-ink">
                        {formatINR(plan.amount)}
                      </span>
                      <span className="text-xs text-scholar-500">/{plan.billedEvery}</span>
                    </div>

                    <p className="mt-1 text-xs font-semibold text-scholar-600">
                      Effective {formatINR(plan.effectiveMonthly)} / month
                    </p>

                    <div className="my-4 border-t border-scholar-100" />

                    <div className="space-y-2.5 text-xs text-scholar-700">
                      <div className="flex items-center gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 font-bold" />
                        <span><strong>Unlimited</strong> Students & Batches</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 font-bold" />
                        <span><strong>Multi-Campus</strong> Branch Management</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 font-bold" />
                        <span><strong>Faculty</strong> & Staff Action Rights Control</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 font-bold" />
                        <span><strong>CBT Exam Engine</strong> & Question Bank</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 font-bold" />
                        <span><strong>Fee Receipts</strong> & Online Razorpay Gateway</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 font-bold" />
                        <span><strong>Lead CRM</strong> & Admission Inquiry Pipeline</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 font-bold" />
                        <span><strong>Automated</strong> Daily Cloud Backups & SSL</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-scholar-100">
                    <button
                      type="button"
                      disabled={processing || isCurrent || !canManage}
                      onClick={() => handleUpgrade(key)}
                      className={`w-full rounded-xl py-2.5 px-4 text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-100 text-emerald-800 cursor-default"
                          : isBestValue
                          ? "bg-scholar-800 text-white hover:bg-scholar-900 shadow-sm"
                          : "bg-scholar-50 text-scholar-800 hover:bg-scholar-100 border border-scholar-200"
                      } disabled:opacity-50`}
                    >
                      {processing && selectedPlan === key ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 size={13} className="animate-spin" /> Processing Payment…
                        </span>
                      ) : isCurrent ? (
                        "✓ Active Membership"
                      ) : isTrial ? (
                        `Activate ${plan.label} (${formatINR(plan.amount)})`
                      ) : (
                        `Switch to ${plan.label} (${formatINR(plan.amount)})`
                      )}
                    </button>
                    {!canManage && (
                      <p className="mt-1.5 text-center text-[10px] text-scholar-400">
                        Only Institute Owners can modify billing.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      )}

      {/* SECTION 2: SMS PLANS AS CREDITS */}
      {(activeTab === "all" || activeTab === "sms") && (
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-scholar-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-marigold-50 text-marigold-800 border border-marigold-200">
                  <MessageSquare size={18} />
                </div>
                <h2 className="font-display text-base font-bold text-ink">
                  SMS Plans & Communication Credits
                </h2>
              </div>
              <p className="text-xs text-scholar-500 mt-1">
                Purchase DLT-approved transactional SMS credit packs for attendance notifications, fee receipts, exam marks, and admission alerts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <ShieldCheck size={14} /> 5 Years Validity on All Packs
              </span>
            </div>
          </div>

          {/* SMS Credit Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {SMS_PLANS.map((sms) => (
              <div
                key={sms.plan}
                className={`relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all ${
                  sms.popular
                    ? "border-marigold-300 bg-marigold-50/30 ring-2 ring-marigold-400/40 shadow-xs"
                    : "border-scholar-200 bg-white hover:border-scholar-300"
                }`}
              >
                {sms.popular && (
                  <div className="absolute -top-2.5 right-3 rounded-full bg-marigold-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-scholar-950 shadow-xs">
                    ⭐ Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-ink">{sms.plan} Pack</span>
                    {sms.savings !== "—" && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        {sms.savings}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="font-display text-2xl font-black text-ink">{sms.smsCredits}</p>
                    <p className="text-[11px] font-semibold text-scholar-500">Transactional SMS Credits</p>
                  </div>

                  <div className="mt-3 rounded-xl bg-scholar-50 p-2.5 text-xs text-scholar-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-scholar-500">Rate / SMS:</span>
                      <span className="font-bold text-scholar-900">{sms.ratePerSms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-scholar-500">Validity:</span>
                      <span className="font-semibold text-emerald-700">{sms.validity}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-scholar-200/60">
                      <span className="font-bold text-ink">Total Price:</span>
                      <span className="font-bold text-ink font-display">{formatINR(sms.totalPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-scholar-100">
                  <a
                    href={`https://wa.me/91${SUPPORT_CONTACT.phone}?text=${encodeURIComponent(`Hi Vidyalaya Support, we would like to recharge our institute with the ${sms.plan} SMS Pack (${sms.smsCredits} SMS credits for ${formatINR(sms.totalPrice)}). Institute: ${profile.name}, Owner: ${profile.ownerName}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-scholar-800 hover:bg-scholar-900 py-2 px-3 text-xs font-bold text-white transition-colors shadow-2xs cursor-pointer"
                  >
                    <MessageSquare size={13} /> Buy {sms.smsCredits} Credits
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* SMS Plan Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-scholar-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-scholar-100 bg-scholar-50/70 text-[11px] font-bold uppercase tracking-wider text-scholar-600">
                  <th className="px-4 py-3">Credit Pack</th>
                  <th className="px-4 py-3">SMS Volume</th>
                  <th className="px-4 py-3">Rate / SMS</th>
                  <th className="px-4 py-3">Total Investment</th>
                  <th className="px-4 py-3">Validity</th>
                  <th className="px-4 py-3">Savings</th>
                  <th className="px-4 py-3 text-right">Instant Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-scholar-100">
                {SMS_PLANS.map((sms) => (
                  <tr
                    key={sms.plan}
                    className={`hover:bg-scholar-50/50 transition-colors ${
                      sms.popular ? "bg-marigold-50/20 font-medium" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 font-bold text-ink">
                      <div className="flex items-center gap-2">
                        <span>{sms.plan}</span>
                        {sms.popular && (
                          <span className="rounded bg-marigold-200 px-1.5 py-0.5 text-[9px] font-bold text-marigold-900 uppercase">
                            Popular
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-scholar-900">
                      {sms.smsCredits} Credits
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-scholar-700">
                      {sms.ratePerSms}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-display font-bold text-ink text-sm">
                        {formatINR(sms.totalPrice)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-scholar-600 font-medium">
                      {sms.validity}
                    </td>
                    <td className="px-4 py-3.5">
                      {sms.savings === "—" ? (
                        <span className="text-scholar-400">—</span>
                      ) : (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                          {sms.savings}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <a
                        href={`mailto:${SUPPORT_CONTACT.email}?subject=Purchase ${sms.plan} SMS Pack (${sms.smsCredits} credits)&body=Hi Vidyalaya Support,%0D%0A%0D%0AWe would like to recharge our SMS pack with the ${sms.plan} plan (${sms.smsCredits} SMS credits for ${formatINR(sms.totalPrice)}).%0D%0A%0D%0AInstitute: ${encodeURIComponent(profile.name)}%0D%0AOwner: ${encodeURIComponent(profile.ownerName)}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-scholar-700 hover:bg-scholar-800 px-3 py-1.5 text-[11px] font-bold text-white transition-colors"
                      >
                        <Mail size={12} /> Email Order
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DLT Information & Support Callout */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3.5 text-xs text-scholar-700 space-y-1">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Free DLT Entity Setup
              </span>
              <p className="text-[11px] text-scholar-500">
                Our support team helps you get your Principal Entity ID and custom 6-character Sender ID approved on Airtel/Jio DLT.
              </p>
            </div>
            <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3.5 text-xs text-scholar-700 space-y-1">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> 100% Delivery SLA
              </span>
              <p className="text-[11px] text-scholar-500">
                Priority transactional telecom routes deliver fee receipts and absent notices within 3-5 seconds to parents.
              </p>
            </div>
            <div className="rounded-xl border border-scholar-100 bg-scholar-50/50 p-3.5 text-xs text-scholar-700 space-y-1">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Custom Bulk Packs (&gt;50k)
              </span>
              <p className="text-[11px] text-scholar-500">
                Need high-volume credits for large multi-city coaching chains? Contact our enterprise desk for customized rates.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 3: INTERACTIVE SMS CALCULATOR */}
      {(activeTab === "all" || activeTab === "calculator") && (
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-scholar-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Calculator size={18} />
                </div>
                <h2 className="font-display text-base font-bold text-ink">
                  Interactive SMS Credits Estimator
                </h2>
              </div>
              <p className="text-xs text-scholar-500 mt-1">
                Estimate how many SMS credits your institute needs each month and discover your ideal credit pack.
              </p>
            </div>
            <span className="rounded-full bg-scholar-100 px-3 py-1 text-xs font-semibold text-scholar-700">
              Smart Estimation Tool
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Input Controls */}
            <div className="space-y-4 rounded-2xl border border-scholar-100 bg-scholar-50/40 p-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-ink">Active Student Strength</label>
                  <span className="rounded-lg bg-scholar-700 px-2.5 py-0.5 text-xs font-extrabold text-white">
                    {studentCount} Students
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                  className="w-full h-2 bg-scholar-200 rounded-lg appearance-none cursor-pointer accent-scholar-700"
                />
                <div className="flex justify-between text-[10px] text-scholar-400 mt-1">
                  <span>20 students</span>
                  <span>500 students</span>
                  <span>1,000 students</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-scholar-200 bg-white p-3 space-y-1">
                  <label className="text-[11px] font-bold text-scholar-800">Daily Attendance Alerts</label>
                  <p className="text-[10px] text-scholar-400">SMS / student / month</p>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={attendanceSmsPerMonth}
                    onChange={(e) => setAttendanceSmsPerMonth(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-scholar-200 px-2 py-1 text-xs font-bold text-ink outline-none"
                  />
                </div>

                <div className="rounded-xl border border-scholar-200 bg-white p-3 space-y-1">
                  <label className="text-[11px] font-bold text-scholar-800">Fee Reminder Alerts</label>
                  <p className="text-[10px] text-scholar-400">SMS / student / month</p>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={feeReminderSmsPerMonth}
                    onChange={(e) => setFeeReminderSmsPerMonth(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-scholar-200 px-2 py-1 text-xs font-bold text-ink outline-none"
                  />
                </div>

                <div className="rounded-xl border border-scholar-200 bg-white p-3 space-y-1">
                  <label className="text-[11px] font-bold text-scholar-800">Exam & Test Marks</label>
                  <p className="text-[10px] text-scholar-400">SMS / student / month</p>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={testMarksSmsPerMonth}
                    onChange={(e) => setTestMarksSmsPerMonth(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-scholar-200 px-2 py-1 text-xs font-bold text-ink outline-none"
                  />
                </div>

                <div className="rounded-xl border border-scholar-200 bg-white p-3 space-y-1">
                  <label className="text-[11px] font-bold text-scholar-800">General Notices & OTPs</label>
                  <p className="text-[10px] text-scholar-400">SMS / student / month</p>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={generalNoticesSmsPerMonth}
                    onChange={(e) => setGeneralNoticesSmsPerMonth(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-lg border border-scholar-200 px-2 py-1 text-xs font-bold text-ink outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Recommendation Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Estimated Requirement
                </span>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-medium text-scholar-500 uppercase">Monthly SMS</span>
                    <p className="font-display text-xl font-bold text-ink">
                      {estimatedMonthlySms.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-scholar-400">{totalSmsPerStudentMonthly} SMS / student</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-medium text-scholar-500 uppercase">Annual Requirement</span>
                    <p className="font-display text-xl font-bold text-ink">
                      {estimatedAnnualSms.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-scholar-400">Over 12 months</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border border-emerald-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">Recommended Credit Pack:</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    {recommendedSmsPlan.plan} ({recommendedSmsPlan.smsCredits} Credits)
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-scholar-500">Package Cost:</span>
                  <span className="font-display text-lg font-bold text-ink">
                    {formatINR(recommendedSmsPlan.totalPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-700">
                  <span>Effective rate:</span>
                  <span className="font-semibold">{recommendedSmsPlan.ratePerSms} / SMS &middot; 5-Year Validity</span>
                </div>
              </div>

              <a
                href={`https://wa.me/91${SUPPORT_CONTACT.phone}?text=${encodeURIComponent(`Hi Vidyalaya Support, based on the calculator for ${studentCount} students (${estimatedAnnualSms} annual SMS), we want to recharge the ${recommendedSmsPlan.plan} pack (${recommendedSmsPlan.smsCredits} SMS for ${formatINR(recommendedSmsPlan.totalPrice)}). Institute: ${profile.name}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-2.5 px-4 text-xs font-bold text-white transition-all shadow-xs"
              >
                <MessageSquare size={14} /> Buy Recommended {recommendedSmsPlan.plan} Pack
              </a>
            </div>
          </div>
        </Card>
      )}

      {/* Support & Assistance Footer Card */}
      <Card className="p-6 bg-gradient-to-r from-scholar-50 to-scholar-100/50 border-scholar-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <HelpCircle size={16} className="text-scholar-700" /> Need Help Choosing or Upgrading?
            </h3>
            <p className="text-xs text-scholar-500">
              Our billing and DLT compliance team is available Mon–Sat (9 AM – 8 PM) to assist you with GST invoices, custom volume recharge, and payment queries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${SUPPORT_CONTACT.phone}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-scholar-50 transition-colors shadow-2xs"
            >
              <Phone size={13} className="text-scholar-600" /> {SUPPORT_CONTACT.phoneDisplay}
            </a>
            <a
              href={`mailto:${SUPPORT_CONTACT.email}?subject=Billing Query for ${encodeURIComponent(profile.name)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-scholar-800 transition-colors shadow-2xs"
            >
              <Mail size={13} /> {SUPPORT_CONTACT.email}
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
