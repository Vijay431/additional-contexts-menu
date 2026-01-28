import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

/**
 * Temporary Verification Test for Redis Cache Service
 *
 * This test verifies that the RedisCacheService:
 * 1. Is properly importable and can be instantiated
 * 2. Has the correct interface and methods
 * 3. Can perform basic cache operations (set, get, delete)
 * 4. Supports TTL management
 * 5. Supports multi-get operations
 * 6. Supports cache invalidation by tags and patterns
 * 7. Provides accurate statistics
 * 8. Cache decorators work correctly
 */
suite('Redis Cache Service - Verification Test', () => {
  let tempWorkspace: string;
  let extension: vscode.Extension<any>;

  suiteSetup(async () => {
    // Get and activate extension
    extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus')!;
    assert.ok(extension, 'Extension should be found');

    if (!extension.isActive) {
      await extension.activate();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    assert.strictEqual(extension.isActive, true, 'Extension should be active');

    // Create temporary workspace
    tempWorkspace = path.join(__dirname, '../temp-workspace-redis');
    await fs.mkdir(tempWorkspace, { recursive: true });
  });

  suiteTeardown(async () => {
    // Clean up
    try {
      await fs.rmdir(tempWorkspace, { recursive: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('RedisCacheService should be importable', async () => {
    // Try to import the service
    const { RedisCacheService } = await import('../../src/services/redisCacheService');

    assert.ok(RedisCacheService, 'RedisCacheService should be defined');
    assert.strictEqual(typeof RedisCacheService.getInstance, 'function', 'getInstance should be a function');
  });

  test('RedisCacheService should have correct interface', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    // Check that service has required methods
    assert.ok(service, 'Service instance should be created');
    assert.strictEqual(typeof service.initialize, 'function', 'initialize method should exist');
    assert.strictEqual(typeof service.generateKey, 'function', 'generateKey method should exist');
    assert.strictEqual(typeof service.set, 'function', 'set method should exist');
    assert.strictEqual(typeof service.get, 'function', 'get method should exist');
    assert.strictEqual(typeof service.delete, 'function', 'delete method should exist');
    assert.strictEqual(typeof service.clear, 'function', 'clear method should exist');
    assert.strictEqual(typeof service.has, 'function', 'has method should exist');
    assert.strictEqual(typeof service.mget, 'function', 'mget method should exist');
    assert.strictEqual(typeof service.mset, 'function', 'mset method should exist');
    assert.strictEqual(typeof service.invalidate, 'function', 'invalidate method should exist');
    assert.strictEqual(typeof service.getStats, 'function', 'getStats method should exist');
    assert.strictEqual(typeof service.cleanup, 'function', 'cleanup method should exist');
    assert.strictEqual(typeof service.dispose, 'function', 'dispose method should exist');
  });

  test('RedisCacheService should export decorators', async () => {
    const module = await import('../../src/services/redisCacheService');

    // Check that decorators are exported
    assert.ok(module.Cacheable, 'Cacheable decorator should be exported');
    assert.ok(module.CacheInvalidate, 'CacheInvalidate decorator should be exported');
  });

  test('RedisCacheService should initialize correctly', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Service should be initialized
    assert.ok(service, 'Service should be initialized');
  });

  test('RedisCacheService should generate keys with prefix', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    const key = service.generateKey('test-key');
    assert.ok(key.includes('vscode-ctx'), 'Key should include prefix');
    assert.ok(key.includes('test-key'), 'Key should include original key');
  });

  test('RedisCacheService should set and get values', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Set a value
    const setResult = await service.set('test-key', { value: 'test-data' });
    assert.strictEqual(setResult.success, true, 'Set operation should succeed');

    // Get the value
    const getResult = await service.get('test-key');
    assert.strictEqual(getResult.success, true, 'Get operation should succeed');
    assert.deepStrictEqual(getResult.value, { value: 'test-data' }, 'Retrieved value should match');
  });

  test('RedisCacheService should handle TTL expiration', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Set a value with short TTL (1 second)
    const setResult = await service.set('expiring-key', { value: 'test' }, 1);
    assert.strictEqual(setResult.success, true, 'Set operation should succeed');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Try to get expired value
    const getResult = await service.get('expiring-key');
    assert.strictEqual(getResult.success, false, 'Get operation should fail for expired key');
  });

  test('RedisCacheService should delete values', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Set a value
    await service.set('delete-test', { value: 'test' });

    // Delete it
    const deleteResult = await service.delete('delete-test');
    assert.strictEqual(deleteResult.success, true, 'Delete operation should succeed');

    // Verify it's gone
    const getResult = await service.get('delete-test');
    assert.strictEqual(getResult.success, false, 'Get operation should fail after delete');
  });

  test('RedisCacheService should check if key exists', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Check non-existent key
    const hasBefore = await service.has('non-existent');
    assert.strictEqual(hasBefore, false, 'has should return false for non-existent key');

    // Set a value
    await service.set('exists-test', { value: 'test' });

    // Check existing key
    const hasAfter = await service.has('exists-test');
    assert.strictEqual(hasAfter, true, 'has should return true for existing key');
  });

  test('RedisCacheService should support multi-get operations', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Set multiple values
    await service.set('key1', { value: 'value1' });
    await service.set('key2', { value: 'value2' });
    await service.set('key3', { value: 'value3' });

    // Get multiple values
    const results = await service.mget(['key1', 'key2', 'key3', 'key4']);

    assert.strictEqual(results.length, 4, 'Should return 4 results');
    assert.strictEqual(results[0]?.success, true, 'key1 should be found');
    assert.strictEqual(results[1]?.success, true, 'key2 should be found');
    assert.strictEqual(results[2]?.success, true, 'key3 should be found');
    assert.strictEqual(results[3]?.success, false, 'key4 should not be found');
  });

  test('RedisCacheService should support multi-set operations', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Set multiple values
    const entries = [
      { key: 'mset-key1', value: { data: 'value1' } },
      { key: 'mset-key2', value: { data: 'value2' } },
      { key: 'mset-key3', value: { data: 'value3' } },
    ];

    const results = await service.mset(entries);

    assert.strictEqual(results.length, 3, 'Should return 3 results');
    assert.strictEqual(results[0]?.success, true, 'First set should succeed');
    assert.strictEqual(results[1]?.success, true, 'Second set should succeed');
    assert.strictEqual(results[2]?.success, true, 'Third set should succeed');

    // Verify values
    const get1 = await service.get('mset-key1');
    const get2 = await service.get('mset-key2');
    const get3 = await service.get('mset-key3');

    assert.strictEqual(get1.success, true, 'First value should be retrievable');
    assert.strictEqual(get2.success, true, 'Second value should be retrievable');
    assert.strictEqual(get3.success, true, 'Third value should be retrievable');
  });

  test('RedisCacheService should support tag-based invalidation', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Set values with tags
    await service.set('tagged-key1', { value: 'value1' }, 3600, ['user-data']);
    await service.set('tagged-key2', { value: 'value2' }, 3600, ['user-data']);
    await service.set('tagged-key3', { value: 'value3' }, 3600, ['other-data']);

    // Invalidate by tag
    const invalidateResult = await service.invalidate({ byTag: ['user-data'] });
    assert.strictEqual(invalidateResult.success, true, 'Invalidation should succeed');

    // Verify tagged keys are gone
    const get1 = await service.get('tagged-key1');
    const get2 = await service.get('tagged-key2');
    const get3 = await service.get('tagged-key3');

    assert.strictEqual(get1.success, false, 'First tagged key should be invalidated');
    assert.strictEqual(get2.success, false, 'Second tagged key should be invalidated');
    assert.strictEqual(get3.success, true, 'Untagged key should still exist');
  });

  test('RedisCacheService should provide accurate statistics', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Clear cache first
    await service.clear();

    // Set some values
    await service.set('stats-key1', { value: 'value1' });
    await service.set('stats-key2', { value: 'value2' });

    // Get some values
    await service.get('stats-key1'); // Hit
    await service.get('stats-key2'); // Hit
    await service.get('non-existent'); // Miss

    const stats = await service.getStats();

    assert.strictEqual(stats.totalKeys, 2, 'Should have 2 keys');
    assert.ok(stats.memoryUsage > 0, 'Memory usage should be greater than 0');
    assert.strictEqual(stats.hitRate, 2 / 3, 'Hit rate should be 2/3');
    assert.ok(stats.operationsCount > 0, 'Operations count should be greater than 0');
  });

  test('RedisCacheService should support cache clearing', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Set some values
    await service.set('clear-key1', { value: 'value1' });
    await service.set('clear-key2', { value: 'value2' });

    // Clear cache
    const clearResult = await service.clear();
    assert.strictEqual(clearResult.success, true, 'Clear operation should succeed');

    // Verify cache is empty
    const stats = await service.getStats();
    assert.strictEqual(stats.totalKeys, 0, 'Cache should be empty');
  });

  test('RedisCacheService should support cleanup of expired entries', async () => {
    const { RedisCacheService } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();

    // Set values with short TTL
    await service.set('cleanup-key1', { value: 'value1' }, 1);
    await service.set('cleanup-key2', { value: 'value2' }, 1);
    await service.set('cleanup-key3', { value: 'value3' }, 3600);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Run cleanup
    const cleanedCount = await service.cleanup();
    assert.ok(cleanedCount >= 2, 'Should clean at least 2 expired entries');

    // Verify only valid entry remains
    const stats = await service.getStats();
    assert.strictEqual(stats.totalKeys, 1, 'Only 1 key should remain');
  });

  test('Cacheable decorator should cache method results', async () => {
    const { RedisCacheService, Cacheable } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();
    await service.clear();

    // Create a test class with cached method
    class TestService {
      private callCount = 0;

      @Cacheable({ keyPrefix: 'test', ttl: 3600 })
      async expensiveOperation(arg: string): Promise<{ result: string; count: number }> {
        this.callCount++;
        return { result: `processed-${arg}`, count: this.callCount };
      }

      getCallCount(): number {
        return this.callCount;
      }
    }

    const testService = new TestService();

    // First call - should execute
    const result1 = await testService.expensiveOperation('test');
    assert.strictEqual(result1.count, 1, 'Method should execute on first call');
    assert.strictEqual(testService.getCallCount(), 1, 'Call count should be 1');

    // Second call - should use cache
    const result2 = await testService.expensiveOperation('test');
    assert.strictEqual(result2.count, 1, 'Method should not execute again');
    assert.strictEqual(testService.getCallCount(), 1, 'Call count should still be 1');
  });

  test('CacheInvalidate decorator should invalidate cache', async () => {
    const { RedisCacheService, Cacheable, CacheInvalidate } = await import('../../src/services/redisCacheService');
    const service = RedisCacheService.getInstance();

    await service.initialize();
    await service.clear();

    // Create a test class with cache invalidation
    class TestService {
      private data = { value: 'initial' };

      @Cacheable({ keyPrefix: 'data', ttl: 3600, tags: ['data-cache'] })
      async getData(): Promise<{ value: string }> {
        return { ...this.data };
      }

      @CacheInvalidate({ byTag: ['data-cache'] })
      async updateData(newValue: string): Promise<void> {
        this.data.value = newValue;
      }
    }

    const testService = new TestService();

    // Get initial data
    const result1 = await testService.getData();
    assert.strictEqual(result1.value, 'initial', 'Should return initial value');

    // Update data (this invalidates cache)
    await testService.updateData('updated');

    // Get updated data
    const result2 = await testService.getData();
    assert.strictEqual(result2.value, 'updated', 'Should return updated value');
  });
});
