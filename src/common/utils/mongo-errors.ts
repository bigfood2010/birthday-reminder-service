const DUPLICATE_KEY_ERROR_CODE = 11000;

interface MongoLikeError {
  readonly code?: number;
}

export function isMongoDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const mongoError = error as MongoLikeError;
  return mongoError.code === DUPLICATE_KEY_ERROR_CODE;
}
