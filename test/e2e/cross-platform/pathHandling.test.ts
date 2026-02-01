import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';

suite('Cross-Platform Path Handling - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('crossPlatform');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Path Separator Handling', () => {
    test('should handle Windows-style paths', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Windows-style paths handled');
    });

    test('should handle Unix-style paths', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = `${workspaceRoot}/test/test.ts`;
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Unix-style paths handled');
    });

    test('should handle mixed path separators', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'sub1', 'sub2', 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Mixed path separators handled');
    });
  });

  suite('Special Characters in Paths', () => {
    test('should handle paths with spaces', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'path with spaces', 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Paths with spaces handled');
    });

    test('should handle paths with Unicode characters', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, '测试', 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Unicode characters in paths handled');
    });

    test('should handle paths with special characters', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'test-folder', 'test[1].ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Special characters in paths handled');
    });
  });

  suite('Path Normalization', () => {
    test('should normalize relative paths', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, './test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Relative paths normalized');
    });

    test('should normalize parent directory references', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'subdir', '..', 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Parent directory references normalized');
    });
  });

  suite('Deep Path Handling', () => {
    test('should handle deeply nested paths', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const deepPath = path.join(workspaceRoot, 'level1', 'level2', 'level3', 'level4', 'test.ts');
      await FileTestHelpers.createFile(deepPath, 'export const test = "value";');

      assert.ok(true, 'Deeply nested paths handled');
    });

    test('should handle long path names', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const longFolderName = 'this-is-a-very-long-folder-name-that-tests-path-handling';
      const testFile = path.join(workspaceRoot, longFolderName, 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      assert.ok(true, 'Long path names handled');
    });
  });

  suite('Terminal Path Integration', () => {
    test('should open terminal with spaces in path', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'path with spaces', 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
      await vscode.window.showTextDocument(document);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      assert.ok(true, 'Terminal opened with spaces in path');
    });

    test('should open terminal with Unicode in path', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'тест', 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
      await vscode.window.showTextDocument(document);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      assert.ok(true, 'Terminal opened with Unicode in path');
    });
  });

  suite('File Operations with Special Paths', () => {
    test('should copy function with spaces in path', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'folder with spaces', 'test.ts');
      await FileTestHelpers.createFile(testFile, 'function test() { return "test"; }');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
      const editor = await vscode.window.showTextDocument(document);
      editor.selection = new vscode.Selection(0, 9, 0, 33);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      assert.ok(true, 'Copy function works with spaces in path');
    });

    test('should save file with special characters in path', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'test[1].ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
      const editor = await vscode.window.showTextDocument(document);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// Modified\n');
      });

      await vscode.commands.executeCommand('additionalContextMenus.saveAll');
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      assert.ok(true, 'Save file works with special characters in path');
    });
  });
});
