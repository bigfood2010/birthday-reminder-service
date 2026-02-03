#!/usr/bin/env node

import mongoose from 'mongoose';

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/birthday_service';
const suffix = Date.now();
const now = new Date();

const dueUser = {
  name: 'Demo Due User',
  email: `demo+due-${suffix}@example.com`,
  birthday: '1991-01-01',
  timezone: 'UTC',
  nextBirthdayAtUtc: new Date(now.getTime() - 60_000),
  lastSentAtUtc: null,
  lastSentYear: null,
  createdAt: now,
  updatedAt: now,
};

async function run() {
  await mongoose.connect(mongoUri);
  const usersCollection = mongoose.connection.collection('users');
  const result = await usersCollection.insertOne(dueUser);

  console.log(
    `Inserted due user ${String(result.insertedId)} (${dueUser.email}) with nextBirthdayAtUtc=${dueUser.nextBirthdayAtUtc.toISOString()}`,
  );

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exitCode = 1;
});
