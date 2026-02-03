import { AppModule } from '@/app.module';
import { BirthdayWorkerModule } from '@/birthday-worker/birthday-worker.module';
import { UsersModule } from '@/users/users.module';
import { WorkerAppModule } from '@/worker-app.module';

describe('Module wiring', () => {
  it('defines top-level modules', () => {
    expect(AppModule).toBeDefined();
    expect(WorkerAppModule).toBeDefined();
    expect(UsersModule).toBeDefined();
    expect(BirthdayWorkerModule).toBeDefined();
  });

  it('declares imports metadata', () => {
    const appImports = Reflect.getMetadata('imports', AppModule) as unknown[];
    const workerImports = Reflect.getMetadata(
      'imports',
      WorkerAppModule,
    ) as unknown[];

    expect(Array.isArray(appImports)).toBe(true);
    expect(Array.isArray(workerImports)).toBe(true);
    expect(appImports.length).toBeGreaterThan(0);
    expect(workerImports.length).toBeGreaterThan(0);
  });
});
