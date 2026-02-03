import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { BirthdayWorkerModule } from '@/birthday-worker/birthday-worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/birthday_service',
    ),
    ScheduleModule.forRoot(),
    BirthdayWorkerModule,
  ],
})
export class WorkerAppModule {}
