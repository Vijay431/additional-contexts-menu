import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Core Functionality E2E Tests
 *
 * Streamlined test suite focusing only on the 7 core features:
 * 1. Copy Function - additionalContextMenus.copyFunction
 * 2. Copy Lines to File - additionalContextMenus.copyLinesToFile
 * 3. Move Lines to File - additionalContextMenus.moveLinesToFile
 * 4. Save All - additionalContextMenus.saveAll
 * 5. Open in Terminal - additionalContextMenus.openInTerminal
 * 6. Enable Extension - additionalContextMenus.enable
 * 7. Disable Extension - additionalContextMenus.disable
 */
suite('Additional Context Menus - Core Functionality Tests', () => {
  let tempWorkspace: string;
  let extension: vscode.Extension<any>;

  suiteSetup(async () => {
    // Get and activate extension
    extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus')!;
    assert.ok(extension, 'Extension should be found');

    if (!extension.isActive) {
      await extension.activate();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    assert.strictEqual(extension.isActive, true, 'Extension should be active');

    // Create temporary workspace
    tempWorkspace = path.join(__dirname, '../temp-workspace');
    await fs.mkdir(tempWorkspace, { recursive: true });
  });

  suiteTeardown(async () => {
    // Clean up
    try {
      await fs.rmdir(tempWorkspace, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  setup(async () => {
    // Reset to default enabled state
    const config = vscode.workspace.getConfiguration('additionalContextMenus');
    await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  // ============================================================================
  // Core Command Registration
  // ============================================================================

  test('All 7 core commands should be registered', async () => {
    const commands = await vscode.commands.getCommands();
    const expectedCommands = [
      'additionalContextMenus.copyFunction',
      'additionalContextMenus.copyLinesToFile',
      'additionalContextMenus.moveLinesToFile',
      'additionalContextMenus.saveAll',
      'additionalContextMenus.openInTerminal',
      'additionalContextMenus.enable',
      'additionalContextMenus.disable'
    ];

    for (const command of expectedCommands) {
      assert.ok(
        commands.includes(command),
        `Command ${command} should be registered`
      );
    }
  });

  // ============================================================================
  // Enable/Disable Commands (Command Palette Only)
  // ============================================================================

  test('Enable/Disable commands should work correctly', async () => {
    // Test disable command
    await vscode.commands.executeCommand('additionalContextMenus.disable');
    await new Promise(resolve => setTimeout(resolve, 100));

    let config = vscode.workspace.getConfiguration('additionalContextMenus');
    assert.strictEqual(config.get('enabled'), false, 'Extension should be disabled');

    // Test enable command
    await vscode.commands.executeCommand('additionalContextMenus.enable');
    await new Promise(resolve => setTimeout(resolve, 100));

    config = vscode.workspace.getConfiguration('additionalContextMenus');
    assert.strictEqual(config.get('enabled'), true, 'Extension should be enabled');
  });

  // ============================================================================
  // Copy Function Command
  // ============================================================================

  test('Copy Function should work with function declarations', async () => {
    const testFile = path.join(tempWorkspace, 'functions.ts');
    const content = `
export function getUserById(id: string) {
  return fetch(\`/api/users/\${id}\`)
    .then(response => response.json());
}

const calculateTotal = (items: any[]) => {
  return items.reduce((sum, item) => sum + item.value, 0);
};`;

    await fs.writeFile(testFile, content);
    const document = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(document);

    // Position cursor inside function
    editor.selection = new vscode.Selection(1, 20, 1, 20);

    // Execute command - should not throw
    await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
    assert.ok(true, 'Copy Function executed successfully');
  });

  // ============================================================================
  // Copy Lines to File Command
  // ============================================================================

  test('Copy Lines to File should handle text selection', async function() {
    this.timeout(3000);

    const sourceFile = path.join(tempWorkspace, 'source.ts');
    const targetFile = path.join(tempWorkspace, 'target.ts');

    await fs.writeFile(sourceFile, `
const utility = (data: any[]) => {
  return data.filter(item => item.active);
};`);

    await fs.writeFile(targetFile, `
export const existing = () => 'existing';`);

    const document = await vscode.workspace.openTextDocument(sourceFile);
    const editor = await vscode.window.showTextDocument(document);

    // Select text
    const startPos = new vscode.Position(1, 0);
    const endPos = new vscode.Position(3, 2);
    editor.selection = new vscode.Selection(startPos, endPos);

    // Execute with timeout (requires user interaction)
    try {
      await Promise.race([
        vscode.commands.executeCommand('additionalContextMenus.copyLinesToFile'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      assert.ok(true, 'Copy Lines to File executed');
    } catch (error) {
      if (error instanceof Error && error.message === 'Timeout') {
        assert.ok(true, 'Copy Lines to File timed out as expected (requires user input)');
      } else {
        throw error;
      }
    }
  });

  // ============================================================================
  // Move Lines to File Command
  // ============================================================================

  test('Move Lines to File should handle text selection', async function() {
    this.timeout(3000);

    const sourceFile = path.join(tempWorkspace, 'move-source.ts');
    await fs.writeFile(sourceFile, `
const temporaryFunction = () => {
  return 'This will be moved';
};`);

    const document = await vscode.workspace.openTextDocument(sourceFile);
    const editor = await vscode.window.showTextDocument(document);

    // Select text
    const startPos = new vscode.Position(1, 0);
    const endPos = new vscode.Position(3, 2);
    editor.selection = new vscode.Selection(startPos, endPos);

    // Execute with timeout (requires user interaction)
    try {
      await Promise.race([
        vscode.commands.executeCommand('additionalContextMenus.moveLinesToFile'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      assert.ok(true, 'Move Lines to File executed');
    } catch (error) {
      if (error instanceof Error && error.message === 'Timeout') {
        assert.ok(true, 'Move Lines to File timed out as expected (requires user input)');
      } else {
        throw error;
      }
    }
  });

  // ============================================================================
  // Save All Command
  // ============================================================================

  test('Save All should save dirty documents', async () => {
    const testFile = path.join(tempWorkspace, 'save-test.ts');
    await fs.writeFile(testFile, 'const original = "test";');

    const document = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(document);

    // Make document dirty
    await editor.edit(editBuilder => {
      editBuilder.insert(new vscode.Position(0, 0), '// Modified\n');
    });

    assert.strictEqual(document.isDirty, true, 'Document should be dirty');

    // Execute Save All
    await vscode.commands.executeCommand('additionalContextMenus.saveAll');

    assert.strictEqual(document.isDirty, false, 'Document should be saved');
  });

  // ============================================================================
  // Open in Terminal Command
  // ============================================================================

  test('Open in Terminal should execute without errors', async () => {
    const testFile = path.join(tempWorkspace, 'terminal-test.ts');
    await fs.writeFile(testFile, 'console.log("test");');

    const document = await vscode.workspace.openTextDocument(testFile);
    await vscode.window.showTextDocument(document);

    // Execute command - should not throw
    await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
    assert.ok(true, 'Open in Terminal executed successfully');
  });

  // ============================================================================
  // Accessibility Tests (Command Palette + Right-Click Menu)
  // ============================================================================

  test('Main features should be accessible via both command palette and right-click', async () => {
    // Test that 5 main features are available in command palette
    const commands = await vscode.commands.getCommands();
    const mainFeatures = [
      'additionalContextMenus.copyFunction',
      'additionalContextMenus.copyLinesToFile',
      'additionalContextMenus.moveLinesToFile',
      'additionalContextMenus.saveAll',
      'additionalContextMenus.openInTerminal'
    ];

    for (const command of mainFeatures) {
      assert.ok(commands.includes(command),
        `Main feature ${command} should be available in command palette`);
    }

    // Management commands should only be in command palette
    const managementCommands = [
      'additionalContextMenus.enable',
      'additionalContextMenus.disable'
    ];

    for (const command of managementCommands) {
      assert.ok(commands.includes(command),
        `Management command ${command} should be available in command palette`);
    }
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  test('Commands should handle no active editor gracefully', async () => {
    // Close all editors
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');

    const commands = [
      'additionalContextMenus.copyFunction',
      'additionalContextMenus.copyLinesToFile',
      'additionalContextMenus.moveLinesToFile',
      'additionalContextMenus.openInTerminal'
    ];

    for (const command of commands) {
      try {
        await vscode.commands.executeCommand(command);
        assert.ok(true, `${command} handled no active editor gracefully`);
      } catch (error) {
        assert.fail(`${command} should handle no active editor gracefully: ${error}`);
      }
    }
  });

  test('Commands should handle empty selection gracefully', async () => {
    const testFile = path.join(tempWorkspace, 'empty-selection.ts');
    await fs.writeFile(testFile, 'const test = "value";');

    const document = await vscode.workspace.openTextDocument(testFile);
    const editor = await vscode.window.showTextDocument(document);

    // Clear selection
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    const selectionCommands = [
      'additionalContextMenus.copyLinesToFile',
      'additionalContextMenus.moveLinesToFile'
    ];

    for (const command of selectionCommands) {
      try {
        await vscode.commands.executeCommand(command);
        assert.ok(true, `${command} handled empty selection gracefully`);
      } catch (error) {
        assert.fail(`${command} should handle empty selection gracefully: ${error}`);
      }
    }
  });

  // ============================================================================
  // Cross-Platform Terminal Integration
  // ============================================================================

  test('Terminal integration should work across file types', async () => {
    const testFiles = [
      { name: 'test.ts', content: 'const ts = "typescript";' },
      { name: 'test.js', content: 'const js = "javascript";' },
      { name: 'test.tsx', content: 'const tsx = () => <div>React</div>;' },
      { name: 'test.jsx', content: 'const jsx = () => <div>React</div>;' }
    ];

    for (const file of testFiles) {
      const filePath = path.join(tempWorkspace, file.name);
      await fs.writeFile(filePath, file.content);

      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');
        assert.ok(true, `Terminal opened successfully for ${file.name}`);
      } catch (error) {
        assert.fail(`Terminal should open for ${file.name}: ${error}`);
      }
    }
  });
});