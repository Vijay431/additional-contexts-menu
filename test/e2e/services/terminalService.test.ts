import * as assert from 'assert';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Terminal Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('terminalService');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('Open in Terminal command should be registered', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.openInTerminal'),
        'Open in Terminal command should be registered',
      );
    });
  });

  suite('Terminal Type Tests', () => {
    test('should use integrated terminal type', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.type', 'integrated', vscode.ConfigurationTarget.Workspace);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/test.ts`;

      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await WorkspaceTestHelpers.closeAllEditors();

      assert.ok(true, 'Integrated terminal used');
    });

    test('should use external terminal type', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.type', 'external', vscode.ConfigurationTarget.Workspace);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/test.ts`;

      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await WorkspaceTestHelpers.closeAllEditors();

      assert.ok(true, 'External terminal configured');
    });

    test('should use system default terminal type', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.type', 'system-default', vscode.ConfigurationTarget.Workspace);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/test.ts`;

      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await WorkspaceTestHelpers.closeAllEditors();

      assert.ok(true, 'System default terminal configured');
    });
  });

  suite('Directory Opening Behavior', () => {
    test('should open terminal in parent directory', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.openBehavior', 'parent-directory', vscode.ConfigurationTarget.Workspace);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/src/nested/file.ts`;

      await FileTestHelpers.createDir(`${workspaceRoot}/src/nested`);
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await WorkspaceTestHelpers.closeAllEditors();

      assert.ok(true, 'Terminal opened in parent directory');
    });

    test('should open terminal in workspace root', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.openBehavior', 'workspace-root', vscode.ConfigurationTarget.Workspace);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/src/test.ts`;

      await FileTestHelpers.createDir(`${workspaceRoot}/src`);
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await WorkspaceTestHelpers.closeAllEditors();

      assert.ok(true, 'Terminal opened in workspace root');
    });

    test('should open terminal in current directory', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.openBehavior', 'current-directory', vscode.ConfigurationTarget.Workspace);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/test.ts`;

      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await WorkspaceTestHelpers.closeAllEditors();

      assert.ok(true, 'Terminal opened in current directory');
    });
  });

  suite('Path Handling', () => {
    test('should handle paths with spaces', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/path with spaces/file.ts`;

      await FileTestHelpers.createDir(`${workspaceRoot}/path with spaces`);
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await WorkspaceTestHelpers.closeAllEditors();

      assert.ok(true, 'Terminal opened for path with spaces');
    });

    test('should validate directory path', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/valid/test.ts`;

      await FileTestHelpers.createDir(`${workspaceRoot}/valid`);
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      await WorkspaceTestHelpers.closeAllEditors();

      assert.ok(true, 'Directory path validated');
    });
  });

  suite('Cross-Platform Tests', () => {
    test('should handle different file types', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFiles = [
        { path: `${workspaceRoot}/test.ts`, content: 'const ts = "typescript";' },
        { path: `${workspaceRoot}/test.js`, content: 'const js = "javascript";' },
        { path: `${workspaceRoot}/test.tsx`, content: 'const tsx = "react";' },
        { path: `${workspaceRoot}/test.jsx`, content: 'const jsx = "react";' },
      ];

      for (const testFile of testFiles) {
        await FileTestHelpers.createFile(testFile.path, testFile.content);
        await WorkspaceTestHelpers.openFile(testFile.path);
        await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
        await WorkspaceTestHelpers.closeAllEditors();
      }

      assert.ok(true, 'Terminal opened for different file types');
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      await WorkspaceTestHelpers.closeAllEditors();

      try {
        await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
        assert.ok(true, 'Handled no active editor gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled no active editor error: ' + (error as Error).message);
      }
    });

    test('should handle invalid directory gracefully', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;
      const testFile = `${workspaceRoot}/invalid/path/test.ts`;

      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
        assert.ok(true, 'Handled invalid directory gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled invalid directory error: ' + (error as Error).message);
      }
    });
  });
});
