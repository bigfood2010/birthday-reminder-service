import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  birthday!: string;

  @Prop({ required: true })
  timezone!: string;

  @Prop({ required: true, type: Date })
  nextBirthdayAtUtc!: Date;

  @Prop({ type: Date, default: null })
  lastSentAtUtc!: Date | null;

  @Prop({ type: Number, default: null })
  lastSentYear!: number | null;

  createdAt!: Date;

  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ nextBirthdayAtUtc: 1 });
