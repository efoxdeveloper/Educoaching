// Single source of truth for platform pricing. Referenced by the landing
// page now, and by the Razorpay Subscription creation logic later - keep
// them in sync by editing only here.

export const TRIAL_DAYS = 7;

export const BRANCH_LIMITS_BY_PLAN: Record<string, number> = {
  TRIAL: 10,
  MONTHLY: 3,
  QUARTERLY: 6,
  YEARLY: 15,
};

export const PLATFORM_PLANS = {
  MONTHLY: {
    label: "Monthly",
    amount: 1999,
    billedEvery: "month",
    months: 1,
    discountPct: 0,
    effectiveMonthly: 1999,
  },
  QUARTERLY: {
    label: "Quarterly",
    amount: 5397,
    billedEvery: "3 months",
    months: 3,
    discountPct: 10,
    effectiveMonthly: 1799,
  },
  YEARLY: {
    label: "Yearly",
    amount: 19190,
    billedEvery: "year",
    months: 12,
    discountPct: 20,
    effectiveMonthly: 1599,
  },
} as const;

export const SMS_PLANS = [
  {
    plan: "Starter",
    smsCredits: "3,000",
    ratePerSms: "₹0.40",
    totalPrice: 1200,
    validity: "5 Years",
    savings: "—",
    popular: false,
  },
  {
    plan: "Growth",
    smsCredits: "5,000",
    ratePerSms: "₹0.35",
    totalPrice: 1750,
    validity: "5 Years",
    savings: "12.5% off Starter rate",
    popular: true,
  },
  {
    plan: "Pro",
    smsCredits: "10,000",
    ratePerSms: "₹0.30",
    totalPrice: 3000,
    validity: "5 Years",
    savings: "25% off Starter rate",
    popular: false,
  },
  {
    plan: "Enterprise",
    smsCredits: "20,000",
    ratePerSms: "₹0.25",
    totalPrice: 5000,
    validity: "5 Years",
    savings: "37.5% off Starter rate",
    popular: false,
  },
] as const;

export const SUPPORT_CONTACT = {
  phone: "9411454931",
  phoneDisplay: "+91 94114 54931",
  email: "yadavsarthak2409@gmail.com",
};

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}