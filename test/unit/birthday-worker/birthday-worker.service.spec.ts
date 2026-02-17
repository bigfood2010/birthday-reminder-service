import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '@/users/users.repository';
import { BirthdayCalculatorService } from '@/birthday-worker/birthday-calculator.service';
import { BirthdayMessageService } from '@/birthday-worker/birthday-message.service';
import { BirthdayWorkerService } from '@/birthday-worker/birthday-worker.service';
import {
  mockDueUser,
  mockConfigService,
  mockBirthdayCalculatorService,
  mockBirthdayMessageService,
} from './mocks';
import { mockUsersRepository } from '@test/unit/users/mocks';

const NOW_UTC = new Date('2026-01-01T09:00:00.000Z');
const NEXT_BIRTHDAY_UTC = new Date('2027-01-01T09:00:00.000Z');

describe('BirthdayWorkerService', () => {
  let service: BirthdayWorkerService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let birthdayCalculator: jest.Mocked<BirthdayCalculatorService>;
  let birthdayMessageService: jest.Mocked<BirthdayMessageService>;
  let configService: ReturnType<typeof mockConfigService>;

  beforeEach(async () => {
    configService = mockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BirthdayWorkerService,
        { provide: UsersRepository, useValue: mockUsersRepository() },
        {
          provide: BirthdayCalculatorService,
          useValue: mockBirthdayCalculatorService(),
        },
        {
          provide: BirthdayMessageService,
          useValue: mockBirthdayMessageService(),
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(BirthdayWorkerService);
    usersRepository = module.get(UsersRepository);
    birthdayCalculator = module.get(BirthdayCalculatorService);
    birthdayMessageService = module.get(BirthdayMessageService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('awaits send then marks user as processed on delivery success', async () => {
    jest.useFakeTimers().setSystemTime(NOW_UTC);
    usersRepository.findDueUsers
      .mockResolvedValueOnce([{ ...mockDueUser }] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockReturnValue(2026);
    birthdayCalculator.getNextBirthdayAtUtc.mockReturnValue(NEXT_BIRTHDAY_UTC);
    usersRepository.markBirthdayProcessed.mockResolvedValue({
      ...mockDueUser,
    } as never);

    await service.processDueBirthdays();

    expect(birthdayMessageService.send.mock.calls).toHaveLength(1);
    expect(usersRepository.markBirthdayProcessed.mock.calls).toHaveLength(1);
    expect(usersRepository.markBirthdayDeliveryFailed.mock.calls).toHaveLength(
      0,
    );
    expect(usersRepository.markBirthdayProcessed).toHaveBeenCalledWith({
      id: 'u1',
      sendYear: 2026,
      sentAtUtc: NOW_UTC,
      nextBirthdayAtUtc: NEXT_BIRTHDAY_UTC,
      providerMessageId: 'sim-provider-message-id-u1-2026',
    });

    const sendCall = birthdayMessageService.send.mock.calls[0]?.[0];
    expect(sendCall).toMatchObject({
      userId: 'u1',
      idempotencyKey: 'birthday:u1:2026',
    });

    const sendOrder = birthdayMessageService.send.mock.invocationCallOrder[0];
    const markOrder = usersRepository.markBirthdayProcessed.mock
      .invocationCallOrder[0];
    expect(sendOrder).toBeLessThan(markOrder);
  });

  it('schedules retry metadata when delivery fails before max attempts', async () => {
    jest.useFakeTimers().setSystemTime(NOW_UTC);
    usersRepository.findDueUsers
      .mockResolvedValueOnce([{ ...mockDueUser, deliveryAttemptCount: 0 }] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockReturnValue(2026);
    birthdayCalculator.getNextBirthdayAtUtc.mockReturnValue(NEXT_BIRTHDAY_UTC);
    birthdayMessageService.send.mockRejectedValueOnce(
      new Error('provider timeout'),
    );
    usersRepository.markBirthdayDeliveryFailed.mockResolvedValue(
      mockDueUser as never,
    );

    await service.processDueBirthdays();

    expect(usersRepository.markBirthdayProcessed.mock.calls).toHaveLength(0);
    expect(usersRepository.markBirthdayDeliveryFailed.mock.calls).toHaveLength(
      1,
    );

    const failureCall = usersRepository.markBirthdayDeliveryFailed.mock.calls[0]?.[0];
    expect(failureCall).toMatchObject({
      id: 'u1',
      sendYear: 2026,
      deliveryAttemptCount: 1,
      lastDeliveryError: 'provider timeout',
      lastDeliveryAttemptAtUtc: NOW_UTC,
      nextBirthdayAtUtc: mockDueUser.nextBirthdayAtUtc,
    });
    expect(failureCall?.nextDeliveryAttemptAtUtc).toEqual(
      new Date('2026-01-01T09:15:00.000Z'),
    );
  });

  it('handles long-latency send timeout by persisting retry state', async () => {
    jest.useFakeTimers().setSystemTime(NOW_UTC);
    usersRepository.findDueUsers
      .mockResolvedValueOnce([{ ...mockDueUser, deliveryAttemptCount: 0 }] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockReturnValue(2026);
    birthdayCalculator.getNextBirthdayAtUtc.mockReturnValue(NEXT_BIRTHDAY_UTC);
    birthdayMessageService.send.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('send timeout'));
          }, 30_000);
        }),
    );
    usersRepository.markBirthdayDeliveryFailed.mockResolvedValue(
      mockDueUser as never,
    );

    const processPromise = service.processDueBirthdays();

    await Promise.resolve();
    expect(usersRepository.markBirthdayDeliveryFailed.mock.calls).toHaveLength(
      0,
    );

    await jest.advanceTimersByTimeAsync(30_000);
    await processPromise;

    expect(usersRepository.markBirthdayProcessed.mock.calls).toHaveLength(0);
    expect(usersRepository.markBirthdayDeliveryFailed.mock.calls).toHaveLength(
      1,
    );
    expect(usersRepository.markBirthdayDeliveryFailed).toHaveBeenCalledWith({
      id: 'u1',
      sendYear: 2026,
      deliveryAttemptCount: 1,
      nextDeliveryAttemptAtUtc: new Date('2026-01-01T09:15:00.000Z'),
      nextBirthdayAtUtc: mockDueUser.nextBirthdayAtUtc,
      lastDeliveryError: 'send timeout',
      lastDeliveryAttemptAtUtc: NOW_UTC,
    });
  });

  it('marks current year as exhausted on third delivery failure', async () => {
    jest.useFakeTimers().setSystemTime(NOW_UTC);
    usersRepository.findDueUsers
      .mockResolvedValueOnce([{ ...mockDueUser, deliveryAttemptCount: 2 }] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockReturnValue(2026);
    birthdayCalculator.getNextBirthdayAtUtc.mockReturnValue(NEXT_BIRTHDAY_UTC);
    birthdayMessageService.send.mockRejectedValueOnce(new Error('provider down'));
    usersRepository.markBirthdayDeliveryFailed.mockResolvedValue(
      mockDueUser as never,
    );

    await service.processDueBirthdays();

    expect(usersRepository.markBirthdayDeliveryFailed.mock.calls).toHaveLength(
      1,
    );
    expect(usersRepository.markBirthdayDeliveryFailed).toHaveBeenCalledWith({
      id: 'u1',
      sendYear: 2026,
      deliveryAttemptCount: 0,
      lastDeliveryError: 'provider down',
      lastDeliveryAttemptAtUtc: NOW_UTC,
      nextDeliveryAttemptAtUtc: null,
      nextBirthdayAtUtc: NEXT_BIRTHDAY_UTC,
    });
  });

  it('logs error and keeps worker alive when persistence fails after send', async () => {
    jest.useFakeTimers().setSystemTime(NOW_UTC);
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    usersRepository.findDueUsers
      .mockResolvedValueOnce([{ ...mockDueUser }] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockReturnValue(2026);
    birthdayCalculator.getNextBirthdayAtUtc.mockReturnValue(NEXT_BIRTHDAY_UTC);
    usersRepository.markBirthdayProcessed.mockRejectedValue(
      new Error('db unavailable'),
    );

    await service.processDueBirthdays();

    expect(birthdayMessageService.send.mock.calls).toHaveLength(1);
    expect(usersRepository.markBirthdayDeliveryFailed.mock.calls).toHaveLength(
      0,
    );
    expect(errorSpy.mock.calls).toHaveLength(1);

    errorSpy.mockRestore();
  });

  it('continues processing remaining users after a single-user failure', async () => {
    jest.useFakeTimers().setSystemTime(NOW_UTC);
    const secondUser = {
      ...mockDueUser,
      _id: { toString: () => 'u2' },
      email: 'john@example.com',
    };

    usersRepository.findDueUsers
      .mockResolvedValueOnce([{ ...mockDueUser }, secondUser] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockReturnValue(2026);
    birthdayCalculator.getNextBirthdayAtUtc.mockReturnValue(NEXT_BIRTHDAY_UTC);
    birthdayMessageService.send
      .mockRejectedValueOnce(new Error('provider timeout'))
      .mockResolvedValueOnce({
        providerMessageId: 'sim-provider-message-id-u2-2026',
        isIdempotentReplay: false,
      });
    usersRepository.markBirthdayDeliveryFailed.mockResolvedValue(
      mockDueUser as never,
    );
    usersRepository.markBirthdayProcessed.mockResolvedValue(secondUser as never);

    await service.processDueBirthdays();

    expect(birthdayMessageService.send.mock.calls).toHaveLength(2);
    expect(usersRepository.markBirthdayDeliveryFailed.mock.calls).toHaveLength(
      1,
    );
    expect(usersRepository.markBirthdayProcessed.mock.calls).toHaveLength(1);
    expect(usersRepository.markBirthdayProcessed).toHaveBeenCalledWith({
      id: 'u2',
      sendYear: 2026,
      sentAtUtc: NOW_UTC,
      nextBirthdayAtUtc: NEXT_BIRTHDAY_UTC,
      providerMessageId: 'sim-provider-message-id-u2-2026',
    });
  });

  it('uses configured batch size and max batches', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'WORKER_BATCH_SIZE') return '2';
      if (key === 'WORKER_MAX_BATCHES') return '1';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BirthdayWorkerService,
        {
          provide: UsersRepository,
          useValue: {
            findDueUsers: jest.fn().mockResolvedValue([]),
            markBirthdayProcessed: jest.fn(),
            markBirthdayDeliveryFailed: jest.fn(),
          },
        },
        {
          provide: BirthdayCalculatorService,
          useValue: mockBirthdayCalculatorService(),
        },
        {
          provide: BirthdayMessageService,
          useValue: mockBirthdayMessageService(),
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    const configuredService = module.get(BirthdayWorkerService);
    const configuredRepo = module.get(UsersRepository);

    await configuredService.processDueBirthdays();

    const findDueUsersCalls = (configuredRepo.findDueUsers as jest.Mock).mock
      .calls;
    const firstCall = findDueUsersCalls[0] as [Date, number] | undefined;

    expect(firstCall?.[1]).toBe(2);
    expect(findDueUsersCalls).toHaveLength(1);
  });
});
