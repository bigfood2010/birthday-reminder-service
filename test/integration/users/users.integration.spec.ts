import { TestingModule, Test } from '@nestjs/testing';
import { UsersController } from '@/users/users.controller';
import { UsersRepository } from '@/users/users.repository';
import { UsersService } from '@/users/users.service';
import { InMemoryUsersRepository } from './mocks';

describe('Users integration (controller + service + repository)', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('runs a full create -> get -> update -> delete flow', async () => {
    const created = await controller.create({
      name: 'Integration User',
      email: 'integration@example.com',
      birthday: '1990-03-01',
      timezone: 'UTC',
    });

    const fetched = await controller.findOne(created.id);
    expect(fetched.email).toBe('integration@example.com');

    const updated = await controller.update(created.id, {
      timezone: 'Asia/Tokyo',
    });
    expect(updated.timezone).toBe('Asia/Tokyo');

    await expect(controller.remove(created.id)).resolves.toBeUndefined();
  });
});
