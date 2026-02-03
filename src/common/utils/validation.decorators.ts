import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  isValidIanaTimezone,
  parseBirthdayParts,
} from '@/common/utils/birthday-schedule';

@ValidatorConstraint({ name: 'isIanaTimezone', async: false })
class IsIanaTimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidIanaTimezone(value);
  }

  defaultMessage(): string {
    return 'timezone must be a valid IANA timezone';
  }
}

@ValidatorConstraint({ name: 'isBirthdayDate', async: false })
class IsBirthdayDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && parseBirthdayParts(value) !== null;
  }

  defaultMessage(): string {
    return 'birthday must be a valid date in YYYY-MM-DD format';
  }
}

export function IsIanaTimezone(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      constraints: [],
      validator: IsIanaTimezoneConstraint,
    });
  };
}

export function IsBirthdayDate(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      constraints: [],
      validator: IsBirthdayDateConstraint,
    });
  };
}
