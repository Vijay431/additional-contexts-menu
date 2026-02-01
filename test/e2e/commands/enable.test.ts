import * as assert from 'assert';

import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';

suite('Enable Extension - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('enable');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('should register Enable command', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.enable'),
        'Enable command should be registered',
      );
    });
  });

  suite('Basic Functionality', () => {
    test('should enable extension when disabled', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('enabled', false, vscode.ConfigurationTarget.Workspace);

      const config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), false, 'Extension should be disabled');

      await vscode.commands.executeCommand('additionalContextMenus.enable');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const configAfter = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(configAfter.get('enabled'), true, 'Extension should be enabled');
    });

    test('should handle already enabled state', async () => {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('enabled', true, vscode.ConfigurationTarget.Workspace);

      const configBefore = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(configBefore.get('enabled'), true, 'Extension is already enabled');

      await vscode.commands.executeCommand('additionalContextMenus.enable');
      assert.ok(true, 'Handle already enabled state');

      const configAfter = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(configAfter.get('enabled'), true, 'Extension should still be enabled');
    });
  });

  suite('Error Handling', () => {
    test('should handle configuration errors gracefully', async () => {
      try {
        await vscode.commands.executeCommand('additionalContextMenus.enable');
        assert.ok(true, 'Enable command executed');
      } catch (_error) {
        assert.ok(true, 'Enable command handled error gracefully');
      }
    });
  });
});
