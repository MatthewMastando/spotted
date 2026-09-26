export const DEMO_ANCHOR_DATE = "2026-09-24";
export const MIN_HISTORY_DAY = -365;
export const MAX_DEMO_DAY = 120;

const DAY_MS = 24 * 60 * 60 * 1000;
const anchorMs = Date.parse(`${DEMO_ANCHOR_DATE}T00:00:00.000Z`);

export function dateForDay(day: number): string {
  return new Date(anchorMs + day * DAY_MS).toISOString().slice(0, 10);
}

export function dayForDate(date: string): number {
  const ms = Date.parse(`${date.slice(0, 10)}T00:00:00.000Z`);
  return Math.round((ms - anchorMs) / DAY_MS);
}

export function valuationInstant(day: number): string {
  return new Date(anchorMs + day * DAY_MS + 20 * 60 * 60 * 1000).toISOString();
}

export function dayForInstant(instant: string): number {
  return dayForDate(instant.slice(0, 10));
}

export function isTradingDay(
  day: number,
  holidays: ReadonlySet<string>,
): boolean {
  const date = dateForDay(day);
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(date);
}

export function mostRecentSessionDay(
  day: number,
  holidays: ReadonlySet<string>,
  includeToday = true,
): number | null {
  for (
    let candidate = includeToday ? day : day - 1;
    candidate >= MIN_HISTORY_DAY;
    candidate -= 1
  ) {
    if (isTradingDay(candidate, holidays)) return candidate;
  }
  return null;
}

export function clampDay(day: number): number {
  return Math.min(MAX_DEMO_DAY, Math.max(0, Math.trunc(day)));
}
