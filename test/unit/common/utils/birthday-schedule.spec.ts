import { DateTime } from 'luxon';
import {
  BirthdayScheduleError,
  calculateNextBirthdayAtUtc,
  getSendYearForSchedule,
  isLeapYear,
  isValidIanaTimezone,
  parseBirthdayParts,
} from '@/common/utils/birthday-schedule';

type FromObjectValues = Parameters<typeof DateTime.fromObject>[0];
type FromObjectOptions = Parameters<typeof DateTime.fromObject>[1];
type BoundFromObject = (
  values: FromObjectValues,
  options?: FromObjectOptions,
) => DateTime<true> | DateTime<false>;

describe('birthday-schedule utilities', () => {
  it('validates IANA timezone', () => {
    expect(isValidIanaTimezone('UTC')).toBe(true);
    expect(isValidIanaTimezone('Not/AZone')).toBe(false);
  });

  it('parses valid birthday and rejects invalid date', () => {
    expect(parseBirthdayParts('1990-12-01')).toEqual({ month: 12, day: 1 });
    expect(parseBirthdayParts('1990-02-30')).toBeNull();
    expect(parseBirthdayParts('1990/12/01')).toBeNull();
  });

  it('evaluates leap-year rules', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it('throws INVALID_BIRTHDAY for malformed birthday input', () => {
    expect(() =>
      calculateNextBirthdayAtUtc({
        birthday: '1990-02-30',
        timezone: 'UTC',
        nowUtc: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toThrow(BirthdayScheduleError);
  });

  it('throws INVALID_TIMEZONE for invalid timezone input', () => {
    expect(() =>
      calculateNextBirthdayAtUtc({
        birthday: '1990-01-01',
        timezone: 'Invalid/Zone',
        nowUtc: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toThrow(BirthdayScheduleError);
  });

  it('moves to next year when local 9 AM has already passed', () => {
    const next = calculateNextBirthdayAtUtc({
      birthday: '1990-01-11',
      timezone: 'Asia/Tokyo',
      nowUtc: new Date('2026-01-11T01:00:00.000Z'),
    });

    expect(next.toISOString()).toBe('2027-01-11T00:00:00.000Z');
  });

  it('schedules leap-day birthday on the next leap year', () => {
    const next = calculateNextBirthdayAtUtc({
      birthday: '2000-02-29',
      timezone: 'UTC',
      nowUtc: new Date('2025-03-01T00:00:00.000Z'),
    });

    expect(next.toISOString()).toBe('2028-02-29T09:00:00.000Z');
  });

  it('handles invalid candidate year and continues to next year', () => {
    const originalFromObject: BoundFromObject = DateTime.fromObject.bind(
      DateTime,
    ) as BoundFromObject;
    let injected = false;
    const fromObjectSpy = jest
      .spyOn(DateTime, 'fromObject')
      .mockImplementation(
        (values: FromObjectValues, opts?: FromObjectOptions) => {
          const candidate = values as {
            hour?: number;
            minute?: number;
            second?: number;
            millisecond?: number;
          };
          if (
            !injected &&
            candidate.hour === 9 &&
            candidate.minute === 0 &&
            candidate.second === 0 &&
            candidate.millisecond === 0
          ) {
            injected = true;
            return DateTime.fromMillis(Number.NaN);
          }
          return originalFromObject(values, opts);
        },
      );

    const next = calculateNextBirthdayAtUtc({
      birthday: '1990-10-05',
      timezone: 'UTC',
      nowUtc: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(next.toISOString()).toBe('2027-10-05T09:00:00.000Z');
    fromObjectSpy.mockRestore();
  });

  it('throws when no valid candidate can be produced in search window', () => {
    const originalFromObject: BoundFromObject = DateTime.fromObject.bind(
      DateTime,
    ) as BoundFromObject;
    const fromObjectSpy = jest
      .spyOn(DateTime, 'fromObject')
      .mockImplementation(
        (values: FromObjectValues, opts?: FromObjectOptions) => {
          const candidate = values as {
            hour?: number;
            minute?: number;
            second?: number;
            millisecond?: number;
          };
          if (
            candidate.hour === 9 &&
            candidate.minute === 0 &&
            candidate.second === 0 &&
            candidate.millisecond === 0
          ) {
            return DateTime.fromMillis(Number.NaN);
          }
          return originalFromObject(values, opts);
        },
      );

    expect(() =>
      calculateNextBirthdayAtUtc({
        birthday: '1990-10-05',
        timezone: 'UTC',
        nowUtc: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toThrow('Unable to compute next birthday');

    fromObjectSpy.mockRestore();
  });

  it('gets send year from scheduled utc value and validates timezone', () => {
    expect(
      getSendYearForSchedule(
        'America/New_York',
        new Date('2028-02-29T14:00:00.000Z'),
      ),
    ).toBe(2028);

    expect(() =>
      getSendYearForSchedule('Invalid/Zone', new Date('2028-02-29T14:00:00Z')),
    ).toThrow(BirthdayScheduleError);
  });
});
