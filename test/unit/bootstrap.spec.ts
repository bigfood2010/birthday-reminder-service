import { waitForNextTick } from '@test/fixtures/test-utils';

describe('Bootstrap entrypoints', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.PORT;
  });

  it('bootstraps api app with default port', async () => {
    const useGlobalPipes = jest.fn();
    const listen = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({
      useGlobalPipes,
      listen,
    });

    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create },
    }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/main');
    });
    await waitForNextTick();

    expect(create.mock.calls).toHaveLength(1);
    expect(useGlobalPipes.mock.calls).toHaveLength(1);
    expect(listen).toHaveBeenCalledWith(3000);
  });

  it('bootstraps api app with explicit port', async () => {
    process.env.PORT = '4100';

    const useGlobalPipes = jest.fn();
    const listen = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({
      useGlobalPipes,
      listen,
    });

    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create },
    }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/main');
    });
    await waitForNextTick();

    expect(listen).toHaveBeenCalledWith(4100);
  });

  it('bootstraps worker application context', async () => {
    const createApplicationContext = jest.fn().mockResolvedValue(undefined);

    jest.doMock('@nestjs/core', () => ({
      NestFactory: { createApplicationContext },
    }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/worker');
    });
    await waitForNextTick();

    expect(createApplicationContext.mock.calls).toHaveLength(1);
  });
});
