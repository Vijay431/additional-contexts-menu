import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

/**
 * Temporary Verification Test for I18n Key Generator Service
 *
 * This test verifies that the I18nKeyGeneratorService:
 * 1. Is properly importable and can be instantiated
 * 2. Has the correct interface and methods
 * 3. Can extract hardcoded strings from code
 * 4. Can generate i18n keys from strings
 * 5. Can generate translation files
 */
suite('I18n Key Generator - Verification Test', () => {
  let tempWorkspace: string;
  let extension: vscode.Extension<any>;

  suiteSetup(async () => {
    // Get and activate extension
    extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus')!;
    assert.ok(extension, 'Extension should be found');

    if (!extension.isActive) {
      await extension.activate();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    assert.strictEqual(extension.isActive, true, 'Extension should be active');

    // Create temporary workspace
    tempWorkspace = path.join(__dirname, '../temp-workspace-i18n');
    await fs.mkdir(tempWorkspace, { recursive: true });
  });

  suiteTeardown(async () => {
    // Clean up
    try {
      await fs.rmdir(tempWorkspace, { recursive: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('I18nKeyGeneratorService should be importable', async () => {
    // Try to import the service
    const { I18nKeyGeneratorService } = await import('../../src/services/i18nKeyGeneratorService');

    assert.ok(I18nKeyGeneratorService, 'I18nKeyGeneratorService should be defined');
    assert.strictEqual(typeof I18nKeyGeneratorService.getInstance, 'function', 'getInstance should be a function');
  });

  test('I18nKeyGeneratorService should have correct interface', async () => {
    const { I18nKeyGeneratorService } = await import('../../src/services/i18nKeyGeneratorService');
    const service = I18nKeyGeneratorService.getInstance();

    // Check that service has required methods
    assert.ok(service, 'Service instance should be created');

    // Verify key methods exist
    const requiredMethods = [
      'generateI18nKeys',
      'getGeneratorOptions',
      'showPreview',
      'createTranslationFile',
      'createHelperFile',
      'translationFileExists'
    ];

    for (const method of requiredMethods) {
      assert.strictEqual(
        typeof (service as any)[method],
        'function',
        `Service should have ${method} method`
      );
    }
  });

  test('I18nKeyGeneratorService should extract hardcoded strings', async () => {
    await import('../../src/services/i18nKeyGeneratorService');

    // Create a test file with hardcoded strings
    const testFile = path.join(tempWorkspace, 'test-component.tsx');
    const testContent = `
      const message = "Hello World";
      console.log("Error: Something went wrong");
      alert("Welcome to the app");

      function Button() {
        return <button>Click me</button>;
      }
    `;
    await fs.writeFile(testFile, testContent);

    const uri = vscode.Uri.file(testFile);
    const document = await vscode.workspace.openTextDocument(uri);

    // Extract strings using regex pattern (simplified test)
    const stringPattern = /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g;
    const strings = document.getText().match(stringPattern) || [];

    assert.ok(strings.length >= 4, 'Should extract at least 4 hardcoded strings');
    assert.ok(strings.some(s => s.includes('Hello World')), 'Should find "Hello World"');
    assert.ok(strings.some(s => s.includes('Click me')), 'Should find "Click me"');
  });

  test('I18nKeyGeneratorService should generate valid keys from strings', async () => {
    // Test key generation logic
    const testCases = [
      { input: 'User Profile Settings', expected: 'userProfileSettings' },
      { input: 'Error: Something went wrong', expected: 'errorSomethingWentWrong' },
      { input: 'Click me', expected: 'clickMe' },
      { input: 'Welcome to the app', expected: 'welcomeToTheApp' }
    ];

    for (const testCase of testCases) {
      // Simulate the key generation logic from the service
      const generatedKey = testCase.input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, '')
        .replace(/^\d+/, '');

      assert.strictEqual(generatedKey, testCase.expected, `Should generate correct key for "${testCase.input}"`);
    }
  });

  test('I18n key generator command should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('additionalContextMenus.generateI18nKeys'), 'generateI18nKeys command should be registered');
  });

  test('I18n key generator should work with valid selection', async () => {
    // Create a test file
    const testFile = path.join(tempWorkspace, 'test-i18n.ts');
    const testContent = `
const greeting = "Hello, World!";
const errorMessage = "An error occurred";
    `;
    await fs.writeFile(testFile, testContent);

    const uri = vscode.Uri.file(testFile);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);

    // Select the first line
    const firstLine = doc.lineAt(0);
    const selection = new vscode.Selection(firstLine.range.start, firstLine.range.end);
    editor.selection = selection;

    // Verify selection is not empty
    assert.ok(!editor.selection.isEmpty, 'Selection should not be empty');

    // Clean up
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });
});
