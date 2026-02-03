import { isMongoDuplicateKeyError } from '@/common/utils/mongo-errors';

describe('isMongoDuplicateKeyError', () => {
  it('returns true for duplicate key code', () => {
    expect(isMongoDuplicateKeyError({ code: 11000 })).toBe(true);
  });

  it('returns false for non-duplicate code', () => {
    expect(isMongoDuplicateKeyError({ code: 42 })).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isMongoDuplicateKeyError(null)).toBe(false);
    expect(isMongoDuplicateKeyError(undefined)).toBe(false);
    expect(isMongoDuplicateKeyError('error')).toBe(false);
  });
});
