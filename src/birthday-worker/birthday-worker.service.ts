import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserDocument } from '@/users/schemas/user.schema';
import { UsersRepository } from '@/users/users.repository';
import { BirthdayCalculatorService } from '@/birthday-worker/birthday-calculator.service';
import {
  BirthdayMessageSendResult,
  BirthdayMessageService,
} from '@/birthday-worker/birthday-message.service';

@Injectable()
export class BirthdayWorkerService {
  private readonly logger = new Logger(BirthdayWorkerService.name);
  private readonly batchSize: number;
  private readonly maxBatchesPerRun: number;
  private readonly maxDeliveryAttempts: number;
  private readonly retryDelayMinutes: number;

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
    this.maxDeliveryAttempts = this.readPositiveInt(
      configService.get<string>('WORKER_MAX_DELIVERY_ATTEMPTS'),
      3,
    );
    this.retryDelayMinutes = this.readPositiveInt(
      configService.get<string>('WORKER_RETRY_DELAY_MINUTES'),
      15,
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
    const userId = user._id.toString();

    let sendYear: number;
    let nextBirthdayAtUtc: Date;

    try {
      sendYear = this.birthdayCalculator.getSendYear(
        user.timezone,
        user.nextBirthdayAtUtc,
      );
      nextBirthdayAtUtc = this.birthdayCalculator.getNextBirthdayAtUtc({
        birthday: user.birthday,
        timezone: user.timezone,
        nowUtc: new Date(user.nextBirthdayAtUtc.getTime() + 1),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to compute delivery schedule for user ${userId}: ${message}`,
      );
      return false;
    }

    const idempotencyKey = this.buildIdempotencyKey(userId, sendYear);
    let deliveryResult: BirthdayMessageSendResult;

    try {
      deliveryResult = await this.birthdayMessageService.send({
        userId,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        birthday: user.birthday,
        sentAtUtc,
        idempotencyKey,
      });
    } catch (error: unknown) {
      await this.handleDeliveryFailure({
        user,
        userId,
        sendYear,
        nextBirthdayAtUtc,
        sentAtUtc,
        idempotencyKey,
        error,
      });
      return false;
    }

    try {
      const updatedUser = await this.usersRepository.markBirthdayProcessed({
        id: userId,
        sendYear,
        sentAtUtc,
        nextBirthdayAtUtc,
        providerMessageId: deliveryResult.providerMessageId,
      });

      if (!updatedUser) {
        this.logger.warn(
          `Delivery success state was not persisted for user ${userId} (sendYear=${sendYear}, idempotencyKey=${idempotencyKey}, providerMessageId=${deliveryResult.providerMessageId})`,
        );
        return false;
      }

      if (deliveryResult.isIdempotentReplay) {
        this.logger.log(
          `Delivery persisted from idempotent replay for user ${userId} (sendYear=${sendYear}, idempotencyKey=${idempotencyKey}, providerMessageId=${deliveryResult.providerMessageId})`,
        );
      }

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Delivery sent but failed to persist success for user ${userId} (sendYear=${sendYear}, idempotencyKey=${idempotencyKey}, providerMessageId=${deliveryResult.providerMessageId}): ${message}`,
      );
      return false;
    }
  }

  private async handleDeliveryFailure(input: {
    user: UserDocument;
    userId: string;
    sendYear: number;
    nextBirthdayAtUtc: Date;
    sentAtUtc: Date;
    idempotencyKey: string;
    error: unknown;
  }): Promise<void> {
    const message =
      input.error instanceof Error ? input.error.message : String(input.error);
    const currentAttempts = input.user.deliveryAttemptCount ?? 0;
    const nextAttempt = currentAttempts + 1;
    const isExhausted = nextAttempt >= this.maxDeliveryAttempts;
    const nextDeliveryAttemptAtUtc = isExhausted
      ? null
      : new Date(input.sentAtUtc.getTime() + this.retryDelayMinutes * 60_000);
    const nextBirthdayAtUtc = isExhausted
      ? input.nextBirthdayAtUtc
      : input.user.nextBirthdayAtUtc;

    try {
      const updatedUser = await this.usersRepository.markBirthdayDeliveryFailed({
        id: input.userId,
        sendYear: input.sendYear,
        deliveryAttemptCount: isExhausted ? 0 : nextAttempt,
        nextDeliveryAttemptAtUtc,
        nextBirthdayAtUtc,
        lastDeliveryError: message,
        lastDeliveryAttemptAtUtc: input.sentAtUtc,
      });

      if (!updatedUser) {
        this.logger.warn(
          `Delivery failure state was not persisted for user ${input.userId} (sendYear=${input.sendYear}, idempotencyKey=${input.idempotencyKey})`,
        );
        return;
      }
    } catch (persistenceError: unknown) {
      const persistenceMessage =
        persistenceError instanceof Error
          ? persistenceError.message
          : String(persistenceError);
      this.logger.error(
        `Delivery failed and retry state could not be persisted for user ${input.userId} (sendYear=${input.sendYear}, idempotencyKey=${input.idempotencyKey}): ${persistenceMessage}`,
      );
      return;
    }

    if (isExhausted) {
      this.logger.error(
        `Delivery failed for user ${input.userId} and exhausted retries (maxAttempts=${this.maxDeliveryAttempts}, sendYear=${input.sendYear}, idempotencyKey=${input.idempotencyKey}): ${message}`,
      );
      return;
    }

    this.logger.error(
      `Delivery failed for user ${input.userId}; scheduled retry ${nextAttempt}/${this.maxDeliveryAttempts} at ${nextDeliveryAttemptAtUtc?.toISOString()} (sendYear=${input.sendYear}, idempotencyKey=${input.idempotencyKey}): ${message}`,
    );
  }

  private buildIdempotencyKey(userId: string, sendYear: number): string {
    return `birthday:${userId}:${sendYear}`;
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }
}
