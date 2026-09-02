/**
 * Checks whether two time ranges [aStart, aEnd) and [bStart, bEnd) overlap.
 * Format is HH:MM in 24-hour time.
 */
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}
