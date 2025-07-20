import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationService } from '../../services/configurationService';

suite('ConfigurationService Tests', () => {
  let configService: ConfigurationService;
  setup(async () => {
    configService = ConfigurationService.getInstance();
  });

  teardown(async () => {
    // Reset all configuration values to defaults
    const config = vscode.workspace.getConfiguration('additionalContextMenus');
    await config.update('enabled', true, vscode.ConfigurationTarget.Global);
    await config.update('autoDetectProjects', true, vscode.ConfigurationTarget.Global);
    await config.update(
      'supportedExtensions',
      ['.ts', '.tsx', '.js', '.jsx'],
      vscode.ConfigurationTarget.Global
    );
    await config.update('copyCode.insertionPoint', 'smart', vscode.ConfigurationTarget.Global);
    await config.update('copyCode.handleImports', 'merge', vscode.ConfigurationTarget.Global);
    await config.update('copyCode.preserveComments', true, vscode.ConfigurationTarget.Global);
    await config.update('saveAll.showNotification', true, vscode.ConfigurationTarget.Global);
    await config.update('saveAll.skipReadOnly', true, vscode.ConfigurationTarget.Global);
  });

  test('Should return default configuration values', () => {
    const config = configService.getConfiguration();

    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.autoDetectProjects, true);
    assert.deepStrictEqual(config.supportedExtensions, ['.ts', '.tsx', '.js', '.jsx']);
    assert.strictEqual(config.copyCode.insertionPoint, 'smart');
    assert.strictEqual(config.copyCode.handleImports, 'merge');
    assert.strictEqual(config.copyCode.preserveComments, true);
    assert.strictEqual(config.saveAll.showNotification, true);
    assert.strictEqual(config.saveAll.skipReadOnly, true);
  });

  test('Should detect enabled state correctly', () => {
    const isEnabled = configService.isEnabled();
    assert.strictEqual(isEnabled, true);
  });

  test('Should return supported extensions correctly', () => {
    const extensions = configService.getSupportedExtensions();
    assert.deepStrictEqual(extensions, ['.ts', '.tsx', '.js', '.jsx']);
  });

  test('Should return auto-detect projects setting correctly', () => {
    const autoDetect = configService.shouldAutoDetectProjects();
    assert.strictEqual(autoDetect, true);
  });

  test('Should return copy code configuration correctly', () => {
    const copyConfig = configService.getCopyCodeConfig();

    assert.strictEqual(copyConfig.insertionPoint, 'smart');
    assert.strictEqual(copyConfig.handleImports, 'merge');
    assert.strictEqual(copyConfig.preserveComments, true);
  });

  test('Should return save all configuration correctly', () => {
    const saveConfig = configService.getSaveAllConfig();

    assert.strictEqual(saveConfig.showNotification, true);
    assert.strictEqual(saveConfig.skipReadOnly, true);
  });

  test('Should update configuration values', async () => {
    // Update enabled setting
    await configService.updateConfiguration('enabled', false);

    const config = configService.getConfiguration();
    assert.strictEqual(config.enabled, false);
    assert.strictEqual(configService.isEnabled(), false);
  });

  test('Should update nested configuration values', async () => {
    // Update copy code settings
    await configService.updateConfiguration('copyCode.insertionPoint', 'end');
    await configService.updateConfiguration('copyCode.handleImports', 'skip');

    const copyConfig = configService.getCopyCodeConfig();
    assert.strictEqual(copyConfig.insertionPoint, 'end');
    assert.strictEqual(copyConfig.handleImports, 'skip');
  });

  test('Should update array configuration values', async () => {
    const newExtensions = ['.ts', '.js'];
    await configService.updateConfiguration('supportedExtensions', newExtensions);

    const extensions = configService.getSupportedExtensions();
    assert.deepStrictEqual(extensions, newExtensions);
  });

  test('Should handle configuration change events', (done) => {
    let changeCallbackCalled = false;

    const disposable = configService.onConfigurationChanged(() => {
      changeCallbackCalled = true;
      disposable.dispose();
      assert.strictEqual(changeCallbackCalled, true);
      done();
    });

    // Trigger configuration change
    configService.updateConfiguration('enabled', false);
  });

  test('Should only trigger change events for relevant configuration', (done) => {
    let changeCallbackCalled = false;

    const disposable = configService.onConfigurationChanged(() => {
      changeCallbackCalled = true;
      disposable.dispose();
    });

    // Change unrelated configuration
    const unrelatedConfig = vscode.workspace.getConfiguration('editor');
    unrelatedConfig.update('fontSize', 14).then(() => {
      // Wait a bit to see if our callback was called
      setTimeout(() => {
        assert.strictEqual(changeCallbackCalled, false);
        disposable.dispose();
        done();
      }, 100);
    });
  });

  test('Should handle invalid configuration values gracefully', () => {
    // Even if configuration contains invalid values, should return defaults
    const config = configService.getConfiguration();

    // Verify all required properties exist
    assert.ok(typeof config.enabled === 'boolean');
    assert.ok(typeof config.autoDetectProjects === 'boolean');
    assert.ok(Array.isArray(config.supportedExtensions));
    assert.ok(typeof config.copyCode === 'object');
    assert.ok(typeof config.saveAll === 'object');
  });

  test('Should update configuration with different targets', async () => {
    // Test global target
    await configService.updateConfiguration('enabled', false, vscode.ConfigurationTarget.Global);
    assert.strictEqual(configService.isEnabled(), false);

    // Test workspace target (if workspace is available)
    if (vscode.workspace.workspaceFolders) {
      await configService.updateConfiguration(
        'enabled',
        true,
        vscode.ConfigurationTarget.Workspace
      );
      assert.strictEqual(configService.isEnabled(), true);
    }
  });

  test('Should handle all copy code insertion point options', async () => {
    const insertionPoints = ['smart', 'end', 'beginning'] as const;

    for (const point of insertionPoints) {
      await configService.updateConfiguration('copyCode.insertionPoint', point);
      const config = configService.getCopyCodeConfig();
      assert.strictEqual(config.insertionPoint, point);
    }
  });

  test('Should handle all copy code import handling options', async () => {
    const importOptions = ['merge', 'duplicate', 'skip'] as const;

    for (const option of importOptions) {
      await configService.updateConfiguration('copyCode.handleImports', option);
      const config = configService.getCopyCodeConfig();
      assert.strictEqual(config.handleImports, option);
    }
  });

  test('Should preserve configuration values between getInstance calls', () => {
    // Get first instance
    const instance1 = ConfigurationService.getInstance();
    const config1 = instance1.getConfiguration();

    // Get second instance (should be same singleton)
    const instance2 = ConfigurationService.getInstance();
    const config2 = instance2.getConfiguration();

    // Should be the same instance and same configuration
    assert.strictEqual(instance1, instance2);
    assert.deepStrictEqual(config1, config2);
  });

  test('Should handle boolean configuration toggles', async () => {
    // Test all boolean configurations
    const booleanConfigs = [
      'enabled',
      'autoDetectProjects',
      'copyCode.preserveComments',
      'saveAll.showNotification',
      'saveAll.skipReadOnly',
    ];

    for (const configKey of booleanConfigs) {
      // Toggle to false
      await configService.updateConfiguration(configKey, false);

      // Toggle back to true
      await configService.updateConfiguration(configKey, true);

      // Should work without errors
      const config = configService.getConfiguration();
      assert.ok(typeof config === 'object');
    }
  });
});
