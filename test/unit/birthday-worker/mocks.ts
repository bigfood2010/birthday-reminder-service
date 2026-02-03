export const mockDueUser = {
  _id: { toString: () => 'u1' },
  name: 'Jane',
  email: 'jane@example.com',
  birthday: '1990-01-01',
  timezone: 'UTC',
  nextBirthdayAtUtc: new Date('2026-01-01T09:00:00.000Z'),
};

export const mockConfigService = () => ({
  get: jest.fn().mockReturnValue(undefined),
});

export const mockBirthdayCalculatorService = () => ({
  getNextBirthdayAtUtc: jest.fn(),
  getSendYear: jest.fn(),
});

export const mockBirthdayMessageService = () => ({
  send: jest.fn(),
});
