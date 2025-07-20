import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';

suite('Extension Integration Tests', () => {
  let tempDir: string;

  setup(async () => {
    tempDir = path.join(__dirname, '../temp-integration');
    await fs.ensureDir(tempDir);
  });

  teardown(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }

    // Close all editors
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('Extension should be present and activate', async () => {
    const extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus');

    assert.ok(extension, 'Extension should be found');

    // Activate the extension
    await extension!.activate();

    assert.strictEqual(extension!.isActive, true, 'Extension should be active');
  });

  test('Extension commands should be registered', async () => {
    const extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus');
    await extension!.activate();

    const commands = await vscode.commands.getCommands();

    const expectedCommands = [
      'additionalContextMenus.copyFunction',
      'additionalContextMenus.copyCodeToFile',
      'additionalContextMenus.moveCodeToFile',
      'additionalContextMenus.saveAll',
      'additionalContextMenus.enable',
      'additionalContextMenus.disable',
      'additionalContextMenus.showOutputChannel',
    ];

    for (const command of expectedCommands) {
      assert.ok(commands.includes(command), `Command ${command} should be registered`);
    }
  });

  test('Extension configuration should be available', () => {
    const config = vscode.workspace.getConfiguration('additionalContextMenus');

    // Check that configuration properties exist
    assert.ok(config.has('enabled'));
    assert.ok(config.has('autoDetectProjects'));
    assert.ok(config.has('supportedExtensions'));
    assert.ok(config.has('copyCode.insertionPoint'));
    assert.ok(config.has('copyCode.handleImports'));
    assert.ok(config.has('copyCode.preserveComments'));
    assert.ok(config.has('saveAll.showNotification'));
    assert.ok(config.has('saveAll.skipReadOnly'));
  });

  test('Save All command should work', async () => {
    // Create a test file and make it dirty
    const testFile = path.join(tempDir, 'test-save.ts');
    await fs.writeFile(testFile, 'const original = true;');

    const document = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(document);

    // Make the document dirty
    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// Modified\n');
    });

    assert.strictEqual(document.isDirty, true, 'Document should be dirty');

    // Execute save all command
    await vscode.commands.executeCommand('additionalContextMenus.saveAll');

    // Document should no longer be dirty
    assert.strictEqual(document.isDirty, false, 'Document should be saved');
  });

  test('Enable/Disable commands should work', async () => {
    const config = vscode.workspace.getConfiguration('additionalContextMenus');

    // Ensure extension is enabled first
    await vscode.commands.executeCommand('additionalContextMenus.enable');
    assert.strictEqual(config.get('enabled'), true);

    // Disable extension
    await vscode.commands.executeCommand('additionalContextMenus.disable');
    assert.strictEqual(config.get('enabled'), false);

    // Re-enable extension
    await vscode.commands.executeCommand('additionalContextMenus.enable');
    assert.strictEqual(config.get('enabled'), true);
  });

  test('Show Output Channel command should work', async () => {
    // This command should execute without throwing errors
    await vscode.commands.executeCommand('additionalContextMenus.showOutputChannel');

    // The command should complete successfully
    assert.ok(true, 'Show output channel command executed');
  });

  test('Copy Function command should handle no active editor', async () => {
    // Close all editors first
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');

    try {
      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      // Should not throw an error, but may show a user message
      assert.ok(true, 'Command handled no active editor gracefully');
    } catch {
      assert.fail('Command should handle no active editor gracefully');
    }
  });

  test('Copy Code to File command should handle no selection', async () => {
    // Create a test file
    const testFile = path.join(tempDir, 'test-copy.ts');
    await fs.writeFile(testFile, 'const test = true;');

    const document = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(document);

    // Clear selection
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    try {
      await vscode.commands.executeCommand('additionalContextMenus.copyCodeToFile');
      // Should handle no selection gracefully
      assert.ok(true, 'Command handled no selection gracefully');
    } catch {
      assert.fail('Command should handle no selection gracefully');
    }
  });

  test('Move Code to File command should handle no selection', async () => {
    // Create a test file
    const testFile = path.join(tempDir, 'test-move.ts');
    await fs.writeFile(testFile, 'const test = true;');

    const document = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(document);

    // Clear selection
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    try {
      await vscode.commands.executeCommand('additionalContextMenus.moveCodeToFile');
      // Should handle no selection gracefully
      assert.ok(true, 'Command handled no selection gracefully');
    } catch {
      assert.fail('Command should handle no selection gracefully');
    }
  });

  test('Extension should handle workspace changes', async () => {
    const extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus');
    await extension!.activate();

    // The extension should handle workspace changes without throwing errors
    // We can't easily simulate workspace changes in tests, but we can verify
    // the extension doesn't crash when activated
    assert.ok(extension!.isActive, 'Extension should remain active');
  });

  test('Extension should handle configuration changes', async () => {
    const extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus');
    await extension!.activate();

    const config = vscode.workspace.getConfiguration('additionalContextMenus');

    // Change configuration
    await config.update('enabled', false, vscode.ConfigurationTarget.Global);
    await config.update('enabled', true, vscode.ConfigurationTarget.Global);

    // Extension should handle configuration changes without crashing
    assert.ok(extension!.isActive, 'Extension should remain active after config changes');
  });

  test('Extension should work with TypeScript files', async () => {
    // Create a TypeScript file with a function
    const tsFile = path.join(tempDir, 'test.ts');
    const tsContent = `
export function testFunction(param: string): string {
  return \`Hello \${param}\`;
}`;
    await fs.writeFile(tsFile, tsContent);

    const document = await vscode.workspace.openTextDocument(tsFile);
    const editor = await vscode.window.showTextDocument(document);

    // Position cursor inside the function
    editor.selection = new vscode.Selection(1, 10, 1, 10);

    try {
      // This should not throw an error even if no function is found
      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Extension handled TypeScript file');
    } catch {
      assert.fail('Extension should handle TypeScript files');
    }
  });

  test('Extension should work with JavaScript files', async () => {
    // Create a JavaScript file with a function
    const jsFile = path.join(tempDir, 'test.js');
    const jsContent = `
function testFunction(param) {
  return \`Hello \${param}\`;
}`;
    await fs.writeFile(jsFile, jsContent);

    const document = await vscode.workspace.openTextDocument(jsFile);
    const editor = await vscode.window.showTextDocument(document);

    // Position cursor inside the function
    editor.selection = new vscode.Selection(1, 5, 1, 5);

    try {
      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Extension handled JavaScript file');
    } catch {
      assert.fail('Extension should handle JavaScript files');
    }
  });

  test('Extension should handle React TSX files', async () => {
    // Create a React TSX file
    const tsxFile = path.join(tempDir, 'Component.tsx');
    const tsxContent = `
import React from 'react';

export default function TestComponent({ name }: { name: string }) {
  return <div>Hello {name}</div>;
}`;
    await fs.writeFile(tsxFile, tsxContent);

    const document = await vscode.workspace.openTextDocument(tsxFile);
    const editor = await vscode.window.showTextDocument(document);

    // Position cursor inside the component
    editor.selection = new vscode.Selection(3, 20, 3, 20);

    try {
      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Extension handled React TSX file');
    } catch {
      assert.fail('Extension should handle React TSX files');
    }
  });
});
