/**
 * Transactional `delivery` options: when an email goes out (`at`) and whether it goes out
 * at all (`throttle`). Shared by the API's request validation and anything that renders
 * the limits back to people (docs examples, error messages).
 */

/** How far ahead `delivery.at` may be. Kept well under the 90-day email body retention. */
export const MAX_SCHEDULE_DAYS = 30;

/** Shortest and longest throttle window, in seconds */
export const MIN_THROTTLE_WINDOW_SECONDS = 60;
export const MAX_THROTTLE_WINDOW_SECONDS = 365 * 24 * 60 * 60;

const DURATION = /^([1-9]\d*)(m|h|d)$/;
const UNIT_SECONDS = {m: 60, h: 60 * 60, d: 24 * 60 * 60} as const;

/**
 * Parse a duration such as "30m", "24h" or "7d" into seconds.
 * Returns null for anything else, including bare numbers and other units.
 */
export function parseDuration(value: string): number | null {
  const match = DURATION.exec(value);
  if (!match) {
    return null;
  }

  return Number(match[1]) * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS];
}

/**
 * Format seconds as the largest whole unit, the inverse of `parseDuration`:
 * 86400 → "1d", 5400 → "90m".
 */
export function formatDuration(seconds: number): string {
  if (seconds % UNIT_SECONDS.d === 0) {
    return `${seconds / UNIT_SECONDS.d}d`;
  }

  if (seconds % UNIT_SECONDS.h === 0) {
    return `${seconds / UNIT_SECONDS.h}h`;
  }

  return `${Math.round(seconds / UNIT_SECONDS.m)}m`;
}
