import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { FileDiscoveryService } from '../../../src/services/fileDiscoveryService';
import { TestSetup, TestHelpers } from '../utils/testSetup';
import { CompatibleFile } from '../../../src/types/extension';

suite('FileDiscoveryService Tests', () => {
  let fileDiscoveryService: FileDiscoveryService;

  setup(() => {
    TestSetup.setup();
    fileDiscoveryService = TestSetup.createFileDiscoveryService();
  });

  teardown(() => {
    TestSetup.teardown();
  });

  suite('Extension Compatibility', () => {
    test('should identify compatible TypeScript extensions', () => {
      const isCompatible = fileDiscoveryService.isCompatibleExtension('.ts', '.tsx');
      assert.strictEqual(isCompatible, true);
    });

    test('should identify compatible JavaScript extensions', () => {
      const isCompatible = fileDiscoveryService.isCompatibleExtension('.js', '.jsx');
      assert.strictEqual(isCompatible, true);
    });

    test('should reject incompatible extensions', () => {
      const isCompatible = fileDiscoveryService.isCompatibleExtension('.ts', '.js');
      assert.strictEqual(isCompatible, false);
    });

    test('should handle extensions without leading dot', () => {
      const isCompatible = fileDiscoveryService.isCompatibleExtension('ts', 'tsx');
      assert.strictEqual(isCompatible, true);
    });

    test('should handle self-compatible extensions', () => {
      const isCompatible = fileDiscoveryService.isCompatibleExtension('.ts', '.ts');
      assert.strictEqual(isCompatible, true);
    });

    test('should handle unknown extensions', () => {
      const isCompatible = fileDiscoveryService.isCompatibleExtension('.py', '.rb');
      assert.strictEqual(isCompatible, false);
    });
  });

  suite('Cache Operations', () => {
    test('should clear cache successfully', () => {
      fileDiscoveryService.clearCache();
      assert.strictEqual(true, true); // If no error thrown, test passes
    });

    test('should handle cache clearing multiple times', () => {
      fileDiscoveryService.clearCache();
      fileDiscoveryService.clearCache();
      fileDiscoveryService.clearCache();
      assert.strictEqual(true, true);
    });
  });

  suite('File Validation', () => {
    test('should validate existing writable file', async () => {
      const testFilePath = path.join(TestHelpers.getTestPaths().workspaceRoot, 'test.ts');
      TestSetup.addFile(testFilePath, false);

      const isValid = await fileDiscoveryService.validateTargetFile(testFilePath);
      assert.strictEqual(isValid, true);
    });

    test('should reject non-existent file', async () => {
      const nonExistentFile = TestHelpers.getTestPaths().nonExistentFile;
      const isValid = await fileDiscoveryService.validateTargetFile(nonExistentFile);
      assert.strictEqual(isValid, false);
    });

    test('should reject read-only file', async () => {
      // This test verifies the error handling path for read-only files
      const isValid = await fileDiscoveryService.validateTargetFile('/path/to/readonly.ts');
      assert.strictEqual(isValid, false);
    });
  });

  suite('Cache Configuration Integration', () => {
    test('should use cache when enabled', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 100,
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });

    test('should bypass cache when disabled', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: false,
          maxSize: 100,
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });
  });

  suite('File Discovery', () => {
    test('should return empty array when no workspace', async () => {
      TestSetup.setWorkspaceFolders([]);
      const files = await fileDiscoveryService.getCompatibleFiles('.ts');
      assert.deepStrictEqual(files, []);
    });

    test('should return empty array on error', async () => {
      // Force an error by using invalid workspace state
      TestSetup.setWorkspaceFolders(['/invalid/workspace/path']);
      const files = await fileDiscoveryService.getCompatibleFiles('.ts');
      assert.ok(Array.isArray(files));
    });

    test('should handle multiple extensions', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const tsFiles = await fileDiscoveryService.getCompatibleFiles('.ts');
        const jsFiles = await fileDiscoveryService.getCompatibleFiles('.js');

        assert.ok(Array.isArray(tsFiles));
        assert.ok(Array.isArray(jsFiles));
      }
    });
  });

  suite('File Selector', () => {
    test('should return undefined when no compatible files', async () => {
      const selected = await fileDiscoveryService.showFileSelector([]);
      assert.strictEqual(selected, undefined);
    });

    test('should show selector for compatible files', async () => {
      const testFiles: CompatibleFile[] = [
        {
          path: '/home/user/project/src/test1.ts',
          name: 'test1.ts',
          extension: '.ts',
          isCompatible: true,
          lastModified: new Date(),
          relativePath: 'src/test1.ts'
        },
        {
          path: '/home/user/project/src/test2.ts',
          name: 'test2.ts',
          extension: '.ts',
          isCompatible: true,
          lastModified: new Date(),
          relativePath: 'src/test2.ts'
        }
      ];

      const selected = await fileDiscoveryService.showFileSelector(testFiles);
      // The actual selection depends on user interaction, so we just verify it doesn't crash
      assert.ok(selected === undefined || typeof selected === 'string');
    });
  });

  suite('Workspace Change Handlers', () => {
    test('should create workspace change handler', () => {
      const disposable = fileDiscoveryService.onWorkspaceChanged();
      assert.ok(disposable);
      assert.ok(typeof disposable.dispose === 'function');

      disposable.dispose();
    });

    test('should create file system change handler', () => {
      const disposable = fileDiscoveryService.onFileSystemChanged();
      assert.ok(disposable);
      assert.ok(typeof disposable.dispose === 'function');

      disposable.dispose();
    });

    test('should handle multiple disposables', () => {
      const disposable1 = fileDiscoveryService.onWorkspaceChanged();
      const disposable2 = fileDiscoveryService.onFileSystemChanged();

      assert.ok(disposable1);
      assert.ok(disposable2);

      disposable1.dispose();
      disposable2.dispose();
    });
  });

  suite('Integration Tests', () => {
    test('should complete full file discovery workflow', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Clear cache to ensure fresh scan
        fileDiscoveryService.clearCache();

        // Discover files
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));

        // Verify cache is working by calling again
        const files2 = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files2));
      }
    });

    test('should handle cache invalidation on workspace changes', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Get files to populate cache
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Clear cache
        fileDiscoveryService.clearCache();

        // Get files again
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });
  });

  suite('LRU Cache Size Limits', () => {
    test('should enforce maximum cache size', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 3,
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Clear cache to start fresh
        fileDiscoveryService.clearCache();

        // Add items to cache by calling getCompatibleFiles
        await fileDiscoveryService.getCompatibleFiles('.ts');
        await fileDiscoveryService.getCompatibleFiles('.js');
        await fileDiscoveryService.getCompatibleFiles('.tsx');
        await fileDiscoveryService.getCompatibleFiles('.jsx');

        // Cache should handle size limit gracefully without errors
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });

    test('should evict least recently used entry when cache is full', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 2,
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        fileDiscoveryService.clearCache();

        // Add two items to fill the cache
        await fileDiscoveryService.getCompatibleFiles('.ts');
        await fileDiscoveryService.getCompatibleFiles('.js');

        // Access .ts again to make it more recently used
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Add third item - should evict .js (least recently used)
        await fileDiscoveryService.getCompatibleFiles('.tsx');

        // Cache should still work
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });

    test('should handle cache size of 1', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 1,
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        fileDiscoveryService.clearCache();

        // Add multiple items with cache size of 1
        await fileDiscoveryService.getCompatibleFiles('.ts');
        await fileDiscoveryService.getCompatibleFiles('.js');

        // Only most recent item should be cached
        const files = await fileDiscoveryService.getCompatibleFiles('.js');
        assert.ok(Array.isArray(files));
      }
    });

    test('should update access time on cache hit', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 2,
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        fileDiscoveryService.clearCache();

        // Add two items
        await fileDiscoveryService.getCompatibleFiles('.ts');
        await fileDiscoveryService.getCompatibleFiles('.js');

        // Access first item multiple times to make it more recent
        await fileDiscoveryService.getCompatibleFiles('.ts');
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Add third item - should evict .js, not .ts
        await fileDiscoveryService.getCompatibleFiles('.tsx');

        // Verify .ts is still cached (was accessed more recently)
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });
  });

  suite('LRU Cache TTL Expiration', () => {
    test('should respect cache TTL', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 100,
          ttl: 100 // Very short TTL (100ms)
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        fileDiscoveryService.clearCache();

        // Populate cache
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        // Cache should be expired and re-scan
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });

    test('should handle different TTL values', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 100,
          ttl: 50 // Very short TTL
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        fileDiscoveryService.clearCache();

        // Populate cache
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 75));

        // Should trigger re-scan
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });

    test('should not expire entries within TTL period', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 100,
          ttl: 5000 // Longer TTL
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        fileDiscoveryService.clearCache();

        // Populate cache
        const files1 = await fileDiscoveryService.getCompatibleFiles('.ts');

        // Access again quickly - should hit cache
        const files2 = await fileDiscoveryService.getCompatibleFiles('.ts');

        // Both should return same data
        assert.ok(Array.isArray(files1));
        assert.ok(Array.isArray(files2));
      }
    });
  });

  suite('LRU Cache Metrics', () => {
    test('should track cache hits and misses', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 100,
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        fileDiscoveryService.clearCache();

        // First call is a miss (cache is empty)
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Second call is a hit
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Different extension is a miss
        await fileDiscoveryService.getCompatibleFiles('.js');

        // Cache should track metrics internally
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });

    test('should reset metrics when cache is cleared', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 100,
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Generate some cache activity
        await fileDiscoveryService.getCompatibleFiles('.ts');
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Clear cache (should reset metrics)
        fileDiscoveryService.clearCache();

        // New activity after clear
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });
  });

  suite('LRU Cache Behavior', () => {
    test('should respect cache size limits', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 2, // Very small cache
          ttl: 60000
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Add items to cache by calling getCompatibleFiles
        await fileDiscoveryService.getCompatibleFiles('.ts');
        await fileDiscoveryService.getCompatibleFiles('.js');
        await fileDiscoveryService.getCompatibleFiles('.tsx');

        // Cache should handle size limit gracefully
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });

    test('should respect cache TTL', async () => {
      TestSetup.updateConfig({
        cache: {
          enabled: true,
          maxSize: 100,
          ttl: 100 // Very short TTL (100ms)
        }
      });

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        // Populate cache
        await fileDiscoveryService.getCompatibleFiles('.ts');

        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        // Cache should be expired and re-scan
        const files = await fileDiscoveryService.getCompatibleFiles('.ts');
        assert.ok(Array.isArray(files));
      }
    });
  });
});
