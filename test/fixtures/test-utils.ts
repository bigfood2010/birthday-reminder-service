export const createMockDate = (iso: string): Date => new Date(iso);

export const waitForNextTick = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));
