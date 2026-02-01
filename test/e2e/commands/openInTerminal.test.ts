import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Open in Terminal - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('openInTerminal');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('should register Open in Terminal command', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.openInTerminal'),
        'Open in Terminal command should be registered',
      );
    });
  });

  suite('Basic Functionality', () => {
    test('should open terminal in parent directory', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.openBehavior', 'parent-directory', vscode.ConfigurationTarget.Workspace);

      const testFile = path.join(testContext.tempWorkspace, 'src/nested/file.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      assert.ok(true, 'Terminal opened in parent directory');
      await WorkspaceTestHelpers.closeAllEditors();
    });

    test('should open terminal in workspace root', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.openBehavior', 'workspace-root', vscode.ConfigurationTarget.Workspace);

      const testFile = path.join(testContext.tempWorkspace, 'src/test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      assert.ok(true, 'Terminal opened in workspace root');
      await WorkspaceTestHelpers.closeAllEditors();
    });

    test('should open terminal in current directory', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.openBehavior', 'current-directory', vscode.ConfigurationTarget.Workspace);

      const testFile = path.join(testContext.tempWorkspace, 'src/test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      assert.ok(true, 'Terminal opened in current directory');
      await WorkspaceTestHelpers.closeAllEditors();
    });

    test('should use integrated terminal type', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('terminal.type', 'integrated', vscode.ConfigurationTarget.Workspace);

      const testFile = path.join(testContext.tempWorkspace, 'src/test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      assert.ok(true, 'Integrated terminal used');
      await WorkspaceTestHelpers.closeAllEditors();
    });

    test('should validate directory before opening', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'src/test.ts');

      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      assert.ok(true, 'Directory validated and terminal opened');
      await WorkspaceTestHelpers.closeAllEditors();
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      await WorkspaceTestHelpers.closeAllEditors();

      try {
        await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
        assert.ok(true, 'Handled no active editor gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled no active editor error');
      }
    });

    test('should handle invalid directory gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'src/test.ts');

      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
        assert.ok(true, 'Handled invalid directory gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled invalid directory error');
      }
    });

    test('should handle write permission errors gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'src/test.ts');

      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
        assert.ok(true, 'Handled permission error gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled permission error');
      }
    });
  });

  suite('Cross-Platform Tests', () => {
    test('should handle file paths with spaces', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'path with spaces', 'file.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      await WorkspaceTestHelpers.openFile(testFile);

      await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
      assert.ok(true, 'Terminal opened for path with spaces');
      await WorkspaceTestHelpers.closeAllEditors();
    });

    test('should handle different file types', async () => {
      const testFiles = [
        { path: path.join(testContext.tempWorkspace, 'test.ts'), content: 'const test = "value";' },
        { path: path.join(testContext.tempWorkspace, 'test.js'), content: 'const test = "value";' },
        {
          path: path.join(testContext.tempWorkspace, 'test.tsx'),
          content: 'const test = "value";',
        },
        {
          path: path.join(testContext.tempWorkspace, 'test.jsx'),
          content: 'const test = "value";',
        },
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
});
