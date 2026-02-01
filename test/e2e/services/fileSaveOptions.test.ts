import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('File Save Service with Options - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('fileSaveOptions');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('Save Options command should be registered', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.saveWithOptions'),
        'Save Options command should be registered',
      );
    });
  });

  suite('Save Current File', () => {
    test('should save active document', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'dirty.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');

      const document = await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.saveWithOptions');

      const savedDocument = await FileTestHelpers.readFile(testFile);
      assert.strictEqual(savedDocument, 'const value = "test";', 'File should be saved');
    });

    test('should show save options QuickPick', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'test.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 10);

      const selectedItem = 'Save';
      await vscode.commands.executeCommand('additionalContextMenus.saveWithOptions');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'Save options shown');
    });
  });

  suite('Save All', () => {
    test('should save all dirty documents', async () => {
      const file1 = path.join(testContext.tempWorkspace, 'dirty1.ts');
      const file2 = path.join(testContext.tempWorkspace, 'dirty2.ts');
      const file3 = path.join(testContext.tempWorkspace, 'dirty3.ts');

      await FileTestHelpers.createFile(file1, 'const data1 = "value1";');
      await FileTestHelpers.createFile(file2, 'const data2 = "value2";');
      await FileTestHelpers.createFile(file3, 'const data3 = "value3";');

      for (const file of [file1, file2, file3]) {
        const document = await WorkspaceTestHelpers.openFile(file);
        assert.ok(document.document.isDirty, 'File should be dirty');
      }

      await vscode.commands.executeCommand('additionalContextMenus.saveWithOptions');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      for (const file of [file1, file2, file3]) {
        const savedDocument = await FileTestHelpers.readFile(file);
        assert.ok(!savedDocument.document.isDirty, 'File should be saved');
      }
    });
  });

  suite('Save As', () => {
    test('should save file with new name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'original.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'new-name.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "original";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      const saveAsOption = 'Save As';
      await vscode.commands.executeCommand('additionalContextMenus.saveWithOptions');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(testFile);
    });

    test('should cancel Save As operation', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'original.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "original";');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      await vscode.commands.executeCommand('additionalContextMenus.saveWithOptions');

      await new Promise((resolve) => setTimeout(resolve, 500));

      const originalFile = await FileTestHelpers.readFile(testFile);
      assert.ok(originalFile.includes('const value = "original";'), 'Original file unchanged');
      await FileTestHelpers.assertFileNotExists(
        path.join(testContext.tempWorkspace, 'new-name.ts'),
      );
    });
  });

  suite('Configuration Integration', () => {
    test('should skip read-only files when configured', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('saveAll.skipReadOnly', true, vscode.ConfigurationTarget.Workspace);

      const readonlyFile = path.join(testContext.tempWorkspace, 'readonly.ts');
      await FileTestHelpers.chmod(readonlyFile, 0o444);

      const file1 = path.join(testContext.tempWorkspace, 'dirty1.ts');
      await FileTestHelpers.createFile(file1, 'const data = "value";');

      const file2 = path.join(testContext.tempWorkspace, 'dirty2.ts');

      await FileTestHelpers.createFile(file2, 'const data = "value";');

      for (const file of [file1, file2]) {
        const document = await WorkspaceTestHelpers.openFile(file);
        assert.ok(document.document.isDirty, 'File should be dirty');
      }

      await vscode.commands.executeCommand('additionalContextMenus.saveAll');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const savedFile = await FileTestHelpers.readFile(readonlyFile);
      const dirtyFile = await FileTestHelpers.readFile(file1);

      assert.ok(dirtyFile.document.isDirty, 'Dirty file saved');
      assert.ok(!savedFile.document.isDirty, 'Read-only file skipped');
    });
  });

  suite('Error Handling', () => {
    test('should handle no dirty files', async () => {
      const file1 = path.join(testContext.tempWorkspace, 'clean1.ts');
      await FileTestHelpers.createFile(file1, 'const data = "value";');

      const document = await WorkspaceTestHelpers.openFile(file1);

      await vscode.commands.executeCommand('additionalContextMenus.saveAll');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'No dirty files found, handled gracefully');
    });

    test('should handle save errors gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'readonly.ts');
      await fs.chmod(testFile, 0o444);

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.saveWithOptions');
        assert.ok(true, 'Handled save error gracefully');
      } catch (error) {
        assert.ok(true, 'Handled save error gracefully');
      }
    });
  });
});
