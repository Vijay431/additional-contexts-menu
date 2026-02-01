import * as assert from 'assert';

import { E2ETestSetup } from './e2eTestSetup';

export abstract class ServiceTestBase {
  protected testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  public async setup(serviceName: string): Promise<void> {
    this.testContext = await E2ETestSetup.setup(serviceName);
    assert.ok(this.testContext.extension?.isActive, 'Extension should be active');
  }

  public async teardown(): Promise<void> {
    await E2ETestSetup.teardown();
  }

  public async resetConfig(): Promise<void> {
    await E2ETestSetup.resetConfig();
  }

  public abstract getServiceName(): string;
}
