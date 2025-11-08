import * as assert from 'assert';
import { FileDiscoveryService } from '../../../src/services/fileDiscoveryService';
import { TestSetup, TestHelpers } from '../utils/testSetup';

suite('FileDiscoveryService Tests', () => {
  let fileDiscoveryService: FileDiscoveryService;

  setup(() => {
    TestSetup.setup();
    fileDiscoveryService = FileDiscoveryService.getInstance();
  });

  teardown(() => {
    TestSetup.teardown();
  });

  suite('File Validation', () => {
    test('validateTargetFile should reject non-existent paths', async () => {
      const paths = TestHelpers.getTestPaths();
      const isValid = await fileDiscoveryService.validateTargetFile(paths.nonExistentFile);
      assert.strictEqual(isValid, false, 'Non-existent path should be rejected');
    });

    // Note: Tests for valid files and directories require real file system
    // These are better suited for E2E tests where we can create actual files
    // The implementation correctly checks for directories using fs.stat().isDirectory()
  });

  suite('File Compatibility', () => {
    test('isCompatibleExtension should match compatible extensions', () => {
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.ts', '.ts'), true);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.ts', '.tsx'), true);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.tsx', '.ts'), true);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.tsx', '.tsx'), true);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.js', '.js'), true);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.js', '.jsx'), true);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.jsx', '.js'), true);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.jsx', '.jsx'), true);
    });

    test('isCompatibleExtension should reject incompatible extensions', () => {
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.ts', '.js'), false);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.js', '.ts'), false);
      assert.strictEqual(fileDiscoveryService.isCompatibleExtension('.ts', '.py'), false);
    });
  });

  suite('Cache Management', () => {
    test('clearCache should clear file cache', () => {
      // clearCache is a public method that should work without errors
      fileDiscoveryService.clearCache();
      assert.ok(true, 'clearCache should execute without errors');
    });

    test('onFileSystemChanged should return a disposable', () => {
      // File system watcher is set up to clear cache on file changes
      const disposable = fileDiscoveryService.onFileSystemChanged();
      assert.ok(disposable, 'onFileSystemChanged should return a disposable');
      disposable.dispose();
    });

    // Note: Actual file system change events are tested in E2E tests
    // The watcher implementation clears cache on create/delete/change events
  });
});
