import { DateTime, IANAZone } from 'luxon';

export const BIRTHDAY_SEND_HOUR = 9 as const;
export const BIRTHDAY_SEND_MINUTE = 0 as const;

export type IsoBirthdayDate =
  `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

export type BirthdayScheduleErrorCode = 'INVALID_BIRTHDAY' | 'INVALID_TIMEZONE';

export class BirthdayScheduleError extends Error {
  constructor(
    public readonly code: BirthdayScheduleErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface BirthdayParts {
  readonly month: number;
  readonly day: number;
}

export interface NextBirthdayInput {
  readonly birthday: string;
  readonly timezone: string;
  readonly nowUtc?: Date;
}

const BIRTHDAY_DATE_FORMAT = 'yyyy-MM-dd';
const SEARCH_WINDOW_YEARS = 200;

export function isValidIanaTimezone(timezone: string): boolean {
  return IANAZone.isValidZone(timezone);
}

export function parseBirthdayParts(birthday: string): BirthdayParts | null {
  const parsed = DateTime.fromFormat(birthday, BIRTHDAY_DATE_FORMAT, {
    zone: 'utc',
  });

  if (!parsed.isValid || parsed.toFormat(BIRTHDAY_DATE_FORMAT) !== birthday) {
    return null;
  }

  return {
    month: parsed.month,
    day: parsed.day,
  };
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function calculateNextBirthdayAtUtc(input: NextBirthdayInput): Date {
  const { birthday, timezone } = input;
  const nowUtc = input.nowUtc ?? new Date();

  const birthdayParts = parseBirthdayParts(birthday);
  if (!birthdayParts) {
    throw new BirthdayScheduleError(
      'INVALID_BIRTHDAY',
      `Invalid birthday date: ${birthday}`,
    );
  }

  if (!isValidIanaTimezone(timezone)) {
    throw new BirthdayScheduleError(
      'INVALID_TIMEZONE',
      `Invalid timezone: ${timezone}`,
    );
  }

  const nowLocal = DateTime.fromJSDate(nowUtc, { zone: 'utc' }).setZone(
    timezone,
  );

  let candidateYear = nowLocal.year;

  for (let i = 0; i < SEARCH_WINDOW_YEARS; i += 1) {
    if (birthdayParts.month === 2 && birthdayParts.day === 29) {
      while (!isLeapYear(candidateYear)) {
        candidateYear += 1;
      }
    }

    const candidateLocal = DateTime.fromObject(
      {
        year: candidateYear,
        month: birthdayParts.month,
        day: birthdayParts.day,
        hour: BIRTHDAY_SEND_HOUR,
        minute: BIRTHDAY_SEND_MINUTE,
        second: 0,
        millisecond: 0,
      },
      { zone: timezone },
    );

    if (!candidateLocal.isValid) {
      candidateYear += 1;
      continue;
    }

    if (candidateLocal < nowLocal) {
      candidateYear += 1;
      continue;
    }

    return candidateLocal.toUTC().toJSDate();
  }

  throw new BirthdayScheduleError(
    'INVALID_BIRTHDAY',
    `Unable to compute next birthday for ${birthday}`,
  );
}

export function getSendYearForSchedule(
  timezone: string,
  scheduledAtUtc: Date,
): number {
  if (!isValidIanaTimezone(timezone)) {
    throw new BirthdayScheduleError(
      'INVALID_TIMEZONE',
      `Invalid timezone: ${timezone}`,
    );
  }

  return DateTime.fromJSDate(scheduledAtUtc, { zone: 'utc' }).setZone(timezone)
    .year;
}
