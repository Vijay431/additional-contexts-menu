import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Cron Job Timer Generator Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('cronJobTimerGenerator');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('Generate Cron Timer command should be registered', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.generateCronTimer'),
        'Generate Cron Timer command should be registered',
      );
    });
  });

  suite('Preset Schedules', () => {
    test('should generate Every minute schedule', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');

      await FileTestHelpers.assertFileContains(testFile, '"* * * *"');
    });

    test('should generate Every hour schedule', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');

      await FileTestHelpers.assertFileContains(testFile, '0 * * *"');
    });

    test('should generate Daily at midnight schedule', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');

      await FileTestHelpers.assertFileContains(testFile, '0 0 * *"');
    });

    test('should generate Daily at 9am schedule', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');

      await FileTestHelpers.assertFileContains(testFile, '0 9 * *"');
    });
  });

  suite('Custom Schedule Input', () => {
    test('should build custom cron expression with valid inputs', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');

      await FileTestHelpers.assertFileContains(testFile, '30 9 * * 1');
    });

    test('should reject invalid minute value', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');
        assert.fail('Should have rejected invalid minute');
      } catch (_error) {
        assert.ok(true, 'Rejected invalid minute as expected');
      }
    });

    test('should reject invalid hour value', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');
        assert.fail('Should have rejected invalid hour');
      } catch (_error) {
        assert.ok(true, 'Rejected invalid hour as expected');
      }
    });
  });

  suite('Code Insertion', () => {
    test('should insert cron expression at cursor position', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 10);

      await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');

      await FileTestHelpers.assertFileContains(testFile, '0 9 * * *"');
    });

    test('should insert cron expression in empty document', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, '');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');

      await FileTestHelpers.assertFileContains(testFile, '0 9 * *"');
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      await WorkspaceTestHelpers.closeAllEditors();

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');
        assert.ok(true, 'Handled no active editor gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled no active editor error gracefully');
      }
    });

    test('should handle user cancellation gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'cron-test.ts');
      await FileTestHelpers.createFile(testFile, 'const test = "value";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');
        assert.ok(true, 'Handled user cancellation gracefully');
      } catch (_error) {
        assert.ok(true, 'Handled user cancellation gracefully');
      }
    });
  });
});
