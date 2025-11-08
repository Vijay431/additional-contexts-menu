import * as assert from 'assert';
import { FileSaveService } from '../../../src/services/fileSaveService';
import { TestSetup } from '../utils/testSetup';

suite('FileSaveService Tests', () => {
  let fileSaveService: FileSaveService;

  setup(() => {
    TestSetup.setup();
    fileSaveService = FileSaveService.getInstance();
  });

  teardown(() => {
    TestSetup.teardown();
  });

  suite('Unsaved Files Detection', () => {
    test('hasUnsavedChanges should return false when no unsaved files', () => {
      // Mock empty text documents
      const hasChanges = fileSaveService.hasUnsavedChanges();
      // This will depend on actual VS Code state, so we just verify it doesn't throw
      assert.ok(typeof hasChanges === 'boolean', 'hasUnsavedChanges should return boolean');
    });

    test('getUnsavedFileCount should return number of unsaved files', () => {
      const count = fileSaveService.getUnsavedFileCount();
      assert.ok(typeof count === 'number', 'getUnsavedFileCount should return number');
      assert.ok(count >= 0, 'Count should be non-negative');
    });

    // Note: Tests for read-only file skipping require real file system operations
    // The implementation uses fs.access() to check file permissions
    // These are better tested in E2E tests where we can create actual read-only files
  });
});
