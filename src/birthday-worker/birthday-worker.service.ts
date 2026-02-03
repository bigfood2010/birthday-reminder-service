import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserDocument } from '@/users/schemas/user.schema';
import { UsersRepository } from '@/users/users.repository';
import { BirthdayCalculatorService } from '@/birthday-worker/birthday-calculator.service';
import { BirthdayMessageService } from '@/birthday-worker/birthday-message.service';

@Injectable()
export class BirthdayWorkerService {
  private readonly logger = new Logger(BirthdayWorkerService.name);
  private readonly batchSize: number;
  private readonly maxBatchesPerRun: number;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly birthdayCalculator: BirthdayCalculatorService,
    private readonly birthdayMessageService: BirthdayMessageService,
    configService: ConfigService,
  ) {
    this.batchSize = this.readPositiveInt(
      configService.get<string>('WORKER_BATCH_SIZE'),
      200,
    );
    this.maxBatchesPerRun = this.readPositiveInt(
      configService.get<string>('WORKER_MAX_BATCHES'),
      10,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'birthday-reminder-worker',
    waitForCompletion: true,
  })
  async processDueBirthdays(): Promise<void> {
    const nowUtc = new Date();
    let sentCount = 0;

    for (let i = 0; i < this.maxBatchesPerRun; i += 1) {
      const dueUsers = await this.usersRepository.findDueUsers(
        nowUtc,
        this.batchSize,
      );

      if (dueUsers.length === 0) {
        break;
      }

      for (const user of dueUsers) {
        const isSent = await this.processSingleUser(user, nowUtc);
        if (isSent) {
          sentCount += 1;
        }
      }
    }

    if (sentCount > 0) {
      this.logger.log(`Birthday worker sent ${sentCount} message(s)`);
    }
  }

  private async processSingleUser(
    user: UserDocument,
    sentAtUtc: Date,
  ): Promise<boolean> {
    try {
      const sendYear = this.birthdayCalculator.getSendYear(
        user.timezone,
        user.nextBirthdayAtUtc,
      );
      const nextBirthdayAtUtc = this.birthdayCalculator.getNextBirthdayAtUtc({
        birthday: user.birthday,
        timezone: user.timezone,
        nowUtc: new Date(user.nextBirthdayAtUtc.getTime() + 1),
      });

      const updatedUser = await this.usersRepository.markBirthdayProcessed({
        id: user._id.toString(),
        sendYear,
        sentAtUtc,
        nextBirthdayAtUtc,
      });

      if (!updatedUser) {
        return false;
      }

      this.birthdayMessageService.send({
        userId: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        timezone: updatedUser.timezone,
        birthday: updatedUser.birthday,
        sentAtUtc,
      });

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process user ${user._id.toString()}: ${message}`,
      );
      return false;
    }
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }
}
