import { BirthdayCalculatorService } from '@/birthday-worker/birthday-calculator.service';

describe('BirthdayCalculatorService', () => {
  const service = new BirthdayCalculatorService();

  it('computes next birthday in current year when birthday is upcoming', () => {
    const result = service.getNextBirthdayAtUtc({
      birthday: '1990-01-11',
      timezone: 'Asia/Tokyo',
      nowUtc: new Date('2026-01-10T00:00:00.000Z'),
    });

    expect(result.toISOString()).toBe('2026-01-11T00:00:00.000Z');
  });

  it('computes next year when birthday time is already passed', () => {
    const result = service.getNextBirthdayAtUtc({
      birthday: '1990-01-11',
      timezone: 'Asia/Tokyo',
      nowUtc: new Date('2026-01-11T01:00:00.000Z'),
    });

    expect(result.toISOString()).toBe('2027-01-11T00:00:00.000Z');
  });

  it('schedules leap-day birthday on next leap year only', () => {
    const result = service.getNextBirthdayAtUtc({
      birthday: '2000-02-29',
      timezone: 'UTC',
      nowUtc: new Date('2025-03-01T00:00:00.000Z'),
    });

    expect(result.toISOString()).toBe('2028-02-29T09:00:00.000Z');
  });

  it('resolves send year from scheduled UTC instant in user timezone', () => {
    const sendYear = service.getSendYear(
      'America/New_York',
      new Date('2028-02-29T14:00:00.000Z'),
    );

    expect(sendYear).toBe(2028);
  });
});
