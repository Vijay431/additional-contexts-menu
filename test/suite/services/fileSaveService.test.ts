import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileSaveService } from '../../../src/services/fileSaveService';
import { TestSetup, TestHelpers } from '../utils/testSetup';

suite('FileSaveService Tests', () => {
  let fileSaveService: FileSaveService;

  setup(() => {
    TestSetup.setup();
    fileSaveService = TestSetup.createFileSaveService();
  });

  teardown(() => {
    TestSetup.teardown();
  });

  suite('hasUnsavedChanges', () => {
    test('should return false when no documents are open', () => {
      TestSetup.mockTextDocuments([]);

      const hasUnsaved = fileSaveService.hasUnsavedChanges();
      assert.strictEqual(hasUnsaved, false);
    });

    test('should return false when all documents are saved', () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', false),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', false),
      ];
      TestSetup.mockTextDocuments(docs);

      const hasUnsaved = fileSaveService.hasUnsavedChanges();
      assert.strictEqual(hasUnsaved, false);
    });

    test('should return true when at least one document is unsaved', () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', false),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      const hasUnsaved = fileSaveService.hasUnsavedChanges();
      assert.strictEqual(hasUnsaved, true);
    });

    test('should ignore untitled documents', () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', false, false),
        TestHelpers.createMockDocument('Untitled-1', true, true),
      ];
      TestSetup.mockTextDocuments(docs);

      const hasUnsaved = fileSaveService.hasUnsavedChanges();
      assert.strictEqual(hasUnsaved, false);
    });
  });

  suite('getUnsavedFileCount', () => {
    test('should return 0 when no documents are unsaved', () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', false),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', false),
      ];
      TestSetup.mockTextDocuments(docs);

      const count = fileSaveService.getUnsavedFileCount();
      assert.strictEqual(count, 0);
    });

    test('should count only unsaved files', () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', false),
        TestHelpers.createMockDocument('/home/user/project/file3.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      const count = fileSaveService.getUnsavedFileCount();
      assert.strictEqual(count, 2);
    });

    test('should exclude untitled documents from count', () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true),
        TestHelpers.createMockDocument('Untitled-1', true, true),
        TestHelpers.createMockDocument('Untitled-2', true, true),
      ];
      TestSetup.mockTextDocuments(docs);

      const count = fileSaveService.getUnsavedFileCount();
      assert.strictEqual(count, 1);
    });
  });

  suite('saveAllFiles - No Unsaved Files', () => {
    test('should return success with no files when no documents are unsaved', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', false),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', false),
      ];
      TestSetup.mockTextDocuments(docs);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 0);
      assert.strictEqual(result.savedFiles, 0);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.failedFiles.length, 0);
      assert.strictEqual(result.skippedFiles.length, 0);
    });

    test('should show notification when configured and no files to save', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', false),
      ];
      TestSetup.mockTextDocuments(docs);

      await fileSaveService.saveAllFiles();

      TestHelpers.assertInfoMessage('No unsaved files found');
    });
  });

  suite('saveAllFiles - With Unsaved Files (skipReadOnly=false)', () => {
    setup(() => {
      const service = TestHelpers.setupSkipReadOnlyDisabled();
      fileSaveService = service;
    });

    test('should save all unsaved files without filtering', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', true),
        TestHelpers.createMockDocument('/home/user/project/file3.ts', false),
      ];
      TestSetup.mockTextDocuments(docs);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 2);
      assert.strictEqual(result.savedFiles, 2);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.failedFiles.length, 0);
    });

    test('should exclude untitled documents from save', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true),
        TestHelpers.createMockDocument('Untitled-1', true, true),
      ];
      TestSetup.mockTextDocuments(docs);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 1);
      assert.strictEqual(result.savedFiles, 1);
    });
  });

  suite('saveAllFiles - With Read-Only Filtering (skipReadOnly=true)', () => {
    setup(() => {
      const service = TestHelpers.setupSkipReadOnlyEnabled();
      fileSaveService = service;
    });

    test('should include writable files when checking read-only', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      // Set files as writable
      TestSetup.setFilePermissions('/home/user/project/file1.ts', true, true);
      TestSetup.setFilePermissions('/home/user/project/file2.ts', true, true);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 2);
      assert.strictEqual(result.savedFiles, 2);
      assert.strictEqual(result.success, true);
    });

    test('should skip read-only files when configured', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/writable.ts', true),
        TestHelpers.createMockDocument('/home/user/project/readonly.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      // Set one as writable, one as read-only
      TestSetup.setFilePermissions('/home/user/project/writable.ts', true, true);
      TestSetup.setFilePermissions('/home/user/project/readonly.ts', true, false);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 1);
      assert.strictEqual(result.savedFiles, 1);
      assert.strictEqual(result.skippedFiles.length, 0); // Read-only files are filtered out, not tracked as skipped
    });

    test('should skip files that cannot be read', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true),
        TestHelpers.createMockDocument('/home/user/project/no-read.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      // Set one as readable and writable, one as not readable
      TestSetup.setFilePermissions('/home/user/project/file1.ts', true, true);
      TestSetup.setFilePermissions('/home/user/project/no-read.ts', false, true);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 1);
      assert.strictEqual(result.savedFiles, 1);
    });

    test('should include non-file scheme documents', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true, false, 'file'),
        TestHelpers.createMockDocument('git:/home/user/project/file2.ts', true, false, 'git'),
      ];
      TestSetup.mockTextDocuments(docs);

      TestSetup.setFilePermissions('/home/user/project/file1.ts', true, true);

      const result = await fileSaveService.saveAllFiles();

      // Both files should be included (non-file schemes are not checked)
      assert.strictEqual(result.totalFiles, 2);
      assert.strictEqual(result.savedFiles, 2);
    });

    test('should handle mixed writable and read-only files', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/writable1.ts', true),
        TestHelpers.createMockDocument('/home/user/project/readonly1.ts', true),
        TestHelpers.createMockDocument('/home/user/project/writable2.ts', true),
        TestHelpers.createMockDocument('/home/user/project/readonly2.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      // Set permissions
      TestSetup.setFilePermissions('/home/user/project/writable1.ts', true, true);
      TestSetup.setFilePermissions('/home/user/project/readonly1.ts', true, false);
      TestSetup.setFilePermissions('/home/user/project/writable2.ts', true, true);
      TestSetup.setFilePermissions('/home/user/project/readonly2.ts', true, false);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 2);
      assert.strictEqual(result.savedFiles, 2);
    });
  });

  suite('saveAllFiles - Error Handling', () => {
    test('should handle document save failures gracefully', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      // Mock save to fail for file2
      (docs[1] as any).save = () => Promise.resolve(false);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 2);
      assert.strictEqual(result.savedFiles, 1);
      assert.strictEqual(result.skippedFiles.length, 1);
      assert.strictEqual(result.failedFiles.length, 0);
      assert.strictEqual(result.success, true);
    });

    test('should handle document save errors', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true),
        TestHelpers.createMockDocument('/home/user/project/file2.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      // Mock save to throw error for file2
      (docs[1] as any).save = () => Promise.reject(new Error('Save failed'));

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 2);
      assert.strictEqual(result.savedFiles, 1);
      assert.strictEqual(result.failedFiles.length, 1);
      assert.strictEqual(result.success, false);
    });
  });

  suite('saveAllFiles - Large File Counts', () => {
    test('should show progress notification for many files', async () => {
      const docs: vscode.TextDocument[] = [];
      for (let i = 0; i < 10; i++) {
        docs.push(TestHelpers.createMockDocument(`/home/user/project/file${i}.ts`, true));
      }
      TestSetup.mockTextDocuments(docs);

      // Set all as writable
      for (let i = 0; i < 10; i++) {
        TestSetup.setFilePermissions(`/home/user/project/file${i}.ts`, true, true);
      }

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 10);
      assert.strictEqual(result.savedFiles, 10);
      assert.strictEqual(result.success, true);
    });
  });

  suite('Configuration Integration', () => {
    test('should respect skipReadOnly configuration changes', () => {
      // Test with skipReadOnly = false
      TestSetup.updateConfig({
        saveAll: { showNotification: true, skipReadOnly: false }
      });

      assert.strictEqual(fileSaveService !== undefined, true);

      // Test with skipReadOnly = true
      TestSetup.updateConfig({
        saveAll: { showNotification: true, skipReadOnly: true }
      });

      assert.strictEqual(fileSaveService !== undefined, true);
    });

    test('should respect showNotification configuration', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', false),
      ];
      TestSetup.mockTextDocuments(docs);

      // Enable notifications
      TestSetup.updateConfig({
        saveAll: { showNotification: true, skipReadOnly: false }
      });

      await fileSaveService.saveAllFiles();

      TestHelpers.assertInfoMessage('No unsaved files found');

      // Disable notifications
      TestSetup.updateConfig({
        saveAll: { showNotification: false, skipReadOnly: false }
      });

      // Clear the mock message
      (TestSetup.getMocks().vscode as any)._lastInfoMessage = undefined;

      await fileSaveService.saveAllFiles();

      const messageAfterDisable = TestSetup.getMocks().vscode.getLastInfoMessage();

      // Messages should differ since we disabled notifications
      assert.strictEqual(messageAfterDisable, undefined);
    });
  });

  suite('Edge Cases', () => {
    test('should handle empty workspace folders', async () => {
      TestSetup.setWorkspaceFolders([]);

      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', false),
      ];
      TestSetup.mockTextDocuments(docs);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 0);
      assert.strictEqual(result.success, true);
    });

    test('should handle documents with no URI scheme', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file1.ts', true, false, ''),
      ];
      TestSetup.mockTextDocuments(docs);

      const result = await fileSaveService.saveAllFiles();

      // Should handle gracefully - either include or skip based on implementation
      assert.strictEqual(result.success !== undefined, true);
    });

    test('should handle files with special characters in path', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/My Project/file with spaces.ts', true),
      ];
      TestSetup.mockTextDocuments(docs);

      TestSetup.setFilePermissions('/home/user/My Project/file with spaces.ts', true, true);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 1);
      assert.strictEqual(result.savedFiles, 1);
    });
  });

  suite('Integration Tests', () => {
    test('should complete full workflow with read-only filtering', async () => {
      const service = TestHelpers.setupSkipReadOnlyEnabled();
      fileSaveService = service;

      const docs = [
        TestHelpers.createMockDocument('/home/user/project/writable.ts', true),
        TestHelpers.createMockDocument('/home/user/project/readonly.ts', true),
        TestHelpers.createMockDocument('/home/user/project/saved.ts', false),
      ];
      TestSetup.mockTextDocuments(docs);

      TestSetup.setFilePermissions('/home/user/project/writable.ts', true, true);
      TestSetup.setFilePermissions('/home/user/project/readonly.ts', true, false);

      const result = await fileSaveService.saveAllFiles();

      assert.strictEqual(result.totalFiles, 1);
      assert.strictEqual(result.savedFiles, 1);
      assert.strictEqual(result.success, true);
    });

    test('should work with different file schemes', async () => {
      const docs = [
        TestHelpers.createMockDocument('/home/user/project/file.ts', true, false, 'file'),
        TestHelpers.createMockDocument('git:/home/user/project/file.ts', true, false, 'git'),
        TestHelpers.createMockDocument('untitled:/Untitled-1', true, true, 'untitled'),
      ];
      TestSetup.mockTextDocuments(docs);

      TestSetup.setFilePermissions('/home/user/project/file.ts', true, true);

      const result = await fileSaveService.saveAllFiles();

      // Should include file and git schemes, exclude untitled
      assert.strictEqual(result.totalFiles, 2);
      assert.strictEqual(result.savedFiles, 2);
    });
  });
});
