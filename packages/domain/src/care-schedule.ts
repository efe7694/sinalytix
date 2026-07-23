/**
 * Schedule → occurrence dates (K7). Pure functions, no DB, no clock of their
 * own — the caller passes `now`.
 *
 * Lives in `@sinalytix/domain` rather than inside core-api because the
 * nightly generator (worker/job-runner, Faz 2 Slice 4) and the lazy backfill
 * (API read path, Modül 3 §5) must expand a schedule *identically*. Two
 * implementations of "which days does this task fall on" is exactly how a
 * patient ends up with a duplicated or a missing dose.
 *
 * ## Everything here is a LOCAL CALENDAR DATE, never an instant
 * "Did you take your morning pill on the 3rd" is a question about the
 * patient's own day. Days are stepped as calendar dates (`YYYY-MM-DD`), never
 * by adding 86 400 000 ms — on a DST boundary that arithmetic silently skips
 * or repeats a day, and Canada has two of those a year (Test Stratejisi §3.7
 * calls out the DST transition day explicitly).
 */

import {
  CareTaskType,
  DayOfWeek,
  type CareTaskSchedule,
  type CounterSchedule,
  type OneTimeSchedule,
  type RecurringSchedule,
} from './care-task';

/** A single occurrence the generator wants to exist. */
export interface PlannedOccurrence {
  date_local: string;
  time_local: string | null;
}

/**
 * Today's calendar date in an IANA timezone, as `YYYY-MM-DD`.
 * `en-CA` because its short date format IS `YYYY-MM-DD` — no manual padding,
 * no month/day transposition risk.
 */
export function localDateInTimezone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Steps a `YYYY-MM-DD` by whole calendar days. Anchored at UTC noon so a
 * ±1h DST shift can never push the result into the neighbouring date. */
export function addLocalDays(dateLocal: string, days: number): string {
  const [y, m, d] = dateLocal.split('-').map(Number) as [number, number, number];
  const anchored = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  anchored.setUTCDate(anchored.getUTCDate() + days);
  return anchored.toISOString().slice(0, 10);
}

/** `MON`..`SUN` for a local date. Same UTC-noon anchoring, same reason. */
export function dayOfWeekFor(dateLocal: string): DayOfWeek {
  const [y, m, d] = dateLocal.split('-').map(Number) as [number, number, number];
  const anchored = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // getUTCDay(): 0 = Sunday. DayOfWeek is Monday-first.
  return DayOfWeek[(anchored.getUTCDay() + 6) % 7] as DayOfWeek;
}

/** Inclusive list of local dates from `from` to `to`. */
export function localDateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addLocalDays(d, 1)) out.push(d);
  return out;
}

/**
 * Which occurrences a task should have in `[fromDate, toDate]` (inclusive,
 * local dates).
 *
 * Deliberately says nothing about what already EXISTS — the caller inserts
 * these with `ON CONFLICT DO NOTHING` against the `(task_id, date_local)`
 * unique index (migration 0020), which is what makes K7's "tekrar koşum
 * zararsız" idempotency true without this function needing to read anything.
 */
export function planOccurrences(
  type: CareTaskType,
  schedule: CareTaskSchedule,
  fromDate: string,
  toDate: string,
): PlannedOccurrence[] {
  if (fromDate > toDate) return [];

  switch (type) {
    case CareTaskType.ONE_TIME: {
      const s = schedule as OneTimeSchedule;
      if (s.due_date_local < fromDate || s.due_date_local > toDate) return [];
      return [{ date_local: s.due_date_local, time_local: s.due_time_local ?? null }];
    }

    case CareTaskType.RECURRING: {
      const s = schedule as RecurringSchedule;
      const time = s.time_of_day_local ?? null;
      if (s.frequency === 'daily') {
        return localDateRange(fromDate, toDate).map((date_local) => ({ date_local, time_local: time }));
      }
      // Weekly. An empty/absent day list yields NOTHING rather than every day
      // — the contract rejects it at 422, so reaching here means stored data
      // is malformed, and generating a daily task the patient never asked for
      // would be a worse failure than generating none.
      const days = new Set(s.days_of_week ?? []);
      return localDateRange(fromDate, toDate)
        .filter((d) => days.has(dayOfWeekFor(d)))
        .map((date_local) => ({ date_local, time_local: time }));
    }

    case CareTaskType.COUNTER: {
      // `reset_rule: daily` — one occurrence per day, holding that day's
      // progress toward `target_per_day`.
      const s = schedule as CounterSchedule;
      const time = s.time_of_day_local ?? null;
      return localDateRange(fromDate, toDate).map((date_local) => ({ date_local, time_local: time }));
    }
  }
}

/**
 * K7's eager window: D+7 from the patient's today. Exported as a named
 * constant because the nightly job and the lazy backfill must agree on it,
 * and because a reader should be able to find "why seven days" in one place.
 * Seven is the spec's number (Modül 3 §5); it is a horizon, not a limit —
 * anything past it is generated on demand.
 */
export const OCCURRENCE_EAGER_WINDOW_DAYS = 7;
