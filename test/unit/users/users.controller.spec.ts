import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '@/users/users.controller';
import { UsersService } from '@/users/users.service';
import { mockUsersService, userResponseStub } from './mocks';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService() }],
    }).compile();

    controller = module.get(UsersController);
    usersService = module.get(UsersService);
  });

  it('delegates create', async () => {
    usersService.create.mockResolvedValue(userResponseStub);

    const result = await controller.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      birthday: '1990-01-11',
      timezone: 'UTC',
    });

    expect(result).toEqual(userResponseStub);
    expect(usersService.create.mock.calls).toHaveLength(1);
  });

  it('delegates findOne', async () => {
    usersService.findOne.mockResolvedValue(userResponseStub);

    const result = await controller.findOne('65f4f0a1325f8d0df763b0ab');

    expect(result).toEqual(userResponseStub);
    expect(usersService.findOne.mock.calls).toHaveLength(1);
  });

  it('delegates update', async () => {
    usersService.update.mockResolvedValue(userResponseStub);

    const result = await controller.update('65f4f0a1325f8d0df763b0ab', {
      timezone: 'Asia/Tokyo',
    });

    expect(result).toEqual(userResponseStub);
    expect(usersService.update.mock.calls).toHaveLength(1);
  });

  it('delegates remove', async () => {
    usersService.remove.mockResolvedValue(undefined);

    await expect(
      controller.remove('65f4f0a1325f8d0df763b0ab'),
    ).resolves.toBeUndefined();
    expect(usersService.remove.mock.calls).toHaveLength(1);
  });
});
