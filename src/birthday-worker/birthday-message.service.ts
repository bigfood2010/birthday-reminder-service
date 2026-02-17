import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface BirthdayMessagePayload {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly timezone: string;
  readonly birthday: string;
  readonly sentAtUtc: Date;
  readonly idempotencyKey: string;
}

export interface BirthdayMessageSendResult {
  readonly providerMessageId: string;
  readonly isIdempotentReplay: boolean;
}

@Injectable()
export class BirthdayMessageService {
  private readonly logger = new Logger(BirthdayMessageService.name);
  private readonly sendGridApiUrl = 'https://api.sendgrid.com/v3/mail/send';
  private readonly providerMessageByIdempotencyKey = new Map<string, string>();

  async send(payload: BirthdayMessagePayload): Promise<BirthdayMessageSendResult> {
    const provider = (
      process.env.BIRTHDAY_MESSAGE_PROVIDER ?? 'mock'
    ).toLowerCase();

    if (provider === 'sendgrid') {
      return this.sendViaSendGrid(payload);
    }

    return this.sendViaMock(payload);
  }

  private async sendViaMock(
    payload: BirthdayMessagePayload,
  ): Promise<BirthdayMessageSendResult> {
    const existingMessageId = this.providerMessageByIdempotencyKey.get(
      payload.idempotencyKey,
    );
    if (existingMessageId) {
      this.logger.log(
        `Happy Birthday replay accepted for ${payload.name} <${payload.email}> ` +
          `(userId=${payload.userId}, timezone=${payload.timezone}, birthday=${payload.birthday}, ` +
          `sentAt=${payload.sentAtUtc.toISOString()}, idempotencyKey=${payload.idempotencyKey}, providerMessageId=${existingMessageId}, replay=true)`,
      );
      return {
        providerMessageId: existingMessageId,
        isIdempotentReplay: true,
      };
    }

    const providerMessageId = `sim-${randomUUID()}`;
    this.providerMessageByIdempotencyKey.set(
      payload.idempotencyKey,
      providerMessageId,
    );

    this.logger.log(
      `Happy Birthday sent to ${payload.name} <${payload.email}> ` +
        `(userId=${payload.userId}, timezone=${payload.timezone}, birthday=${payload.birthday}, ` +
        `sentAt=${payload.sentAtUtc.toISOString()}, idempotencyKey=${payload.idempotencyKey}, providerMessageId=${providerMessageId}, replay=false)`,
    );

    return {
      providerMessageId,
      isIdempotentReplay: false,
    };
  }

  private async sendViaSendGrid(
    payload: BirthdayMessagePayload,
  ): Promise<BirthdayMessageSendResult> {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is required for sendgrid provider');
    }
    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL is required for sendgrid provider');
    }

    const response = await fetch(this.sendGridApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': payload.idempotencyKey,
      },
      body: JSON.stringify({
        from: { email: fromEmail },
        personalizations: [
          {
            to: [{ email: payload.email, name: payload.name }],
            subject: `Happy Birthday, ${payload.name}!`,
            custom_args: {
              idempotencyKey: payload.idempotencyKey,
              userId: payload.userId,
            },
          },
        ],
        content: [
          {
            type: 'text/plain',
            value: `Happy Birthday ${payload.name}!`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `SendGrid send failed (${response.status}): ${body || response.statusText}`,
      );
    }

    const providerMessageId =
      response.headers.get('x-message-id') ?? `sg-${randomUUID()}`;

    this.logger.log(
      `Happy Birthday sent via SendGrid to ${payload.name} <${payload.email}> ` +
        `(userId=${payload.userId}, timezone=${payload.timezone}, birthday=${payload.birthday}, ` +
        `sentAt=${payload.sentAtUtc.toISOString()}, idempotencyKey=${payload.idempotencyKey}, providerMessageId=${providerMessageId}, replay=false)`,
    );

    return {
      providerMessageId,
      isIdempotentReplay: false,
    };
  }
}
