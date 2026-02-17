import { User } from '@/users/schemas/user.schema';

type MutableUserKeys =
  | 'name'
  | 'email'
  | 'birthday'
  | 'timezone'
  | 'nextBirthdayAtUtc'
  | 'lastSentAtUtc'
  | 'lastSentYear'
  | 'lastDeliveryProviderMessageId'
  | 'deliveryAttemptCount'
  | 'nextDeliveryAttemptAtUtc'
  | 'lastDeliveryError'
  | 'lastDeliveryAttemptAtUtc';

type MutableUserFields = Pick<User, MutableUserKeys>;

export type CreateUserRecord = Pick<
  MutableUserFields,
  'name' | 'email' | 'birthday' | 'timezone' | 'nextBirthdayAtUtc'
> &
  Partial<
    Pick<
      MutableUserFields,
      | 'lastSentAtUtc'
      | 'lastSentYear'
      | 'lastDeliveryProviderMessageId'
      | 'deliveryAttemptCount'
      | 'nextDeliveryAttemptAtUtc'
      | 'lastDeliveryError'
      | 'lastDeliveryAttemptAtUtc'
    >
  >;

export type UpdateUserRecord = Partial<MutableUserFields>;

export interface UserResponse {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly birthday: string;
  readonly timezone: string;
  readonly nextBirthdayAtUtc: string;
  readonly lastSentAtUtc: string | null;
  readonly lastSentYear: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
