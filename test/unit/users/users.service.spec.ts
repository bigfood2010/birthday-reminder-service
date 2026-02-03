import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '@/users/users.repository';
import { UsersService } from '@/users/users.service';
import { BirthdayScheduleError } from '@/common/utils/birthday-schedule';
import { createUserDocumentStub, mockUsersRepository } from './mocks';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository() },
      ],
    }).compile();

    service = module.get(UsersService);
    usersRepository = module.get(UsersRepository);
  });

  it('creates a user and returns transformed response', async () => {
    usersRepository.create.mockResolvedValue(createUserDocumentStub() as never);

    const result = await service.create({
      name: 'Jane Doe',
      email: 'Jane@Example.com',
      birthday: '1990-01-11',
      timezone: 'Asia/Tokyo',
    });

    expect(usersRepository.create.mock.calls).toHaveLength(1);
    expect(result).toMatchObject({
      id: '65f4f0a1325f8d0df763b0ab',
      email: 'jane@example.com',
      birthday: '1990-01-11',
      timezone: 'Asia/Tokyo',
    });
  });

  it('throws conflict exception on duplicate email', async () => {
    usersRepository.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        birthday: '1990-01-11',
        timezone: 'Asia/Tokyo',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unknown persistence errors', async () => {
    const unknownError = new Error('unknown');
    usersRepository.create.mockRejectedValue(unknownError);

    await expect(
      service.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        birthday: '1990-01-11',
        timezone: 'Asia/Tokyo',
      }),
    ).rejects.toThrow('unknown');
  });

  it('maps birthday schedule errors to bad request', async () => {
    usersRepository.create.mockRejectedValue(
      new BirthdayScheduleError('INVALID_BIRTHDAY', 'bad birthday'),
    );

    await expect(
      service.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        birthday: '1990-01-11',
        timezone: 'Asia/Tokyo',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finds user by id', async () => {
    usersRepository.findById.mockResolvedValue(
      createUserDocumentStub() as never,
    );

    const result = await service.findOne('65f4f0a1325f8d0df763b0ab');

    expect(result.id).toBe('65f4f0a1325f8d0df763b0ab');
  });

  it('throws bad request for invalid id in findOne', async () => {
    await expect(service.findOne('invalid-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws not found for missing user in findOne', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      service.findOne('65f4f0a1325f8d0df763b0ab'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns current user when update payload is empty', async () => {
    const existing = createUserDocumentStub();
    usersRepository.findById.mockResolvedValue(existing as never);

    const result = await service.update('65f4f0a1325f8d0df763b0ab', {});

    expect(result.id).toBe('65f4f0a1325f8d0df763b0ab');
    expect(usersRepository.updateById.mock.calls).toHaveLength(0);
  });

  it('updates user and recalculates schedule when timezone changes', async () => {
    usersRepository.findById.mockResolvedValue(
      createUserDocumentStub() as never,
    );
    usersRepository.updateById.mockResolvedValue(
      createUserDocumentStub() as never,
    );

    const result = await service.update('65f4f0a1325f8d0df763b0ab', {
      timezone: 'UTC',
    });

    expect(result.timezone).toBe('Asia/Tokyo');
    expect(usersRepository.updateById.mock.calls).toHaveLength(1);
  });

  it('throws bad request for invalid id in update', async () => {
    await expect(service.update('invalid-id', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws not found when updating unknown user', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      service.update('65f4f0a1325f8d0df763b0ab', {
        timezone: 'UTC',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws not found when updateById returns null', async () => {
    usersRepository.findById.mockResolvedValue(
      createUserDocumentStub() as never,
    );
    usersRepository.updateById.mockResolvedValue(null);

    await expect(
      service.update('65f4f0a1325f8d0df763b0ab', {
        name: 'Updated',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws conflict when update persistence reports duplicate email', async () => {
    usersRepository.findById.mockResolvedValue(
      createUserDocumentStub() as never,
    );
    usersRepository.updateById.mockRejectedValue({ code: 11000 });

    await expect(
      service.update('65f4f0a1325f8d0df763b0ab', {
        email: 'existing@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('removes user', async () => {
    usersRepository.deleteById.mockResolvedValue(true);

    await expect(
      service.remove('65f4f0a1325f8d0df763b0ab'),
    ).resolves.toBeUndefined();
  });

  it('throws bad request for invalid id in remove', async () => {
    await expect(service.remove('invalid-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws not found when removing unknown user', async () => {
    usersRepository.deleteById.mockResolvedValue(false);

    await expect(
      service.remove('65f4f0a1325f8d0df763b0ab'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
