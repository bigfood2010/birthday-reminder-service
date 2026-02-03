import { Injectable, Logger } from '@nestjs/common';

export interface BirthdayMessagePayload {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly timezone: string;
  readonly birthday: string;
  readonly sentAtUtc: Date;
}

@Injectable()
export class BirthdayMessageService {
  private readonly logger = new Logger(BirthdayMessageService.name);

  send(payload: BirthdayMessagePayload): void {
    this.logger.log(
      `Happy Birthday sent to ${payload.name} <${payload.email}> ` +
        `(userId=${payload.userId}, timezone=${payload.timezone}, birthday=${payload.birthday}, sentAt=${payload.sentAtUtc.toISOString()})`,
    );
  }
}
