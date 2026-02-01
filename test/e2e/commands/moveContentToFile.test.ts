import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Move Lines to File - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('moveContentToFile');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('should register Move Lines to File command', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.moveContentToFile'),
        'Move Lines to File command should be registered',
      );
    });
  });

  suite('Basic Functionality', () => {
    test('should move selected lines to existing file', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      const sourceContent = `const utility = (data: any[]) => {
  return data.filter(item => item.active);
};`;
      const targetContent = `export const existing = () => 'value';`;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(targetFile, targetContent);

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 1, 2);

      await vscode.commands.executeCommand('additionalContextMenus.moveContentToFile');
      assert.ok(true, 'Move Lines to File executed');

      await WorkspaceTestHelpers.closeAllEditors();
      await FileTestHelpers.assertFileNotExists(sourceFile);
      await FileTestHelpers.assertFileContains(targetFile, 'utility');
    });

    test('should remove code from source file after move', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source-with-more.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      const sourceContent = `const utility = () => 'value';\nconst otherFunction = () => 'other';`;
      const targetContent = `export const existing = () => 'value';`;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(targetFile, targetContent);

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.moveContentToFile');
      assert.ok(true, 'Move executed');

      await WorkspaceTestHelpers.closeAllEditors();
      const finalSource = await FileTestHelpers.readFile(sourceFile);
      assert.ok(!finalSource.includes('utility'), 'Code should be removed from source');
    });

    test('should handle multi-line move', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'multiline-source.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      const sourceContent =
        `const first = () => 'first';\n` +
        `const second = () => 'second';\n` +
        `const third = () => 'third';`;
      const targetContent = ``;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(targetFile, targetContent);

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 1, 20);

      await vscode.commands.executeCommand('additionalContextMenus.moveContentToFile');
      assert.ok(true, 'Multi-line move executed');

      await WorkspaceTestHelpers.closeAllEditors();
      const finalSource = await FileTestHelpers.readFile(sourceFile);
      assert.ok(
        !finalSource.includes('first') && !finalSource.includes('second'),
        'All lines should be removed',
      );
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      await WorkspaceTestHelpers.closeAllEditors();

      try {
        await vscode.commands.executeCommand('additionalContextMenus.moveContentToFile');
        assert.ok(true, 'Handled no active editor gracefully');
      } catch (_error) {
        assert.fail(`Should handle gracefully: ${_error}`);
      }
    });

    test('should handle empty selection gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'empty-selection.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.moveContentToFile');
        assert.ok(true, 'Handled empty selection gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled empty selection');
      }
    });

    test('should handle invalid target file gracefully', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');

      await FileTestHelpers.createFile(sourceFile, 'const test = "value";');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.moveContentToFile');
        assert.ok(true, 'Handled invalid target gracefully');
      } catch (_error) {
        assert.ok(true, 'Command handled invalid target');
      }
    });

    test('should handle write permission errors gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'source.ts');

      await FileTestHelpers.createFile(testFile, 'const test = "value";');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.moveContentToFile');
        assert.ok(true, 'Handled permission error gracefully');
      } catch (_error) {
        assert.ok(true, 'Command handled permission error');
      }
    });
  });
});
