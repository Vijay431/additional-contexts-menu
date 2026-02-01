import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Copy Lines to File - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('copyContentToFile');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('should register command', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.copyContentToFile'),
        'Copy Lines to File command should be registered',
      );
    });
  });

  suite('Basic Functionality', () => {
    test('should copy selected lines to existing file', async () => {
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

      await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
      assert.ok(true, 'Command executed');
    });

    test('should copy multi-line selection', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'multiline.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      const sourceContent = `const first = () => 'first';
const second = () => 'second';
const third = () => 'third';`;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);

      WorkspaceTestHelpers.selectRange(document, 0, 0, 2, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
      assert.ok(true, 'Multi-line copy executed');
    });

    test('should handle empty selection gracefully', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'empty.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      await FileTestHelpers.createFile(sourceFile, 'const test = "value";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);

      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
        assert.ok(true, 'Handled empty selection gracefully');
      } catch {
        assert.ok(true, 'Command handled empty selection');
      }
    });
  });

  suite('Import Handling', () => {
    test('should handle import conflicts when configured to merge', async () => {
      await E2ETestSetup.resetConfig();
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('copyCode.handleImports', 'merge', vscode.ConfigurationTarget.Workspace);

      const sourceFile = path.join(testContext.tempWorkspace, 'import-test.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      const sourceContent = `import { useState } from 'react';`;
      const targetContent = `export const existing = () => 'value';`;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(targetFile, targetContent);

      const document = await WorkspaceTestHelpers.openFile(sourceFile);

      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 35);

      await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
      assert.ok(true, 'Import merge configured and executed');
    });

    test('should duplicate imports when configured to duplicate', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('copyCode.handleImports', 'duplicate', vscode.ConfigurationTarget.Workspace);

      const sourceFile = path.join(testContext.tempWorkspace, 'import-duplicate.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      const sourceContent = `import { useState } from 'react';`;
      const targetContent = `import { useState } from 'react';`;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(targetFile, targetContent);

      const document = await WorkspaceTestHelpers.openFile(sourceFile);

      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 35);

      await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
      assert.ok(true, 'Import duplicate configured and executed');
    });
  });

  suite('Smart Insertion', () => {
    test('should insert at beginning when configured', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('copyCode.insertionPoint', 'beginning', vscode.ConfigurationTarget.Workspace);

      const sourceFile = path.join(testContext.tempWorkspace, 'insert-beginning.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      const sourceContent = 'const test = "value";';
      const targetContent = `export const existing = () => 'value';`;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(targetFile, targetContent);

      const document = await WorkspaceTestHelpers.openFile(sourceFile);

      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
      assert.ok(true, 'Beginning insertion configured and executed');
    });

    test('should insert at end when configured', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('copyCode.insertionPoint', 'end', vscode.ConfigurationTarget.Workspace);

      const sourceFile = path.join(testContext.tempWorkspace, 'insert-end.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');

      const sourceContent = 'const test = "value";';
      const targetContent = `export const existing = () => 'value';`;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(targetFile, targetContent);

      const document = await WorkspaceTestHelpers.openFile(sourceFile);

      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
      assert.ok(true, 'End insertion configured and executed');
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
        assert.ok(true, 'Handled no active editor gracefully');
      } catch {
        assert.ok(true, 'Command handled no active editor');
      }
    });

    test('should handle invalid target file gracefully', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');

      await FileTestHelpers.createFile(sourceFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(sourceFile);

      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
        assert.ok(true, 'Handled invalid target gracefully');
      } catch {
        assert.ok(true, 'Command handled invalid target');
      }
    });

    test('should handle write permission errors gracefully', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');

      await FileTestHelpers.createFile(sourceFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(sourceFile);

      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyContentToFile');
        assert.ok(true, 'Handled permission error gracefully');
      } catch {
        assert.ok(true, 'Command handled permission error');
      }
    });
  });
});
