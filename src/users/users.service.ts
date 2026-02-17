import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  calculateNextBirthdayAtUtc,
  BirthdayScheduleError,
} from '@/common/utils/birthday-schedule';
import { isMongoDuplicateKeyError } from '@/common/utils/mongo-errors';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { UpdateUserDto } from '@/users/dto/update-user.dto';
import { UserDocument } from '@/users/schemas/user.schema';
import { UsersRepository } from '@/users/users.repository';
import { UpdateUserRecord, UserResponse } from '@/users/users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(input: CreateUserDto): Promise<UserResponse> {
    try {
      const user = await this.usersRepository.create({
        ...input,
        nextBirthdayAtUtc: calculateNextBirthdayAtUtc({
          birthday: input.birthday,
          timezone: input.timezone,
        }),
      });

      return this.toResponse(user);
    } catch (error: unknown) {
      this.handlePersistenceError(error);
    }
  }

  async findOne(id: string): Promise<UserResponse> {
    this.validateObjectId(id);

    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }

    return this.toResponse(user);
  }

  async update(id: string, input: UpdateUserDto): Promise<UserResponse> {
    this.validateObjectId(id);

    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`User ${id} was not found`);
    }

    const patch: UpdateUserRecord = this.compactRecord<UpdateUserRecord>({
      ...input,
    });
    const scheduleInputChanged =
      input.birthday !== undefined || input.timezone !== undefined;

    if (scheduleInputChanged) {
      const birthday = input.birthday ?? existingUser.birthday;
      const timezone = input.timezone ?? existingUser.timezone;

      patch.nextBirthdayAtUtc = calculateNextBirthdayAtUtc({
        birthday,
        timezone,
      });
      patch.lastSentAtUtc = null;
      patch.lastSentYear = null;
      patch.lastDeliveryProviderMessageId = null;
      patch.deliveryAttemptCount = 0;
      patch.nextDeliveryAttemptAtUtc = null;
      patch.lastDeliveryError = null;
      patch.lastDeliveryAttemptAtUtc = null;
    }

    if (Object.keys(patch).length === 0) {
      return this.toResponse(existingUser);
    }

    try {
      const updated = await this.usersRepository.updateById(id, patch);
      if (!updated) {
        throw new NotFoundException(`User ${id} was not found`);
      }
      return this.toResponse(updated);
    } catch (error: unknown) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string): Promise<void> {
    this.validateObjectId(id);
    const deleted = await this.usersRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundException(`User ${id} was not found`);
    }
  }

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user id');
    }
  }

  private handlePersistenceError(error: unknown): never {
    if (isMongoDuplicateKeyError(error)) {
      throw new ConflictException('Email already exists');
    }
    if (error instanceof BirthdayScheduleError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }

  private toResponse(user: UserDocument): UserResponse {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      birthday: user.birthday,
      timezone: user.timezone,
      nextBirthdayAtUtc: user.nextBirthdayAtUtc.toISOString(),
      lastSentAtUtc: user.lastSentAtUtc?.toISOString() ?? null,
      lastSentYear: user.lastSentYear ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private compactRecord<T extends object>(record: T): T {
    return Object.fromEntries(
      Object.entries(record).filter(([, value]) => value !== undefined),
    ) as T;
  }
}
