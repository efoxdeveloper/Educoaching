// In-memory rate limiting map: key -> array of submission timestamps
// Key format: `${clientIp}:${mobile}`
const submissionsMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SUBMISSIONS_PER_WINDOW = 3;

/**
 * Checks if client has exceeded the daily submission rate limit.
 */
export function checkEnquiryRateLimit(ip: string, mobile: string): { allowed: boolean; count: number } {
  const now = Date.now();
  const key = `${ip.trim()}:${mobile.trim()}`;
  const timestamps = submissionsMap.get(key) || [];

  // Filter timestamps within window
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    submissionsMap.set(key, validTimestamps);
    return { allowed: false, count: validTimestamps.length };
  }

  validTimestamps.push(now);
  submissionsMap.set(key, validTimestamps);
  return { allowed: true, count: validTimestamps.length };
}

export function resetEnquiryRateLimitStore() {
  submissionsMap.clear();
}
