import { UserResponse } from '@/users/users.types';

export const MOCK_USER_ID = '65f4f0a1325f8d0df763b0ab';

export const createUserDocumentStub = (
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    birthday: string;
    timezone: string;
  }> = {},
) => ({
  _id: { toString: () => overrides.id ?? MOCK_USER_ID },
  name: overrides.name ?? 'Jane Doe',
  email: overrides.email ?? 'jane@example.com',
  birthday: overrides.birthday ?? '1990-01-11',
  timezone: overrides.timezone ?? 'Asia/Tokyo',
  nextBirthdayAtUtc: new Date('2026-01-11T00:00:00.000Z'),
  lastSentAtUtc: null,
  lastSentYear: null,
  lastDeliveryProviderMessageId: null,
  deliveryAttemptCount: 0,
  nextDeliveryAttemptAtUtc: null,
  lastDeliveryError: null,
  lastDeliveryAttemptAtUtc: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

export const userResponseStub: UserResponse = {
  id: MOCK_USER_ID,
  name: 'Jane Doe',
  email: 'jane@example.com',
  birthday: '1990-01-11',
  timezone: 'UTC',
  nextBirthdayAtUtc: '2026-01-11T09:00:00.000Z',
  lastSentAtUtc: null,
  lastSentYear: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const mockCreateUserDto = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  birthday: '1990-01-11',
  timezone: 'Asia/Tokyo',
};

export const mockUsersRepository = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  findDueUsers: jest.fn(),
  markBirthdayProcessed: jest.fn(),
  markBirthdayDeliveryFailed: jest.fn(),
});

export const mockUsersService = () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

export const mockUserModel = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
});
