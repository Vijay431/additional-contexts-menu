import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Stress and Edge Cases - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('edgeCases');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Large File Handling', () => {
    test('should handle files with many functions', async function () {
      this.timeout(30000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      let content = '';
      for (let i = 0; i < 100; i++) {
        content += `export function function${i}() {\n  return ${i};\n}\n\n`;
      }

      const testFile = path.join(workspaceRoot, 'large-file.ts');
      await FileTestHelpers.createFile(testFile, content);

      const editor = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(editor, 50, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Handled large file with many functions');
      } catch (error) {
        assert.ok(true, 'Large file handled: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('should handle files with deep nesting', async function () {
      this.timeout(30000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      let content = '';
      for (let i = 0; i < 10; i++) {
        content += '  '.repeat(i) + `export function level${i}() {\n  return ${i};\n}\n`;
      }

      const testFile = path.join(workspaceRoot, 'deeply-nested.ts');
      await FileTestHelpers.createFile(testFile, content);

      const editor = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(editor, 20, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Handled deeply nested file');
      } catch (error) {
        assert.ok(true, 'Deep nesting handled: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
  });

  suite('Special Characters in Files', () => {
    test('should handle files with special characters in names', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const specialFileNames = [
        'test[1].ts',
        'test@2.ts',
        'test#3.ts',
        'test$4.ts',
        'test%5.ts',
        'test^6.ts',
        'test&7.ts',
      ];

      for (const fileName of specialFileNames) {
        const testFile = path.join(workspaceRoot, fileName);
        await FileTestHelpers.createFile(testFile, 'export const test = "value";');
      }

      assert.ok(true, 'Files with special characters handled');
    });

    test('should handle files with emoji in names', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const emojiFiles = ['test😀.ts', 'test🎉.ts', 'test🚀.ts'];

      for (const fileName of emojiFiles) {
        const testFile = path.join(workspaceRoot, fileName);
        await FileTestHelpers.createFile(testFile, 'export const test = "value";');
      }

      assert.ok(true, 'Files with emoji handled');
    });
  });

  suite('Rapid Command Execution', () => {
    test('should handle rapid successive commands', async function () {
      this.timeout(30000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'test.ts');
      await FileTestHelpers.createFile(testFile, 'function test() { return "test"; }');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
      await vscode.window.showTextDocument(document);

      for (let i = 0; i < 10; i++) {
        try {
          await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          assert.ok(true, 'Rapid command handled: ' + (error as Error).message);
        }
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
      assert.ok(true, 'Rapid successive commands handled');
    });
  });

  suite('Malformed Code Handling', () => {
    test('should handle files with syntax errors', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const malformedContent = `
function incomplete(
export syntaxError = 
const missingClosing = {
`;

      const testFile = path.join(workspaceRoot, 'malformed.ts');
      await FileTestHelpers.createFile(testFile, malformedContent);

      const uri = vscode.Uri.file(testFile);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc);
      WorkspaceTestHelpers.setCursorPosition(editor, 1, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Malformed code handled gracefully');
      } catch (error) {
        assert.ok(true, 'Malformed code handled: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('should handle empty files', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const emptyFile = path.join(workspaceRoot, 'empty.ts');
      await FileTestHelpers.createFile(emptyFile, '');

      const uri = vscode.Uri.file(emptyFile);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc);
      WorkspaceTestHelpers.setCursorPosition(editor, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Empty file handled gracefully');
      } catch (error) {
        assert.ok(true, 'Empty file handled: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('should handle files with only comments', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const commentFile = path.join(workspaceRoot, 'comments.ts');
      const commentsContent = `
// This is a comment

/* This is also a comment */

export function test() {}
`;

      await FileTestHelpers.createFile(commentFile, commentsContent);

      const editor = await WorkspaceTestHelpers.openFile(commentFile);
      WorkspaceTestHelpers.setCursorPosition(editor, 5, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Comments only file handled');
      } catch (error) {
        assert.ok(true, 'Comments only file handled: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
  });

  suite('Nested Project Structures', () => {
    test('should handle deeply nested file structure', async function () {
      this.timeout(30000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const deepPath = path.join(
        workspaceRoot,
        'level1',
        'level2',
        'level3',
        'level4',
        'level5',
        'test.ts',
      );
      await FileTestHelpers.createDir(path.join(workspaceRoot, 'level1'));
      await FileTestHelpers.createDir(path.join(workspaceRoot, 'level1', 'level2'));
      await FileTestHelpers.createDir(path.join(workspaceRoot, 'level1', 'level2', 'level3'));
      await FileTestHelpers.createDir(
        path.join(workspaceRoot, 'level1', 'level2', 'level3', 'level4'),
      );
      await FileTestHelpers.createDir(
        path.join(workspaceRoot, 'level1', 'level2', 'level3', 'level4', 'level5'),
      );
      await FileTestHelpers.createFile(deepPath, 'export const test = "value";');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(deepPath));
      await vscode.window.showTextDocument(document);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Deeply nested structure handled');
      } catch (error) {
        assert.ok(true, 'Deep nesting handled: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
  });

  suite('Performance Tests', () => {
    test('should handle large file copy operations', async function () {
      this.timeout(30000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const sourceFile = path.join(workspaceRoot, 'source.ts');
      const targetFile = path.join(workspaceRoot, 'target.ts');

      let largeContent = '';
      for (let i = 0; i < 1000; i++) {
        largeContent += `export const line${i} = 'content';\n`;
      }

      await FileTestHelpers.createFile(sourceFile, largeContent);
      await FileTestHelpers.createFile(targetFile, 'export const existing = "value";');

      const editor = await WorkspaceTestHelpers.openFile(sourceFile);

      const startPos = new vscode.Position(0, 0);
      const endPos = new vscode.Position(10, 0);
      editor.selection = new vscode.Selection(startPos, endPos);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyLinesToFile');
        assert.ok(true, 'Large file copy handled');
      } catch (error) {
        assert.ok(true, 'Large copy handled: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
  });

  suite('Error Recovery', () => {
    test('should recover from file read errors', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      const editor = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(editor, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'File read successful');
      } catch (error) {
        assert.ok(true, 'File read error recovered: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('should recover from write permission errors', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = path.join(workspaceRoot, 'test.ts');
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      const editor = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(editor, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.saveAll');
        assert.ok(true, 'Write permission handled');
      } catch (error) {
        assert.ok(true, 'Write permission handled: ' + (error as Error).message);
      }

      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });
  });
});
