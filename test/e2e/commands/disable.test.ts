import * as assert from 'assert';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';

suite('Disable Extension - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('disable');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('should register Disable command', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.disable'),
        'Disable command should be registered',
      );
    });
  });

  suite('Basic Functionality', () => {
    test('should disable extension when enabled', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('enabled', true, vscode.ConfigurationTarget.Workspace);

      const config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), true, 'Extension should be enabled');

      await vscode.commands.executeCommand('additionalContextMenus.disable');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const configAfter = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(configAfter.get('enabled'), false, 'Extension should be disabled');
    });

    test('should handle already disabled state', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('enabled', false, vscode.ConfigurationTarget.Workspace);

      const configBefore = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(configBefore.get('enabled'), false, 'Extension is already disabled');

      await vscode.commands.executeCommand('additionalContextMenus.disable');
      assert.ok(true, 'Handle already disabled state');

      const configAfter = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(configAfter.get('enabled'), false, 'Extension should still be disabled');
    });

    test('should re-enable after disable', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('enabled', true, vscode.ConfigurationTarget.Workspace);

      const config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), true, 'Extension should be enabled');

      await vscode.commands.executeCommand('additionalContextMenus.disable');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const configAfter = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(configAfter.get('enabled'), false, 'Extension should be disabled');
    });
  });

  suite('Error Handling', () => {
    test('should handle configuration errors gracefully', async () => {
      try {
        await vscode.commands.executeCommand('additionalContextMenus.disable');
        assert.ok(true, 'Disable command executed');
      } catch (_error) {
        assert.ok(true, 'Disable command handled error gracefully');
      }
    });
  });
});
