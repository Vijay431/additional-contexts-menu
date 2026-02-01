import * as assert from 'assert';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';

suite('Configuration Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('configurationService');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Configuration Retrieval', () => {
    test('should return correct default values', () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      assert.strictEqual(config.get('enabled'), true);
      assert.strictEqual(config.get('autoDetectProjects'), true);
      assert.deepStrictEqual(config.get('supportedExtensions'), ['.ts', '.tsx', '.js', '.jsx']);
      assert.strictEqual(config.get('copyCode.insertionPoint'), 'smart');
      assert.strictEqual(config.get('copyCode.handleImports'), 'merge');
      assert.strictEqual(config.get('copyCode.preserveComments'), true);
      assert.strictEqual(config.get('saveAll.showNotification'), true);
      assert.strictEqual(config.get('saveAll.skipReadOnly'), true);
      assert.strictEqual(config.get('terminal.type'), 'integrated');
      assert.strictEqual(config.get('terminal.openBehavior'), 'parent-directory');

      assert.ok(true, 'Default configuration values are correct');
    });

    test('should handle all nested configuration structures', () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      const copyCodeConfig = config.get('copyCode');
      assert.ok(copyCodeConfig, 'copyCode configuration should exist');

      const saveAllConfig = config.get('saveAll');
      assert.ok(saveAllConfig, 'saveAll configuration should exist');

      const terminalConfig = config.get('terminal');
      assert.ok(terminalConfig, 'terminal configuration should exist');

      assert.ok(true, 'Nested configuration structures handled');
    });

    test('should support type-safe config access', () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      const insertionPoint = config.get('copyCode.insertionPoint');
      assert.ok(['smart', 'end', 'beginning'].includes(insertionPoint as string));

      const handleImports = config.get('copyCode.handleImports');
      assert.ok(['merge', 'duplicate', 'skip'].includes(handleImports as string));

      assert.ok(true, 'Type-safe configuration access works');
    });
  });

  suite('Configuration Updates', () => {
    test('should update Workspace target configuration', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      await config.update('enabled', false, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updatedConfig = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(updatedConfig.get('enabled'), false);

      await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(true, 'Workspace configuration updated');
    });

    test('should update nested configuration', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      await config.update('copyCode.insertionPoint', 'end', vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updatedConfig = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(updatedConfig.get('copyCode.insertionPoint'), 'end');

      await config.update('copyCode.insertionPoint', 'smart', vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(true, 'Nested configuration updated');
    });

    test('should update terminal configuration', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      await config.update('terminal.type', 'external', vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updatedConfig = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(updatedConfig.get('terminal.type'), 'external');

      await config.update('terminal.type', 'integrated', vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(true, 'Terminal configuration updated');
    });
  });

  suite('Nested Configuration', () => {
    test('should update copyCode.insertionPoint', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      const insertionPoints = ['smart', 'end', 'beginning'];
      for (const point of insertionPoints) {
        await config.update('copyCode.insertionPoint', point, vscode.ConfigurationTarget.Workspace);
        await new Promise((resolve) => setTimeout(resolve, 100));

        const updated = config.get('copyCode.insertionPoint');
        assert.strictEqual(updated, point);
      }

      await config.update('copyCode.insertionPoint', 'smart', vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(true, 'copyCode.insertionPoint updated');
    });

    test('should update copyCode.handleImports', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      const importModes = ['merge', 'duplicate', 'skip'];
      for (const mode of importModes) {
        await config.update('copyCode.handleImports', mode, vscode.ConfigurationTarget.Workspace);
        await new Promise((resolve) => setTimeout(resolve, 100));

        const updated = config.get('copyCode.handleImports');
        assert.strictEqual(updated, mode);
      }

      await config.update('copyCode.handleImports', 'merge', vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(true, 'copyCode.handleImports updated');
    });

    test('should update saveAll configuration', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      await config.update('saveAll.showNotification', false, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = config.get('saveAll.showNotification');
      assert.strictEqual(updated, false);

      await config.update('saveAll.skipReadOnly', false, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updatedSkip = config.get('saveAll.skipReadOnly');
      assert.strictEqual(updatedSkip, false);

      await config.update('saveAll.showNotification', true, vscode.ConfigurationTarget.Workspace);
      await config.update('saveAll.skipReadOnly', true, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(true, 'saveAll configuration updated');
    });

    test('should update terminal configuration', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      await config.update('terminal.type', 'system-default', vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const terminalType = config.get('terminal.type');
      assert.strictEqual(terminalType, 'system-default');

      await config.update(
        'terminal.openBehavior',
        'workspace-root',
        vscode.ConfigurationTarget.Workspace,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      const openBehavior = config.get('terminal.openBehavior');
      assert.strictEqual(openBehavior, 'workspace-root');

      await config.update('terminal.type', 'integrated', vscode.ConfigurationTarget.Workspace);
      await config.update(
        'terminal.openBehavior',
        'parent-directory',
        vscode.ConfigurationTarget.Workspace,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(true, 'Terminal configuration updated');
    });
  });

  suite('Configuration Change Events', () => {
    test('should fire event on setting change', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      let eventFired = false;
      const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('additionalContextMenus')) {
          eventFired = true;
        }
      });

      await config.update('enabled', false, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 300));

      assert.ok(eventFired, 'Configuration change event fired');

      await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      disposable.dispose();
    });

    test('should filter events to extension section only', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');
      const otherConfig = vscode.workspace.getConfiguration('editor');

      let extensionEventFired = false;
      let otherEventFired = false;

      const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('additionalContextMenus')) {
          extensionEventFired = true;
        }
        if (event.affectsConfiguration('editor')) {
          otherEventFired = true;
        }
      });

      await config.update('enabled', false, vscode.ConfigurationTarget.Workspace);
      await otherConfig.update('fontSize', 14, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 300));

      assert.ok(extensionEventFired, 'Extension configuration change event fired');
      assert.ok(otherEventFired, 'Other configuration change event fired');

      await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));

      disposable.dispose();
    });

    test('should support disposable cleanup', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      let eventCount = 0;
      const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('additionalContextMenus')) {
          eventCount++;
        }
      });

      await config.update('enabled', false, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 300));

      disposable.dispose();

      await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 300));

      assert.strictEqual(eventCount, 1, 'Only one event fired after disposable');

      await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });
});
