import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import {
  IsBirthdayDate,
  IsIanaTimezone,
} from '@/common/utils/validation.decorators';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsOptional()
  @IsString()
  @IsBirthdayDate()
  birthday?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsIanaTimezone()
  timezone?: string;
}
