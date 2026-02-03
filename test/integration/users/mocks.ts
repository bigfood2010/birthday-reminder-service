import { Types } from 'mongoose';

type InMemoryUser = {
  _id: { toString: () => string };
  name: string;
  email: string;
  birthday: string;
  timezone: string;
  nextBirthdayAtUtc: Date;
  lastSentAtUtc: Date | null;
  lastSentYear: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export class InMemoryUsersRepository {
  private readonly store = new Map<string, InMemoryUser>();

  create(record: {
    name: string;
    email: string;
    birthday: string;
    timezone: string;
    nextBirthdayAtUtc: Date;
  }): Promise<InMemoryUser> {
    for (const user of this.store.values()) {
      if (user.email === record.email) {
        const error = new Error('duplicate email') as Error & { code: number };
        error.code = 11000;
        throw error;
      }
    }

    const id = new Types.ObjectId().toString();
    const now = new Date();
    const user: InMemoryUser = {
      _id: { toString: () => id },
      name: record.name,
      email: record.email,
      birthday: record.birthday,
      timezone: record.timezone,
      nextBirthdayAtUtc: record.nextBirthdayAtUtc,
      lastSentAtUtc: null,
      lastSentYear: null,
      createdAt: now,
      updatedAt: now,
    };

    this.store.set(id, user);
    return Promise.resolve(user);
  }

  findById(id: string): Promise<InMemoryUser | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  updateById(
    id: string,
    record: Partial<InMemoryUser>,
  ): Promise<InMemoryUser | null> {
    const existing = this.store.get(id);
    if (!existing) {
      return null as unknown as Promise<null>;
    }

    if (record.email) {
      for (const [userId, user] of this.store.entries()) {
        if (userId !== id && user.email === record.email) {
          const error = new Error('duplicate email') as Error & {
            code: number;
          };
          error.code = 11000;
          throw error;
        }
      }
    }

    const updated: InMemoryUser = {
      ...existing,
      ...record,
      updatedAt: new Date(),
    };
    this.store.set(id, updated);
    return Promise.resolve(updated);
  }

  deleteById(id: string): Promise<boolean> {
    return Promise.resolve(this.store.delete(id));
  }
}
