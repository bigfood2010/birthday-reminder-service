import { Logger } from '@nestjs/common';
import { BirthdayMessageService } from '@/birthday-worker/birthday-message.service';

describe('BirthdayMessageService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('returns provider message id and treats repeated idempotency key as replay in mock mode', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const service = new BirthdayMessageService();

    const firstSend = await service.send({
      userId: 'u1',
      name: 'Jane',
      email: 'jane@example.com',
      timezone: 'UTC',
      birthday: '1990-01-01',
      sentAtUtc: new Date('2026-01-01T09:00:00.000Z'),
      idempotencyKey: 'birthday:u1:2026',
    });
    const secondSend = await service.send({
      userId: 'u1',
      name: 'Jane',
      email: 'jane@example.com',
      timezone: 'UTC',
      birthday: '1990-01-01',
      sentAtUtc: new Date('2026-01-01T09:30:00.000Z'),
      idempotencyKey: 'birthday:u1:2026',
    });

    expect(firstSend.providerMessageId).toContain('sim-');
    expect(firstSend.isIdempotentReplay).toBe(false);
    expect(secondSend.providerMessageId).toBe(firstSend.providerMessageId);
    expect(secondSend.isIdempotentReplay).toBe(true);
    expect(loggerSpy.mock.calls).toHaveLength(2);
    expect(loggerSpy.mock.calls[0]?.[0]).toContain(
      'Happy Birthday sent to Jane',
    );
    expect(loggerSpy.mock.calls[1]?.[0]).toContain(
      'Happy Birthday replay accepted',
    );
    expect(loggerSpy.mock.calls[0]?.[0]).toContain('idempotencyKey=');
    expect(loggerSpy.mock.calls[0]?.[0]).toContain('providerMessageId=');

    loggerSpy.mockRestore();
  });

  it('sends through SendGrid with idempotency header when configured', async () => {
    process.env.BIRTHDAY_MESSAGE_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'sg-api-key';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@example.com';

    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        statusText: 'Accepted',
        headers: new Headers({ 'x-message-id': 'sg-message-id-1' }),
        text: async () => '',
      } as Response);

    const service = new BirthdayMessageService();
    const result = await service.send({
      userId: 'u1',
      name: 'Jane',
      email: 'jane@example.com',
      timezone: 'UTC',
      birthday: '1990-01-01',
      sentAtUtc: new Date('2026-01-01T09:00:00.000Z'),
      idempotencyKey: 'birthday:u1:2026',
    });

    expect(fetchSpy.mock.calls).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sg-api-key',
          'Content-Type': 'application/json',
          'Idempotency-Key': 'birthday:u1:2026',
        }),
      }),
    );
    expect(result).toEqual({
      providerMessageId: 'sg-message-id-1',
      isIdempotentReplay: false,
    });
  });
});
