import { describe, expect, it } from 'vitest';
import { CareTaskType } from './care-task';
import {
  addLocalDays,
  dayOfWeekFor,
  localDateInTimezone,
  localDateRange,
  planOccurrences,
} from './care-schedule';

describe('localDateInTimezone', () => {
  it('returns the PATIENT’s calendar day, not the server’s', () => {
    // 03:30 UTC on the 4th is still the 3rd in Toronto. A patient's evening
    // dose must not jump to tomorrow's list because the server is in UTC.
    const instant = new Date('2026-03-04T03:30:00Z');
    expect(localDateInTimezone(instant, 'America/Toronto')).toBe('2026-03-03');
    expect(localDateInTimezone(instant, 'UTC')).toBe('2026-03-04');
  });

  it('formats as YYYY-MM-DD for a day where D/M transposition would show', () => {
    expect(localDateInTimezone(new Date('2026-07-08T15:00:00Z'), 'America/Toronto')).toBe('2026-07-08');
  });
});

describe('addLocalDays (DST-safe)', () => {
  it('crosses the Canadian spring-forward day without skipping a date', () => {
    // 2026-03-08 is DST start in Canada (02:00 → 03:00). Naive ms arithmetic
    // over a 23-hour day is how a dose silently disappears.
    expect(addLocalDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addLocalDays('2026-03-08', 1)).toBe('2026-03-09');
  });

  it('crosses the fall-back day without repeating a date', () => {
    // 2026-11-01 is DST end (25-hour day).
    expect(addLocalDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addLocalDays('2026-11-01', 1)).toBe('2026-11-02');
  });

  it('handles month, year and leap-day boundaries', () => {
    expect(addLocalDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addLocalDays('2028-02-28', 1)).toBe('2028-02-29'); // 2028 is a leap year
    expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('dayOfWeekFor', () => {
  it('maps a known week Monday-first', () => {
    expect(dayOfWeekFor('2026-07-20')).toBe('MON');
    expect(dayOfWeekFor('2026-07-25')).toBe('SAT');
    expect(dayOfWeekFor('2026-07-26')).toBe('SUN');
  });

  it('is still correct on a DST transition day', () => {
    expect(dayOfWeekFor('2026-03-08')).toBe('SUN');
    expect(dayOfWeekFor('2026-11-01')).toBe('SUN');
  });
});

describe('localDateRange', () => {
  it('is inclusive at both ends', () => {
    expect(localDateRange('2026-07-20', '2026-07-22')).toEqual(['2026-07-20', '2026-07-21', '2026-07-22']);
  });

  it('returns a single day for from === to, and nothing for an inverted range', () => {
    expect(localDateRange('2026-07-20', '2026-07-20')).toEqual(['2026-07-20']);
    expect(localDateRange('2026-07-22', '2026-07-20')).toEqual([]);
  });

  it('spans a DST week with exactly 7 days', () => {
    expect(localDateRange('2026-03-05', '2026-03-11')).toHaveLength(7);
    expect(localDateRange('2026-10-29', '2026-11-04')).toHaveLength(7);
  });
});

describe('planOccurrences — one_time', () => {
  const schedule = { due_date_local: '2026-07-22', due_time_local: '09:00' };

  it('emits exactly one occurrence when the due date is in range', () => {
    expect(planOccurrences(CareTaskType.ONE_TIME, schedule, '2026-07-20', '2026-07-27')).toEqual([
      { date_local: '2026-07-22', time_local: '09:00' },
    ]);
  });

  it('emits nothing when the due date is outside the window (either side)', () => {
    expect(planOccurrences(CareTaskType.ONE_TIME, schedule, '2026-07-23', '2026-07-30')).toEqual([]);
    expect(planOccurrences(CareTaskType.ONE_TIME, schedule, '2026-07-10', '2026-07-21')).toEqual([]);
  });

  it('carries a null time when none was set', () => {
    const r = planOccurrences(CareTaskType.ONE_TIME, { due_date_local: '2026-07-22' }, '2026-07-22', '2026-07-22');
    expect(r).toEqual([{ date_local: '2026-07-22', time_local: null }]);
  });
});

describe('planOccurrences — recurring', () => {
  it('daily fills every day of the window', () => {
    const r = planOccurrences(
      CareTaskType.RECURRING,
      { frequency: 'daily', time_of_day_local: '08:00' },
      '2026-07-20',
      '2026-07-26',
    );
    expect(r).toHaveLength(7);
    expect(r.every((o) => o.time_local === '08:00')).toBe(true);
  });

  it('weekly emits only the named days', () => {
    const r = planOccurrences(
      CareTaskType.RECURRING,
      { frequency: 'weekly', days_of_week: ['MON', 'WED', 'FRI'] },
      '2026-07-20',
      '2026-07-26',
    );
    expect(r.map((o) => o.date_local)).toEqual(['2026-07-20', '2026-07-22', '2026-07-24']);
  });

  it('weekly with a malformed (empty) stored day list emits NOTHING, not every day', () => {
    // The contract rejects this at 422, so reaching here means bad stored
    // data. Generating a daily task the patient never asked for would be a
    // worse failure than generating none.
    const r = planOccurrences(CareTaskType.RECURRING, { frequency: 'weekly', days_of_week: [] }, '2026-07-20', '2026-07-26');
    expect(r).toEqual([]);
  });

  it('daily generation across the spring-forward day loses no day', () => {
    const r = planOccurrences(CareTaskType.RECURRING, { frequency: 'daily' }, '2026-03-05', '2026-03-11');
    expect(r.map((o) => o.date_local)).toEqual([
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
    ]);
  });

  it('weekly generation across the fall-back day hits the right weekday once', () => {
    const r = planOccurrences(
      CareTaskType.RECURRING,
      { frequency: 'weekly', days_of_week: ['SUN'] },
      '2026-10-29',
      '2026-11-04',
    );
    expect(r.map((o) => o.date_local)).toEqual(['2026-11-01']);
  });
});

describe('planOccurrences — counter', () => {
  it('emits one occurrence per day (reset_rule: daily)', () => {
    const r = planOccurrences(
      CareTaskType.COUNTER,
      { target_per_day: 8, reset_rule: 'daily' },
      '2026-07-20',
      '2026-07-22',
    );
    expect(r.map((o) => o.date_local)).toEqual(['2026-07-20', '2026-07-21', '2026-07-22']);
  });
});

describe('planOccurrences — window guards', () => {
  it('returns nothing for an inverted window regardless of type', () => {
    for (const [type, schedule] of [
      [CareTaskType.RECURRING, { frequency: 'daily' }],
      [CareTaskType.COUNTER, { target_per_day: 3, reset_rule: 'daily' }],
      [CareTaskType.ONE_TIME, { due_date_local: '2026-07-21' }],
    ] as const) {
      expect(planOccurrences(type, schedule, '2026-07-22', '2026-07-20')).toEqual([]);
    }
  });
});
