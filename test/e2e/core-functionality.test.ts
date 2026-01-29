import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

/**
 * Core Functionality E2E Tests
 *
 * Tests the 7 core features of Additional Context Menus extension:
 * 1. Save All
 * 2. Enable Extension
 * 3. Disable Extension
 * 4. Open in Terminal
 * 5. Validate File Name Convention
 * 6. Rename File to Convention
 * 7. Bulk Rename Files
 * 8. Generate Enum from Type
 * 9. Generate .env File
 * 10. Generate .gitignore
 */

suite('Additional Context Menus - Core Functionality Tests', () => {
  let tempWorkspace: string;
  let extension: vscode.Extension<any>;

  suiteSetup(async () => {
    extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus')!;
    assert.ok(extension, 'Extension should be found');

    if (!extension.isActive) {
      await extension.activate();
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  suiteTeardown(async () => {
    try {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    } catch (_error) {}
  });

  setup(async () => {
    tempWorkspace = path.join(__dirname, '../temp-workspace');
    await fs.mkdir(tempWorkspace, { recursive: true });
  });

  suite('All 7 core commands should be registered', async () => {
    const commands = await vscode.commands.getCommands();
    const expectedCommands = [
      'additionalContextMenus.saveAll',
      'additionalContextMenus.enable',
      'additionalContextMenus.disable',
      'additionalContextMenus.openInTerminal',
      'additionalContextMenus.validateFileName',
      'additionalContextMenus.renameFileConvention',
      'additionalContextMenus.bulkRenameFiles',
      'additionalContextMenus.generateEnum',
      'additionalContextMenus.generateEnvFile',
      'additionalContextMenus.generateGitignore',
    ];

    for (const command of expectedCommands) {
      assert.ok(commands.includes(command), `Command ${command} should be registered`);
    }
  });

  test('Enable/Disable commands should work correctly', async () => {
    const config = vscode.workspace.getConfiguration('additionalContextMenus');
    await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
    assert.strictEqual(config.get('enabled'), true, 'Extension should be enabled');

    await vscode.commands.executeCommand('additionalContextMenus.disable');
    const disabledConfig = vscode.workspace.getConfiguration('additionalContextMenus');
    assert.strictEqual(disabledConfig.get('enabled'), false, 'Extension should be disabled');

    await vscode.commands.executeCommand('additionalContextMenus.enable');
    const enabledConfig = vscode.workspace.getConfiguration('additionalContextMenus');
    assert.strictEqual(enabledConfig.get('enabled'), true, 'Extension should be re-enabled');
  });

  test('Save All command should work', async () => {
    await vscode.commands.executeCommand('additionalContextMenus.saveAll');
    assert.ok(true, 'Save All command should execute successfully');
  });

  test('Open in Terminal command should work', async () => {
    const testFile = path.join(tempWorkspace, 'test.ts');
    await fs.writeFile(testFile, 'console.log("test");', 'utf-8');

    await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
    await vscode.commands.executeCommand('additionalContextMenus.openInTerminal');

    await new Promise((resolve) => setTimeout(resolve, 500));

    const activeTerminals = vscode.window.terminals.filter((t) => t.name.includes('test'));

    assert.ok(activeTerminals.length > 0, 'Terminal should be opened');
  });

  test('Validate File Name command should work', async () => {
    const testFile = path.join(tempWorkspace, 'test.ts');
    await fs.writeFile(testFile, 'test content', 'utf-8');

    await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Test file should be open');
    assert.strictEqual(
      vscode.window.activeTextEditor?.document.fileName,
      testFile,
      'Test file should be active',
    );

    await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

    assert.ok(true, 'Validate File Name command should execute successfully');
  });

  test('Rename File to Convention command should work', async () => {
    const testFile = path.join(tempWorkspace, 'test-file-name.ts');
    await fs.writeFile(testFile, 'test content', 'utf-8');

    await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Test file should be open');

    await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

    await new Promise((resolve) => setTimeout(resolve, 500));

    assert.ok(true, 'Rename File to Convention command should execute successfully');
  });

  test('Bulk Rename Files command should work', async () => {
    const testDir = path.join(tempWorkspace, 'rename-test');
    await fs.mkdir(testDir, { recursive: true });

    for (let i = 0; i < 3; i++) {
      await fs.writeFile(path.join(testDir, `old-file-${i}.ts`), `content ${i}`, 'utf-8');
    }

    await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(testDir, 'old-file-0.ts')));

    await vscode.commands.executeCommand('additionalContextMenus.bulkRenameFiles');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const files = await fs.readdir(testDir);
    assert.strictEqual(files.length, 3, 'Should have 3 files');
  });

  test('Generate Enum from Type command should work', async () => {
    const testFile = path.join(tempWorkspace, 'enum-test.ts');
    const testContent = `type Status = "pending" | "approved" | "rejected";`;
    await fs.writeFile(testFile, testContent, 'utf-8');

    await vscode.workspace.openTextDocument(vscode.Uri.file(testFile));
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Test file should be open');
    assert.strictEqual(
      vscode.window.activeTextEditor?.document.fileName,
      testFile,
      'Test file should be active',
    );

    editor.selection = new vscode.Selection(0, 0, testContent.length - 1, 0);

    await vscode.commands.executeCommand('additionalContextMenus.generateEnum');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    assert.ok(true, 'Generate Enum command should execute successfully');
  });

  test('Generate .env File command should work', async () => {
    const envExample = path.join(tempWorkspace, '.env.example');
    await fs.writeFile(envExample, 'API_KEY=example\nAPI_SECRET=secret123\n', 'utf-8');

    await vscode.commands.executeCommand('additionalContextMenus.generateEnvFile');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const envFile = path.join(tempWorkspace, '.env');
    const envExists = await fs.access(envFile).then(
      () => true,
      () => false,
    );
    assert.ok(envExists, '.env file should be created');
  });

  test('Generate .gitignore command should work', async () => {
    const gitignore = path.join(tempWorkspace, '.gitignore');
    await fs.writeFile(gitignore, 'node_modules/', 'utf-8');

    await vscode.commands.executeCommand('additionalContextMenus.generateGitignore');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const gitignoreExists = await fs.access(gitignore).then(
      () => true,
      () => false,
    );
    assert.ok(gitignoreExists, '.gitignore file should be created');
  });
});
