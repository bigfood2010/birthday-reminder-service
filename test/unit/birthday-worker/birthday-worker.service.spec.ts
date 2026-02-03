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

  it('sends birthday message when due user is successfully marked', async () => {
    usersRepository.findDueUsers
      .mockResolvedValueOnce([mockDueUser] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockReturnValue(2026);
    birthdayCalculator.getNextBirthdayAtUtc.mockReturnValue(
      new Date('2027-01-01T09:00:00.000Z'),
    );
    usersRepository.markBirthdayProcessed.mockResolvedValue({
      ...mockDueUser,
    } as never);

    await service.processDueBirthdays();

    expect(birthdayMessageService.send.mock.calls).toHaveLength(1);
    expect(usersRepository.markBirthdayProcessed.mock.calls).toHaveLength(1);
  });

  it('does not send message when mark operation is skipped', async () => {
    usersRepository.findDueUsers
      .mockResolvedValueOnce([mockDueUser] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockReturnValue(2026);
    birthdayCalculator.getNextBirthdayAtUtc.mockReturnValue(
      new Date('2027-01-01T09:00:00.000Z'),
    );
    usersRepository.markBirthdayProcessed.mockResolvedValue(null);

    await service.processDueBirthdays();

    expect(birthdayMessageService.send.mock.calls).toHaveLength(0);
  });

  it('logs processing error and keeps worker alive', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    usersRepository.findDueUsers
      .mockResolvedValueOnce([mockDueUser] as never)
      .mockResolvedValueOnce([]);
    birthdayCalculator.getSendYear.mockImplementation(() => {
      throw new Error('bad schedule');
    });

    await service.processDueBirthdays();

    expect(errorSpy.mock.calls).toHaveLength(1);
    expect(birthdayMessageService.send.mock.calls).toHaveLength(0);
    errorSpy.mockRestore();
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
