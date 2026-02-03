import { Module } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { BirthdayCalculatorService } from '@/birthday-worker/birthday-calculator.service';
import { BirthdayMessageService } from '@/birthday-worker/birthday-message.service';
import { BirthdayWorkerService } from '@/birthday-worker/birthday-worker.service';

@Module({
  imports: [UsersModule],
  providers: [
    BirthdayWorkerService,
    BirthdayCalculatorService,
    BirthdayMessageService,
  ],
})
export class BirthdayWorkerModule {}
