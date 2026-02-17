import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@/users/schemas/user.schema';
import { CreateUserRecord, UpdateUserRecord } from '@/users/users.types';

export interface MarkBirthdayProcessedInput {
  readonly id: string;
  readonly sendYear: number;
  readonly sentAtUtc: Date;
  readonly nextBirthdayAtUtc: Date;
  readonly providerMessageId: string | null;
}

export interface MarkBirthdayDeliveryFailedInput {
  readonly id: string;
  readonly sendYear: number;
  readonly deliveryAttemptCount: number;
  readonly nextDeliveryAttemptAtUtc: Date | null;
  readonly nextBirthdayAtUtc: Date;
  readonly lastDeliveryError: string;
  readonly lastDeliveryAttemptAtUtc: Date;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async create(record: CreateUserRecord): Promise<UserDocument> {
    return this.userModel.create(record);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateById(
    id: string,
    record: UpdateUserRecord,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { $set: record },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  async findDueUsers(nowUtc: Date, limit: number): Promise<UserDocument[]> {
    return this.userModel
      .find({
        nextBirthdayAtUtc: { $lte: nowUtc },
        $or: [
          { nextDeliveryAttemptAtUtc: { $exists: false } },
          { nextDeliveryAttemptAtUtc: null },
          { nextDeliveryAttemptAtUtc: { $lte: nowUtc } },
        ],
      })
      .sort({ nextBirthdayAtUtc: 1 })
      .limit(limit)
      .exec();
  }

  async markBirthdayProcessed(
    input: MarkBirthdayProcessedInput,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        {
          _id: input.id,
          $or: [
            { lastSentYear: { $exists: false } },
            { lastSentYear: null },
            { lastSentYear: { $ne: input.sendYear } },
          ],
        },
        {
          $set: {
            lastSentYear: input.sendYear,
            lastSentAtUtc: input.sentAtUtc,
            nextBirthdayAtUtc: input.nextBirthdayAtUtc,
            lastDeliveryProviderMessageId: input.providerMessageId,
            deliveryAttemptCount: 0,
            nextDeliveryAttemptAtUtc: null,
            lastDeliveryError: null,
            lastDeliveryAttemptAtUtc: null,
          },
        },
        { new: true },
      )
      .exec();
  }

  async markBirthdayDeliveryFailed(
    input: MarkBirthdayDeliveryFailedInput,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        {
          _id: input.id,
          $or: [
            { lastSentYear: { $exists: false } },
            { lastSentYear: null },
            { lastSentYear: { $ne: input.sendYear } },
          ],
        },
        {
          $set: {
            deliveryAttemptCount: input.deliveryAttemptCount,
            nextDeliveryAttemptAtUtc: input.nextDeliveryAttemptAtUtc,
            nextBirthdayAtUtc: input.nextBirthdayAtUtc,
            lastDeliveryError: input.lastDeliveryError,
            lastDeliveryAttemptAtUtc: input.lastDeliveryAttemptAtUtc,
          },
        },
        { new: true },
      )
      .exec();
  }
}
