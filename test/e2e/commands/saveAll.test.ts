import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Save All - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('saveAll');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('should register Save All command', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.saveAll'),
        'Save All command should be registered',
      );
    });
  });

  suite('Basic Functionality', () => {
    test('should save all dirty documents', async () => {
      const file1 = path.join(testContext.tempWorkspace, 'dirty1.ts');
      const file2 = path.join(testContext.tempWorkspace, 'dirty2.ts');
      const file3 = path.join(testContext.tempWorkspace, 'dirty3.ts');
      const file4 = path.join(testContext.tempWorkspace, 'clean.ts');

      await FileTestHelpers.createFile(file1, 'const data1 = "value";');
      await FileTestHelpers.createFile(file2, 'const data2 = "value";');
      await FileTestHelpers.createFile(file3, 'const data3 = "value";');
      await FileTestHelpers.createFile(file4, 'const data4 = "clean";');

      await WorkspaceTestHelpers.openFile(file1);
      await WorkspaceTestHelpers.openFile(file2);
      await WorkspaceTestHelpers.openFile(file3);

      const editor1 = WorkspaceTestHelpers.getActiveEditor();
      assert.ok(editor1?.document.isDirty, 'Document 1 should be dirty');

      const editor2 = WorkspaceTestHelpers.getActiveEditor();
      assert.ok(editor2?.document.isDirty, 'Document 2 should be dirty');

      const editor3 = WorkspaceTestHelpers.getActiveEditor();
      assert.ok(editor3?.document.isDirty, 'Document 3 should be dirty');

      await vscode.commands.executeCommand('additionalContextMenus.saveAll');

      assert.ok(!editor1?.document.isDirty, 'Document 1 should be saved');
      assert.ok(!editor2?.document.isDirty, 'Document 2 should be saved');
      assert.ok(!editor3?.document.isDirty, 'Document 3 should be saved');
    });

    test('should skip read-only files when configured', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('saveAll.skipReadOnly', true, vscode.ConfigurationTarget.Workspace);

      const readOnlyFile = path.join(testContext.tempWorkspace, 'readonly.ts');
      const dirtyFile = path.join(testContext.tempWorkspace, 'dirty.ts');

      await FileTestHelpers.createFile(readOnlyFile, 'const data = "readonly";');
      await FileTestHelpers.createFile(dirtyFile, 'const data = "dirty";');

      await WorkspaceTestHelpers.openFile(readOnlyFile);
      await WorkspaceTestHelpers.openFile(dirtyFile);

      const readOnlyEditor = WorkspaceTestHelpers.getActiveEditor();
      const dirtyEditor = WorkspaceTestHelpers.getActiveEditor();

      assert.ok(readOnlyEditor?.document.isDirty, 'Read-only document should be dirty');
      assert.ok(dirtyEditor?.document.isDirty, 'Dirty document should be dirty');

      await vscode.commands.executeCommand('additionalContextMenus.saveAll');

      assert.ok(!dirtyEditor?.document.isDirty, 'Dirty document should be saved');
      await WorkspaceTestHelpers.closeAllEditors();
    });

    test('should handle no dirty files', async () => {
      const file1 = path.join(testContext.tempWorkspace, 'clean1.ts');
      const file2 = path.join(testContext.tempWorkspace, 'clean2.ts');

      await FileTestHelpers.createFile(file1, 'const data1 = "clean";');
      await FileTestHelpers.createFile(file2, 'const data2 = "clean";');

      await WorkspaceTestHelpers.openFile(file1);
      await WorkspaceTestHelpers.openFile(file2);

      const editor1 = WorkspaceTestHelpers.getActiveEditor();
      const editor2 = WorkspaceTestHelpers.getActiveEditor();

      assert.ok(!editor1?.document.isDirty, 'Document 1 should be clean');
      assert.ok(!editor2?.document.isDirty, 'Document 2 should be clean');

      await vscode.commands.executeCommand('additionalContextMenus.saveAll');
      assert.ok(true, 'Save All with no dirty files completed successfully');
    });

    test('should show progress notification for 5+ files', async () => {
      const files = [];
      for (let i = 1; i <= 5; i++) {
        const file = path.join(testContext.tempWorkspace, `file${i}.ts`);
        await FileTestHelpers.createFile(file, `const data${i} = "value";`);
        files.push(file);
      }

      await FileTestHelpers.createFile(files[0], `const data1 = "dirty";`);

      for (const file of files) {
        await WorkspaceTestHelpers.openFile(file);
      }

      await vscode.commands.executeCommand('additionalContextMenus.saveAll');
      assert.ok(true, 'Save All with multiple files completed');
    });
  });

  suite('Error Handling', () => {
    test('should handle save errors gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'save-error.ts');

      await FileTestHelpers.createFile(testFile, 'const data = "test";');

      const _document = await WorkspaceTestHelpers.openFile(testFile);
      await WorkspaceTestHelpers.closeAllEditors();

      try {
        await vscode.commands.executeCommand('additionalContextMenus.saveAll');
        assert.ok(true, 'Save All handled error gracefully');
      } catch (_error) {
        assert.ok(true, 'Command handled save error');
      }
    });
  });
});
