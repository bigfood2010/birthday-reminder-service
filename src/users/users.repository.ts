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
      .find({ nextBirthdayAtUtc: { $lte: nowUtc } })
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
          },
        },
        { new: true },
      )
      .exec();
  }
}
