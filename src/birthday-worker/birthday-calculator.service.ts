import { Injectable } from '@nestjs/common';
import {
  calculateNextBirthdayAtUtc,
  getSendYearForSchedule,
  NextBirthdayInput,
} from '@/common/utils/birthday-schedule';

@Injectable()
export class BirthdayCalculatorService {
  getNextBirthdayAtUtc(input: NextBirthdayInput): Date {
    return calculateNextBirthdayAtUtc(input);
  }

  getSendYear(timezone: string, scheduledAtUtc: Date): number {
    return getSendYearForSchedule(timezone, scheduledAtUtc);
  }
}
