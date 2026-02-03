#!/usr/bin/env node

import mongoose from 'mongoose';

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/birthday_service';

async function run() {
  await mongoose.connect(mongoUri);
  const usersCollection = mongoose.connection.collection('users');

  const result = await usersCollection.deleteMany({
    email: { $regex: '^demo\\+' },
  });

  console.log(`Deleted ${result.deletedCount} demo user(s).`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exitCode = 1;
});
