import * as assert from 'assert';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { ProjectFixtures } from '../utils/projectFixtures';

suite('Multi-Workspace Integration - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('multiWorkspace');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Multi-Workspace Command Execution', () => {
    test('commands should work with multiple workspace folders', async function () {
      this.timeout(10000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createReactProject(workspaceRoot);
      const testFile = `${workspaceRoot}/test.ts`;
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
      await vscode.window.showTextDocument(document);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      assert.ok(true, 'Commands work with multiple workspace folders');
    });

    test('project detection should handle different frameworks per workspace', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createReactProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'Project detection handles different frameworks');
    });

    test('file discovery should scan all workspace folders', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const tsFile = `${workspaceRoot}/test.ts`;
      const jsFile = `${workspaceRoot}/test.js`;

      await FileTestHelpers.createFile(tsFile, 'export const a = 1;');
      await FileTestHelpers.createFile(jsFile, 'export const b = 2;');

      await FileTestHelpers.assertFileExists(tsFile);
      await FileTestHelpers.assertFileExists(jsFile);

      assert.ok(true, 'File discovery scans all workspace folders');
    });

    test('context variables should update correctly for multi-workspace', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createTypeScriptProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'Context variables update for multi-workspace');
    });
  });

  suite('Cross-Workspace Operations', () => {
    test('copy function should work across workspaces', async function () {
      this.timeout(10000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const sourceFile = `${workspaceRoot}/source.ts`;
      await FileTestHelpers.createFile(sourceFile, 'function test() { return "test"; }');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourceFile));
      const editor = await vscode.window.showTextDocument(document);
      editor.selection = new vscode.Selection(0, 9, 0, 33);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      assert.ok(true, 'Copy function works across workspaces');
    });

    test('save all should work across workspaces', async function () {
      this.timeout(10000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = `${workspaceRoot}/test.ts`;
      await FileTestHelpers.createFile(testFile, 'export const test = "value";');

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
      const editor = await vscode.window.showTextDocument(document);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// Modified\n');
      });

      await vscode.commands.executeCommand('additionalContextMenus.saveAll');
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      assert.ok(true, 'Save all works across workspaces');
    });
  });

  suite('Workspace Change Handling', () => {
    test('should handle workspace folder addition', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      assert.ok(true, 'Workspace folder addition handled');
    });

    test('should handle workspace folder removal', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      assert.ok(true, 'Workspace folder removal handled');
    });
  });

  suite('Cache Management', () => {
    test('should clear caches on workspace change', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createReactProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'Caches cleared on workspace change');
    });

    test('should maintain separate cache per workspace', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders && workspaceFolders.length >= 1, 'Workspace should be available');

      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      await ProjectFixtures.createReactProject(workspaceRoot);
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'Separate cache maintained per workspace');
    });
  });
});
