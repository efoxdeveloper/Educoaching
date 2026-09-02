// Typed access to the small, evolving Institute.settings JSON blob.
// Keeping this as JSON (rather than dedicated columns) means adding a new
// preference is a change in this one file, not a Prisma migration.

export type FeatureFlags = {
  onlineTests: boolean;
  attendance: boolean;
  admissions: boolean;
  timetable: boolean;
  reports: boolean;
  onlinePayments: boolean;
  multiBranch: boolean;
  expenses: boolean;
  communication: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  onlineTests: true,
  attendance: true,
  admissions: true,
  timetable: true,
  reports: true,
  onlinePayments: true,
  multiBranch: true,
  expenses: true,
  communication: true,
};

export type SmsProviderType = "MSG91" | "TEXTLOCAL" | "FAST2SMS";

export interface InstituteSmsConfig {
  provider: SmsProviderType;
  senderId: string; // DLT-approved sender ID, e.g. "VIDYAL"
  apiKeyEncrypted?: string; // output of encrypt() from crypto.ts — NEVER store plaintext
  dltTemplateIds?: Record<string, string>; // template name -> DLT-approved template ID
  enabled: boolean;
}

export interface PublicSmsConfig {
  provider: SmsProviderType;
  senderId: string;
  dltTemplateIds: Record<string, string>;
  enabled: boolean;
  isConfigured: boolean;
}

export type InstituteSettings = {
  timezone: string;
  currency: string;
  weekStart: "MON" | "SUN";
  taxNumber?: string;
  applyGst?: boolean;
  gstPercent?: number;
  setupCompleted?: boolean;
  setupWizardDismissed?: boolean;
  featureFlags: FeatureFlags;
  smsConfig?: InstituteSmsConfig;
};

export const DEFAULT_INSTITUTE_SETTINGS: InstituteSettings = {
  timezone: "Asia/Kolkata",
  currency: "INR",
  weekStart: "MON",
  taxNumber: undefined,
  applyGst: false,
  gstPercent: 18,
  setupCompleted: false,
  setupWizardDismissed: false,
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  smsConfig: {
    provider: "MSG91",
    senderId: "",
    apiKeyEncrypted: undefined,
    dltTemplateIds: {},
    enabled: false,
  },
};

export const TIMEZONE_OPTIONS = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Colombo",
] as const;

export const CURRENCY_OPTIONS = [
  "INR",
  "USD",
  "AED",
  "NPR",
  "BDT",
] as const;

type Timezone = (typeof TIMEZONE_OPTIONS)[number];
type Currency = (typeof CURRENCY_OPTIONS)[number];

function isTimezone(value: string): value is Timezone {
  return TIMEZONE_OPTIONS.includes(value as Timezone);
}

function isCurrency(value: string): value is Currency {
  return CURRENCY_OPTIONS.includes(value as Currency);
}

export function parseFeatureFlags(rawFlags: unknown): FeatureFlags {
  if (!rawFlags || typeof rawFlags !== "object") {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
  const f = rawFlags as Partial<FeatureFlags>;
  return {
    onlineTests: f.onlineTests !== undefined ? Boolean(f.onlineTests) : DEFAULT_FEATURE_FLAGS.onlineTests,
    attendance: f.attendance !== undefined ? Boolean(f.attendance) : DEFAULT_FEATURE_FLAGS.attendance,
    admissions: f.admissions !== undefined ? Boolean(f.admissions) : DEFAULT_FEATURE_FLAGS.admissions,
    timetable: f.timetable !== undefined ? Boolean(f.timetable) : DEFAULT_FEATURE_FLAGS.timetable,
    reports: f.reports !== undefined ? Boolean(f.reports) : DEFAULT_FEATURE_FLAGS.reports,
    onlinePayments: f.onlinePayments !== undefined ? Boolean(f.onlinePayments) : DEFAULT_FEATURE_FLAGS.onlinePayments,
    multiBranch: f.multiBranch !== undefined ? Boolean(f.multiBranch) : DEFAULT_FEATURE_FLAGS.multiBranch,
    expenses: f.expenses !== undefined ? Boolean(f.expenses) : DEFAULT_FEATURE_FLAGS.expenses,
    communication: f.communication !== undefined ? Boolean(f.communication) : DEFAULT_FEATURE_FLAGS.communication,
  };
}

// Merges whatever is stored (which may be null, partial, or from an older
// shape) with the defaults, so callers never have to null-check individual
// preference keys.
export function parseInstituteSettings(raw: unknown): InstituteSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_INSTITUTE_SETTINGS };
  }

  const value = raw as Partial<InstituteSettings>;

  return {
    timezone:
      typeof value.timezone === "string" && isTimezone(value.timezone)
        ? value.timezone
        : DEFAULT_INSTITUTE_SETTINGS.timezone,

    currency:
      typeof value.currency === "string" && isCurrency(value.currency)
        ? value.currency
        : DEFAULT_INSTITUTE_SETTINGS.currency,

    weekStart: value.weekStart === "SUN" ? "SUN" : "MON",

    taxNumber:
      typeof value.taxNumber === "string" && value.taxNumber.trim()
        ? value.taxNumber.trim()
        : undefined,

    applyGst: Boolean(value.applyGst),

    gstPercent:
      typeof value.gstPercent === "number" && !isNaN(value.gstPercent) && value.gstPercent >= 0
        ? value.gstPercent
        : DEFAULT_INSTITUTE_SETTINGS.gstPercent,

    setupCompleted: Boolean(value.setupCompleted),

    setupWizardDismissed: Boolean(value.setupWizardDismissed),

    featureFlags: parseFeatureFlags(value.featureFlags),

    smsConfig: value.smsConfig
      ? {
          provider: ["MSG91", "TEXTLOCAL", "FAST2SMS"].includes(value.smsConfig.provider)
            ? value.smsConfig.provider
            : "MSG91",
          senderId: typeof value.smsConfig.senderId === "string" ? value.smsConfig.senderId.trim() : "",
          apiKeyEncrypted:
            typeof value.smsConfig.apiKeyEncrypted === "string"
              ? value.smsConfig.apiKeyEncrypted.trim()
              : undefined,
          dltTemplateIds:
            value.smsConfig.dltTemplateIds && typeof value.smsConfig.dltTemplateIds === "object"
              ? value.smsConfig.dltTemplateIds
              : {},
          enabled: Boolean(value.smsConfig.enabled),
        }
      : DEFAULT_INSTITUTE_SETTINGS.smsConfig,
  };
}

/**
 * Strips encrypted API keys before sending SMS configuration to client browsers.
 */
export function toPublicSmsConfig(smsConfig?: InstituteSmsConfig): PublicSmsConfig {
  if (!smsConfig) {
    return {
      provider: "MSG91",
      senderId: "",
      dltTemplateIds: {},
      enabled: false,
      isConfigured: false,
    };
  }

  return {
    provider: smsConfig.provider || "MSG91",
    senderId: smsConfig.senderId || "",
    dltTemplateIds: smsConfig.dltTemplateIds || {},
    enabled: Boolean(smsConfig.enabled),
    isConfigured: Boolean(smsConfig.apiKeyEncrypted && smsConfig.apiKeyEncrypted.trim()),
  };
}