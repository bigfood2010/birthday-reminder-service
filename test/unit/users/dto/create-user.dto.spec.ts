import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { UpdateUserDto } from '@/users/dto/update-user.dto';

describe('User DTO validation', () => {
  it('validates and transforms create dto', async () => {
    const dto = plainToInstance(CreateUserDto, {
      name: '  Jane Doe  ',
      email: '  Jane@Example.com ',
      birthday: '1990-01-11',
      timezone: '  Asia/Tokyo  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Jane Doe');
    expect(dto.email).toBe('jane@example.com');
    expect(dto.timezone).toBe('Asia/Tokyo');
  });

  it('rejects invalid create dto payload', async () => {
    const dto = plainToInstance(CreateUserDto, {
      name: '',
      email: 'bad-email',
      birthday: '2025-02-30',
      timezone: 'Invalid/Zone',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toContain('name');
    expect(fields).toContain('email');
    expect(fields).toContain('birthday');
    expect(fields).toContain('timezone');
    expect(
      errors.find((error) => error.property === 'timezone')?.constraints
        ?.isIanaTimezone,
    ).toBe('timezone must be a valid IANA timezone');
    expect(
      errors.find((error) => error.property === 'birthday')?.constraints
        ?.isBirthdayDate,
    ).toBe('birthday must be a valid date in YYYY-MM-DD format');
  });

  it('validates partial update dto and preserves optional fields', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      name: '  Updated Name  ',
      email: 'New@Example.com',
      timezone: 'UTC',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Updated Name');
    expect(dto.email).toBe('new@example.com');
    expect(dto.timezone).toBe('UTC');
  });

  it('rejects invalid update dto values', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      email: 'bad',
      birthday: 'not-a-date',
      timezone: 'bad-zone',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toContain('email');
    expect(fields).toContain('birthday');
    expect(fields).toContain('timezone');
  });

  it('keeps non-string update values unchanged before validation', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      name: 123,
      email: 456,
      birthday: 789,
      timezone: 1011,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(dto.name).toBe(123 as unknown as string);
    expect(dto.email).toBe(456 as unknown as string);
    expect(dto.birthday).toBe(789 as unknown as string);
    expect(dto.timezone).toBe(1011 as unknown as string);
  });

  it('keeps non-string values unchanged before validation errors', async () => {
    const dto = plainToInstance(CreateUserDto, {
      name: 123,
      email: 456,
      birthday: 789,
      timezone: 1011,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(dto.name).toBe(123 as unknown as string);
    expect(dto.email).toBe(456 as unknown as string);
    expect(dto.birthday).toBe(789 as unknown as string);
    expect(dto.timezone).toBe(1011 as unknown as string);
  });
});
