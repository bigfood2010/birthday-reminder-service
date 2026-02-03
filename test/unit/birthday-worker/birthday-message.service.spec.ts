import { Logger } from '@nestjs/common';
import { BirthdayMessageService } from '@/birthday-worker/birthday-message.service';

describe('BirthdayMessageService', () => {
  it('logs simulated birthday message payload', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const service = new BirthdayMessageService();

    service.send({
      userId: 'u1',
      name: 'Jane',
      email: 'jane@example.com',
      timezone: 'UTC',
      birthday: '1990-01-01',
      sentAtUtc: new Date('2026-01-01T09:00:00.000Z'),
    });

    expect(loggerSpy.mock.calls).toHaveLength(1);
    expect(loggerSpy.mock.calls[0]?.[0]).toContain(
      'Happy Birthday sent to Jane',
    );

    loggerSpy.mockRestore();
  });
});
