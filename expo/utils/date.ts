/**
 * Timezone-safe date utilities. All date keys are YYYY-MM-DD strings
 * computed in the user's local timezone, not UTC.
 *
 * The previous implementation used `new Date().toISOString().slice(0, 10)`
 * which returns a UTC date — off by a day for users behind/ahead of UTC.
 * These helpers use local getters (getFullYear, getMonth, getDate, getDay)
 * so the calendar always matches what the user sees on their device.
 */

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function getTodayKey(): string {
  return toDateKey(new Date());
}

/** Formats a Date as YYYY-MM-DD using local timezone methods. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date at midnight.
 * Avoids the UTC offset issues of `new Date("YYYY-MM-DD")` which
 * parses as UTC midnight and can shift to the previous day in
 * negative-offset timezones.
 */
export function parseKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Adds (or subtracts) days from a date key, returning a new YYYY-MM-DD. */
export function addDays(dateKey: string, days: number): string {
  const d = parseKey(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Returns the day-of-week index (0=Sun..6=Sat) for a date key, in local time. */
export function weekdayOf(dateKey: string): number {
  return parseKey(dateKey).getDay();
}

/** Formats a date key for display using toLocaleDateString in local time. */
export function formatKey(
  dateKey: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return parseKey(dateKey).toLocaleDateString("en-US", options);
}

/** Number of milliseconds between two date keys (a - b), rounded to whole days. */
export function dayDiff(a: string, b: string): number {
  const ms = parseKey(a).getTime() - parseKey(b).getTime();
  return Math.round(ms / 86_400_000);
}
