import { addDays, addMonths, addYears, differenceInDays } from "date-fns";

export interface CourseDurationParts {
  years: number;
  months: number;
  days: number;
}

export interface CourseDurationSummary {
  formatted: string;
  totalEstimatedDays: number;
  totalDays: number;
  startDate: Date;
  endDate: Date;
  daysElapsed: number;
  elapsedDays: number;
  daysRemaining: number;
  isExpired: boolean;
  progressPercentage: number;
  progressPercent: number;
}

export const COMMON_DURATION_PRESETS: Array<{
  label: string;
  value: string;
  parts: CourseDurationParts;
  description: string;
}> = [
  {
    label: "15 Days (Crash / Workshop)",
    value: "15 Days",
    parts: { years: 0, months: 0, days: 15 },
    description: "Short sprint, bootcamp, or test revision series",
  },
  {
    label: "30 Days (1 Month)",
    value: "30 Days",
    parts: { years: 0, months: 0, days: 30 },
    description: "1-month intensive module or quick booster",
  },
  {
    label: "45 Days (Crash Course)",
    value: "45 Days",
    parts: { years: 0, months: 0, days: 45 },
    description: "Standard pre-exam crash program",
  },
  {
    label: "3 Months (Quarter)",
    value: "3 Months",
    parts: { years: 0, months: 3, days: 0 },
    description: "Single term / quarterly skill track",
  },
  {
    label: "6 Months (Semester / Fast-Track)",
    value: "6 Months",
    parts: { years: 0, months: 6, days: 0 },
    description: "Half-year comprehensive semester",
  },
  {
    label: "1 Year (Target / Academic Year)",
    value: "1 Year",
    parts: { years: 1, months: 0, days: 0 },
    description: "Full academic session / 12-month program",
  },
  {
    label: "1 Year 6 Months (1.5 Years Pinnacle)",
    value: "1 Year 6 Months",
    parts: { years: 1, months: 6, days: 0 },
    description: "Extended target or Class 11-12 bridge foundation",
  },
  {
    label: "2 Years (Long Term Foundation)",
    value: "2 Years",
    parts: { years: 2, months: 0, days: 0 },
    description: "2-year complete competitive JEE/NEET journey",
  },
  {
    label: "3 Years (Integrated Secondary)",
    value: "3 Years",
    parts: { years: 3, months: 0, days: 0 },
    description: "Class 9-10-11 integrated school tie-up",
  },
];

/**
 * Parses any course duration string into years, months, and days.
 * Examples handled:
 * - "15 Days" -> { years: 0, months: 0, days: 15 }
 * - "1 Year 6 Months" -> { years: 1, months: 6, days: 0 }
 * - "1.5 Years" -> { years: 1, months: 6, days: 0 }
 * - "6 Months 15 Days" -> { years: 0, months: 6, days: 15 }
 * - "2 Years (Long Term)" -> { years: 2, months: 0, days: 0 }
 * - "45 Days (Crash Course)" -> { years: 0, months: 0, days: 45 }
 */
export function parseCourseDuration(durationStr: string | null | undefined): CourseDurationParts {
  if (!durationStr || !durationStr.trim()) {
    return { years: 0, months: 0, days: 0 };
  }

  const str = durationStr.toLowerCase().trim();

  let years = 0;
  let months = 0;
  let days = 0;

  // Check for decimal years, e.g. "1.5 years"
  const decimalYearMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:year|yr)s?/);
  if (decimalYearMatch) {
    const val = parseFloat(decimalYearMatch[1]);
    if (!isNaN(val)) {
      years = Math.floor(val);
      const remainderMonths = Math.round((val - years) * 12);
      months += remainderMonths;
    }
  }

  // Check for explicit months if not already captured from decimal
  const monthMatch = str.match(/(\d+)\s*(?:month|mo)s?/);
  if (monthMatch) {
    // If we didn't get months from decimal years, add them
    if (decimalYearMatch && decimalYearMatch[1].includes(".")) {
      // Decimal year was present, don't double count if same
    } else {
      months += parseInt(monthMatch[1], 10);
    }
  }

  // Check for explicit days
  const dayMatch = str.match(/(\d+)\s*(?:day|d)s?/);
  if (dayMatch) {
    days += parseInt(dayMatch[1], 10);
  }

  // Normalize: if months >= 12, roll into years
  if (months >= 12 && years === 0) {
    years += Math.floor(months / 12);
    months = months % 12;
  }

  return { years, months, days };
}

/**
 * Calculates total duration converted into number of whole months (minimum 1).
 * Examples:
 * - "6 Months" -> 6
 * - "1 Year" -> 12
 * - "1 Year 6 Months" -> 18
 * - "2 Years" -> 24
 * - "3 Months" -> 3
 * - "45 Days" -> 2
 * - "15 Days" -> 1
 */
export function getDurationInMonths(durationStr: string | null | undefined): number {
  if (!durationStr || !durationStr.trim()) return 12;
  const parts = parseCourseDuration(durationStr);
  let totalMonths = parts.years * 12 + parts.months;
  if (parts.days > 0) {
    totalMonths += Math.max(0, Math.round(parts.days / 30));
  }
  return Math.max(1, totalMonths);
}

/**
 * Formats years, months, days into a clean canonical duration string.
 * e.g.:
 * - { years: 1, months: 6, days: 0 } -> "1 Year 6 Months"
 * - { years: 0, months: 0, days: 15 } -> "15 Days"
 * - { years: 2, months: 0, days: 0 } -> "2 Years"
 * - { years: 0, months: 3, days: 10 } -> "3 Months 10 Days"
 */
export function formatCourseDuration(parts: CourseDurationParts): string {
  const { years, months, days } = parts;
  const segments: string[] = [];

  if (years > 0) {
    segments.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  }
  if (months > 0) {
    segments.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  }
  if (days > 0) {
    segments.push(`${days} ${days === 1 ? "Day" : "Days"}`);
  }

  return segments.length > 0 ? segments.join(" ") : "Custom Duration";
}

/**
 * Computes estimated course end date based on start date and duration string.
 * Example:
 * - startDate: 2026-09-01, duration: "15 Days" -> 2026-09-16
 * - startDate: 2026-09-01, duration: "1 Year 6 Months" -> 2028-03-01
 */
export function calculateCourseEndDate(startDate: Date | string, durationStr: string | null | undefined): Date {
  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate.getTime());
  const parts = parseCourseDuration(durationStr);

  let end = start;
  if (parts.years > 0) {
    end = addYears(end, parts.years);
  }
  if (parts.months > 0) {
    end = addMonths(end, parts.months);
  }
  if (parts.days > 0) {
    end = addDays(end, parts.days);
  }

  // Fallback if no parts detected (e.g. 1 year default)
  if (parts.years === 0 && parts.months === 0 && parts.days === 0) {
    end = addYears(end, 1);
  }

  return end;
}

/**
 * Generates an active progress summary for a student enrolled in a course.
 */
export function getCourseDurationSummary(
  startDate: Date | string,
  durationStr: string | null | undefined,
  currentDate: Date = new Date()
): CourseDurationSummary {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = calculateCourseEndDate(start, durationStr);
  const formatted = durationStr ? formatCourseDuration(parseCourseDuration(durationStr)) : "1 Year";

  const totalEstimatedDays = Math.max(1, differenceInDays(end, start));
  const daysElapsed = Math.max(0, differenceInDays(currentDate, start));
  const rawDaysRemaining = differenceInDays(end, currentDate);
  const daysRemaining = Math.max(0, rawDaysRemaining);
  const isExpired = rawDaysRemaining < 0;

  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((daysElapsed / totalEstimatedDays) * 100))
  );

  return {
    formatted,
    totalEstimatedDays,
    totalDays: totalEstimatedDays,
    startDate: start,
    endDate: end,
    daysElapsed,
    elapsedDays: daysElapsed,
    daysRemaining,
    isExpired,
    progressPercentage,
    progressPercent: progressPercentage,
  };
}

/**
 * Returns a category badge classification for filtering and UI grouping.
 */
export function getCourseDurationCategory(durationStr: string | null | undefined): "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM" {
  const parts = parseCourseDuration(durationStr);
  const totalMonths = parts.years * 12 + parts.months + parts.days / 30;

  if (totalMonths < 3) return "SHORT_TERM"; // e.g. 15 days, 45 days, 1-2 months
  if (totalMonths <= 12) return "MEDIUM_TERM"; // 3 months to 1 year
  return "LONG_TERM"; // > 1 year (e.g. 1 year 6 months, 2 years)
}
