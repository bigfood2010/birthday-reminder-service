import { Model } from 'mongoose';
import { User } from '@/users/schemas/user.schema';
import { UsersRepository } from '@/users/users.repository';
import { mockUserModel } from './mocks';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let mockModel: ReturnType<typeof mockUserModel>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockModel = mockUserModel();
    repository = new UsersRepository(mockModel as unknown as Model<User>);
  });

  it('creates a user record', async () => {
    const created = { _id: '1' };
    mockModel.create.mockResolvedValue(created);

    const result = await repository.create({
      name: 'Jane',
      email: 'jane@example.com',
      birthday: '1990-01-11',
      timezone: 'UTC',
      nextBirthdayAtUtc: new Date(),
    });

    expect(result).toBe(created);
    expect(mockModel.create.mock.calls).toHaveLength(1);
  });

  it('finds a user by id', async () => {
    const expected = { _id: '1' };
    const query = { exec: jest.fn().mockResolvedValue(expected) };
    mockModel.findById.mockReturnValue(query);

    const result = await repository.findById('1');

    expect(result).toBe(expected);
    expect(query.exec.mock.calls).toHaveLength(1);
  });

  it('updates a user by id', async () => {
    const expected = { _id: '1' };
    const query = { exec: jest.fn().mockResolvedValue(expected) };
    mockModel.findByIdAndUpdate.mockReturnValue(query);

    const result = await repository.updateById('1', { name: 'Updated' });

    expect(result).toBe(expected);
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '1',
      { $set: { name: 'Updated' } },
      { new: true, runValidators: true },
    );
    expect(query.exec.mock.calls).toHaveLength(1);
  });

  it('deletes a user by id and returns true when deleted', async () => {
    const query = { exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    mockModel.deleteOne.mockReturnValue(query);

    const result = await repository.deleteById('1');

    expect(result).toBe(true);
  });

  it('returns false when nothing was deleted', async () => {
    const query = { exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) };
    mockModel.deleteOne.mockReturnValue(query);

    const result = await repository.deleteById('1');

    expect(result).toBe(false);
  });

  it('finds due users sorted and limited', async () => {
    const expected = [{ _id: '1' }];
    const exec = jest.fn().mockResolvedValue(expected);
    const limit = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ limit });

    mockModel.find.mockReturnValue({ sort });

    const result = await repository.findDueUsers(
      new Date('2026-01-01T00:00:00Z'),
      2,
    );

    expect(result).toBe(expected);
    expect(sort).toHaveBeenCalledWith({ nextBirthdayAtUtc: 1 });
    expect(limit).toHaveBeenCalledWith(2);
    expect(exec).toHaveBeenCalled();
  });

  it('marks birthday as processed', async () => {
    const expected = { _id: '1', lastSentYear: 2026 };
    const query = { exec: jest.fn().mockResolvedValue(expected) };
    mockModel.findOneAndUpdate.mockReturnValue(query);

    const result = await repository.markBirthdayProcessed({
      id: '1',
      sendYear: 2026,
      sentAtUtc: new Date('2026-01-01T09:00:00Z'),
      nextBirthdayAtUtc: new Date('2027-01-01T09:00:00Z'),
    });

    expect(result).toBe(expected);
    expect(mockModel.findOneAndUpdate.mock.calls).toHaveLength(1);
  });
});
