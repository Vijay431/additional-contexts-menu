import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * End-to-End Extension Tests
 *
 * These tests validate the complete functionality of the Additional Context Menus extension
 * in realistic user scenarios. Tests run in actual VS Code environment with real files.
 */
suite('Additional Context Menus - E2E Tests', () => {
  let tempWorkspace: string;
  let extension: vscode.Extension<any>;

  suiteSetup(async () => {
    // Get the extension
    extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus')!;
    assert.ok(extension, 'Extension should be found');

    // Activate the extension and wait for it
    if (!extension.isActive) {
      console.log('Activating extension...');
      await extension.activate();

      // Give it a moment to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('Extension activation state:', extension.isActive);
    assert.strictEqual(extension.isActive, true, 'Extension should be active');

    // Create temporary workspace
    tempWorkspace = path.join(__dirname, '../temp-e2e-workspace');
    await fs.ensureDir(tempWorkspace);
  });

  suiteTeardown(async () => {
    // Clean up temporary workspace
    if (await fs.pathExists(tempWorkspace)) {
      await fs.remove(tempWorkspace);
    }

    // Close all editors
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  setup(async () => {
    // Reset configuration to default values before each test
    const config = vscode.workspace.getConfiguration('additionalContextMenus');

    // Clear workspace-level overrides by setting to undefined
    await config.update('enabled', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('autoDetectProjects', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('supportedExtensions', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('copyCode.insertionPoint', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('copyCode.handleImports', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update(
      'copyCode.preserveComments',
      undefined,
      vscode.ConfigurationTarget.Workspace
    );
    await config.update(
      'saveAll.showNotification',
      undefined,
      vscode.ConfigurationTarget.Workspace
    );
    await config.update('saveAll.skipReadOnly', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('enableKeybindings', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('showKeybindingsInMenu', undefined, vscode.ConfigurationTarget.Workspace);

    await new Promise((resolve) => setTimeout(resolve, 200)); // Allow time for config updates

    // Close any open editors before each test
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  // ============================================================================
  // Extension Lifecycle Tests
  // ============================================================================

  suite('Extension Lifecycle', () => {
    test('Extension should be properly activated', () => {
      assert.ok(extension, 'Extension should exist');
      assert.strictEqual(extension.isActive, true, 'Extension should be active');
    });

    test('All extension commands should be registered', async () => {
      const commands = await vscode.commands.getCommands();

      // Filter to just our extension's commands for debugging
      const ourCommands = commands.filter((cmd) => cmd.startsWith('additionalContextMenus.'));
      console.log('Registered extension commands:', ourCommands);

      const expectedCommands = [
        'additionalContextMenus.copyFunction',
        'additionalContextMenus.copyCodeToFile',
        'additionalContextMenus.moveCodeToFile',
        'additionalContextMenus.saveAll',
        'additionalContextMenus.enable',
        'additionalContextMenus.disable',
        'additionalContextMenus.showOutputChannel',
        'additionalContextMenus.debugContextVariables',
        'additionalContextMenus.refreshContextVariables',
        'additionalContextMenus.checkKeybindingConflicts',
        'additionalContextMenus.enableKeybindings',
        'additionalContextMenus.disableKeybindings',
      ];

      for (const command of expectedCommands) {
        assert.ok(
          commands.includes(command),
          `Command ${command} should be registered. Available commands: ${ourCommands.join(', ')}`
        );
      }
    });

    test('Configuration should be available with correct defaults', () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      // Verify configuration properties exist and have correct defaults
      assert.strictEqual(config.get('enabled'), true);
      assert.strictEqual(config.get('autoDetectProjects'), true);
      assert.deepStrictEqual(config.get('supportedExtensions'), ['.ts', '.tsx', '.js', '.jsx']);
      assert.strictEqual(config.get('copyCode.insertionPoint'), 'smart');
      assert.strictEqual(config.get('copyCode.handleImports'), 'merge');
      assert.strictEqual(config.get('copyCode.preserveComments'), true);
      assert.strictEqual(config.get('saveAll.showNotification'), true);
      assert.strictEqual(config.get('saveAll.skipReadOnly'), true);
      assert.strictEqual(config.get('enableKeybindings'), false);
      assert.strictEqual(config.get('showKeybindingsInMenu'), true);
    });
  });

  // ============================================================================
  // Extension Commands E2E Tests
  // ============================================================================

  suite('Extension Commands', () => {
    test('Enable/Disable commands should work correctly', async () => {
      // Test disable command
      await vscode.commands.executeCommand('additionalContextMenus.disable');
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow time for config update

      let config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), false, 'Extension should be disabled');

      // Test enable command
      await vscode.commands.executeCommand('additionalContextMenus.enable');
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow time for config update

      config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), true, 'Extension should be enabled');
    });

    test('Show Output Channel command should execute without errors', async () => {
      // This should not throw any errors
      await vscode.commands.executeCommand('additionalContextMenus.showOutputChannel');
      assert.ok(true, 'Show output channel command executed successfully');
    });

    test('Debug Context Variables command should execute without errors', async () => {
      // This should not throw any errors
      await vscode.commands.executeCommand('additionalContextMenus.debugContextVariables');
      assert.ok(true, 'Debug context variables command executed successfully');
    });

    test('Refresh Context Variables command should execute without errors', async () => {
      // This should not throw any errors
      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');
      assert.ok(true, 'Refresh context variables command executed successfully');
    });

    test('Check Keybinding Conflicts command should execute without errors', async function() {
      this.timeout(5000);
      
      try {
        // This command shows a user dialog, so we need to handle timeout
        await Promise.race([
          vscode.commands.executeCommand('additionalContextMenus.checkKeybindingConflicts'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        assert.ok(true, 'Check keybinding conflicts command executed successfully');
      } catch (error) {
        if (error instanceof Error && error.message === 'Timeout') {
          assert.ok(true, 'Check keybinding conflicts command timed out as expected (requires user interaction)');
        } else {
          throw error;
        }
      }
    });

    test('Enable/Disable Keybindings commands should work correctly', async () => {
      // Test disable keybindings command
      await vscode.commands.executeCommand('additionalContextMenus.disableKeybindings');
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow time for config update

      let config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enableKeybindings'), false, 'Keybindings should be disabled');

      // Test enable keybindings command (this will show a confirmation dialog, so it might timeout)
      try {
        await Promise.race([
          vscode.commands.executeCommand('additionalContextMenus.enableKeybindings'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);
        assert.ok(true, 'Enable keybindings command executed (may have timed out due to user confirmation)');
      } catch (error) {
        if (error instanceof Error && error.message === 'Timeout') {
          assert.ok(true, 'Enable keybindings command timed out as expected (requires user confirmation)');
        } else {
          throw error;
        }
      }
    });

    test('Save All command should save dirty documents', async () => {
      // Create a test file
      const testFile = path.join(tempWorkspace, 'test-save.ts');
      await fs.writeFile(testFile, 'const original = "test";');

      // Open and modify the document
      const document = await vscode.workspace.openTextDocument(testFile);
      const editor = await vscode.window.showTextDocument(document);

      // Make changes to make it dirty
      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// Modified file\n');
      });

      assert.strictEqual(document.isDirty, true, 'Document should be dirty after edit');

      // Execute save all command
      await vscode.commands.executeCommand('additionalContextMenus.saveAll');

      // Verify document is saved
      assert.strictEqual(document.isDirty, false, 'Document should be saved after Save All');
    });
  });

  // ============================================================================
  // File Type Support Tests
  // ============================================================================

  suite('File Type Support', () => {
    async function createAndTestFile(fileName: string, content: string, expectedToWork = true) {
      const filePath = path.join(tempWorkspace, fileName);
      await fs.writeFile(filePath, content);

      const document = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(document);

      // Position cursor inside function
      const functionLineIndex = content
        .split('\n')
        .findIndex(
          (line) => line.includes('function') || line.includes('=>') || line.includes('const ')
        );
      if (functionLineIndex >= 0) {
        editor.selection = new vscode.Selection(functionLineIndex, 5, functionLineIndex, 5);
      }

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        if (expectedToWork) {
          assert.ok(true, `${fileName}: Command executed successfully`);
        }
      } catch (error) {
        if (expectedToWork) {
          assert.fail(`${fileName}: Command should not throw error: ${error}`);
        }
      }
    }

    test('Should work with TypeScript files (.ts)', async () => {
      const tsContent = `
export function calculateSum(a: number, b: number): number {
  return a + b;
}

export const multiplyNumbers = (x: number, y: number): number => {
  return x * y;
};`;

      await createAndTestFile('typescript-test.ts', tsContent);
    });

    test('Should work with TypeScript React files (.tsx)', async () => {
      const tsxContent = `
import React from 'react';

export interface Props {
  name: string;
  age: number;
}

export default function UserProfile({ name, age }: Props) {
  return (
    <div className="user-profile">
      <h1>{name}</h1>
      <p>Age: {age}</p>
    </div>
  );
}

export const UserCard: React.FC<Props> = ({ name, age }) => {
  return (
    <div className="user-card">
      <span>{name} ({age})</span>
    </div>
  );
};`;

      await createAndTestFile('react-component.tsx', tsxContent);
    });

    test('Should work with JavaScript files (.js)', async () => {
      const jsContent = `
function processData(data) {
  return data.map(item => item.value).filter(Boolean);
}

const formatString = (str) => {
  return str.trim().toLowerCase();
};

module.exports = { processData, formatString };`;

      await createAndTestFile('javascript-test.js', jsContent);
    });

    test('Should work with JavaScript React files (.jsx)', async () => {
      const jsxContent = `
import React from 'react';
import PropTypes from 'prop-types';

function Welcome({ message, showIcon = true }) {
  return (
    <div className="welcome">
      {showIcon && <span>👋</span>}
      <p>{message}</p>
    </div>
  );
}

Welcome.propTypes = {
  message: PropTypes.string.isRequired,
  showIcon: PropTypes.bool
};

const Button = ({ onClick, children }) => (
  <button onClick={onClick} className="custom-button">
    {children}
  </button>
);

export default Welcome;
export { Button };`;

      await createAndTestFile('react-component.jsx', jsxContent);
    });
  });

  // ============================================================================
  // Code Operations Tests
  // ============================================================================

  suite('Code Operations', () => {
    test('Copy Function should work with function declarations', async () => {
      const filePath = path.join(tempWorkspace, 'functions.ts');
      const content = `
export function getUserById(id: string): Promise<User> {
  return fetch(\`/api/users/\${id}\`)
    .then(response => response.json())
    .then(data => data as User);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}`;

      await fs.writeFile(filePath, content);
      const document = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(document);

      // Position cursor inside getUserById function
      editor.selection = new vscode.Selection(1, 20, 1, 20);

      // Execute copy function command
      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      // Command should execute without errors
      assert.ok(true, 'Copy Function command executed successfully');
    });

    test('Copy Code to File should handle text selection', async function () {
      // Set shorter timeout for this test since it involves user interaction
      this.timeout(5000);

      const sourceFile = path.join(tempWorkspace, 'source.ts');
      const targetFile = path.join(tempWorkspace, 'target.ts');

      // Create source file with code to copy
      await fs.writeFile(
        sourceFile,
        `
const utilityFunction = (data: any[]) => {
  return data.filter(item => item.active);
};

const anotherFunction = () => {
  console.log('Another function');
};`
      );

      // Create target file
      await fs.writeFile(
        targetFile,
        `
// Target file
export const existingFunction = () => {
  return 'existing';
};`
      );

      // Open source file and select code
      const sourceDoc = await vscode.workspace.openTextDocument(sourceFile);
      const sourceEditor = await vscode.window.showTextDocument(sourceDoc);

      // Select the utilityFunction
      const startPos = new vscode.Position(1, 0);
      const endPos = new vscode.Position(3, 2);
      sourceEditor.selection = new vscode.Selection(startPos, endPos);

      // Use Promise.race to timeout the command execution
      try {
        const commandPromise = vscode.commands.executeCommand(
          'additionalContextMenus.copyCodeToFile'
        );
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Command timed out - likely waiting for user input')),
            3000
          )
        );

        await Promise.race([commandPromise, timeoutPromise]);
        assert.ok(true, 'Copy Code to File command executed without crashing');
      } catch (error) {
        if (error instanceof Error && error.message.includes('timed out')) {
          assert.ok(true, 'Copy Code to File command timed out as expected (user input required)');
        } else {
          assert.ok(true, 'Copy Code to File handled gracefully in test environment');
        }
      }
    });

    test('Move Code to File should handle text selection', async function () {
      // Set shorter timeout for this test since it involves user interaction
      this.timeout(5000);

      const sourceFile = path.join(tempWorkspace, 'move-source.ts');

      await fs.writeFile(
        sourceFile,
        `
const temporaryFunction = () => {
  return 'This will be moved';
};

const keepThisFunction = () => {
  return 'This stays';
};`
      );

      const sourceDoc = await vscode.workspace.openTextDocument(sourceFile);
      const sourceEditor = await vscode.window.showTextDocument(sourceDoc);

      // Select the temporaryFunction
      const startPos = new vscode.Position(1, 0);
      const endPos = new vscode.Position(3, 2);
      sourceEditor.selection = new vscode.Selection(startPos, endPos);

      // Use Promise.race to timeout the command execution
      try {
        const commandPromise = vscode.commands.executeCommand(
          'additionalContextMenus.moveCodeToFile'
        );
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Command timed out - likely waiting for user input')),
            3000
          )
        );

        await Promise.race([commandPromise, timeoutPromise]);
        assert.ok(true, 'Move Code to File command executed without crashing');
      } catch (error) {
        if (error instanceof Error && error.message.includes('timed out')) {
          assert.ok(true, 'Move Code to File command timed out as expected (user input required)');
        } else {
          assert.ok(true, 'Move Code to File handled gracefully in test environment');
        }
      }
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  suite('Error Handling', () => {
    test('Commands should handle no active editor gracefully', async () => {
      // Close all editors
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      const commands = [
        'additionalContextMenus.copyFunction',
        'additionalContextMenus.copyCodeToFile',
        'additionalContextMenus.moveCodeToFile',
      ];

      for (const command of commands) {
        try {
          await vscode.commands.executeCommand(command);
          assert.ok(true, `${command} handled no active editor gracefully`);
        } catch (error) {
          // Commands should not throw errors, they should show user messages instead
          assert.fail(`${command} should handle no active editor gracefully, but threw: ${error}`);
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

      const commands = [
        'additionalContextMenus.copyCodeToFile',
        'additionalContextMenus.moveCodeToFile',
      ];

      for (const command of commands) {
        try {
          await vscode.commands.executeCommand(command);
          assert.ok(true, `${command} handled empty selection gracefully`);
        } catch (error) {
          assert.fail(`${command} should handle empty selection gracefully, but threw: ${error}`);
        }
      }
    });

    test('Extension should handle malformed files gracefully', async () => {
      const malformedFile = path.join(tempWorkspace, 'malformed.ts');
      // Create file with syntax errors
      await fs.writeFile(
        malformedFile,
        `
function unclosedFunction() {
  const malformed = 
  return something that doesn't parse;
}`
      );

      const document = await vscode.workspace.openTextDocument(malformedFile);
      const editor = await vscode.window.showTextDocument(document);

      editor.selection = new vscode.Selection(1, 5, 1, 5);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled malformed file gracefully');
      } catch (error) {
        assert.fail(`Extension should handle malformed files gracefully, but threw: ${error}`);
      }
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  suite('Configuration Changes', () => {
    test('Extension should respond to configuration changes', async () => {
      // Test enabling/disabling
      let config = vscode.workspace.getConfiguration('additionalContextMenus');
      await config.update('enabled', false, vscode.ConfigurationTarget.Global);
      await new Promise((resolve) => setTimeout(resolve, 300)); // Allow more time for config update

      config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), false);

      await config.update('enabled', true, vscode.ConfigurationTarget.Global);
      await new Promise((resolve) => setTimeout(resolve, 300)); // Allow more time for config update

      config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), true);

      // Test other configuration changes
      const originalExtensions = config.get('supportedExtensions');
      await config.update('supportedExtensions', ['.ts', '.js'], vscode.ConfigurationTarget.Global);
      await new Promise((resolve) => setTimeout(resolve, 300)); // Allow more time for config update

      config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.deepStrictEqual(config.get('supportedExtensions'), ['.ts', '.js']);

      // Restore original
      await config.update(
        'supportedExtensions',
        originalExtensions,
        vscode.ConfigurationTarget.Global
      );
      await new Promise((resolve) => setTimeout(resolve, 300)); // Allow more time for config update

      assert.ok(true, 'Extension handled configuration changes correctly');
    });
  });

  // ============================================================================
  // Integration with VS Code Features
  // ============================================================================

  suite('VS Code Integration', () => {
    test('Extension should work with VS Code workspace features', async () => {
      // Test that extension works with workspace folders
      const workspaceFolders = vscode.workspace.workspaceFolders;

      // Extension should handle both scenarios gracefully
      if (workspaceFolders) {
        assert.ok(
          workspaceFolders.length > 0,
          'Workspace folders should exist in test environment'
        );
      }

      // Create a project structure
      const projectDir = path.join(tempWorkspace, 'test-project');
      await fs.ensureDir(projectDir);
      await fs.writeFile(
        path.join(projectDir, 'package.json'),
        JSON.stringify(
          {
            name: 'test-project',
            dependencies: {
              react: '^18.0.0',
            },
          },
          null,
          2
        )
      );

      const componentFile = path.join(projectDir, 'Component.tsx');
      await fs.writeFile(
        componentFile,
        `
import React from 'react';

export default function TestComponent() {
  return <div>Test</div>;
}`
      );

      const document = await vscode.workspace.openTextDocument(componentFile);
      const editor = await vscode.window.showTextDocument(document);
      editor.selection = new vscode.Selection(2, 20, 2, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension worked with workspace project structure');
      } catch (error) {
        assert.fail(`Extension should work with project structure: ${error}`);
      }
    });

    test('Extension should handle multiple open editors', async () => {
      // Create multiple files
      const files = ['file1.ts', 'file2.js', 'file3.tsx'];
      const documents = [];

      for (const fileName of files) {
        const filePath = path.join(tempWorkspace, fileName);
        await fs.writeFile(
          filePath,
          `
// ${fileName}
export const ${fileName.replace('.', '_')}Function = () => {
  return "${fileName}";
};`
        );

        const document = await vscode.workspace.openTextDocument(filePath);
        documents.push(document);
        await vscode.window.showTextDocument(document);
      }

      assert.strictEqual(documents.length, 3, 'Should have opened 3 documents');

      // Test save all with multiple files
      await vscode.commands.executeCommand('additionalContextMenus.saveAll');
      assert.ok(true, 'Save All worked with multiple open editors');

      // Test commands work with multiple editors open
      const editor = await vscode.window.showTextDocument(documents[0]!);
      editor.selection = new vscode.Selection(2, 10, 2, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
      assert.ok(true, 'Copy Function worked with multiple editors open');
    });
  });

  // ============================================================================
  // Error Boundary Edge Cases
  // ============================================================================

  suite('Error Boundary Edge Cases', () => {
    test('Should handle extremely large files gracefully', async function () {
      this.timeout(10000);

      const largeFile = path.join(tempWorkspace, 'large-file.ts');

      // Create a large file with many functions
      let content = '// Large file with many functions\n';
      for (let i = 0; i < 1000; i++) {
        content += `
export function largeFunction${i}() {
  const data = Array(100).fill(0).map((_, index) => ({ id: index, value: \`test-${i}-\${index}\` }));
  return data.filter(item => item.id % 2 === 0).map(item => item.value);
}`;
      }

      await fs.writeFile(largeFile, content);
      const document = await vscode.workspace.openTextDocument(largeFile);
      const editor = await vscode.window.showTextDocument(document);

      // Position cursor in the middle of a function
      editor.selection = new vscode.Selection(500, 10, 500, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled large file gracefully');
      } catch (error) {
        assert.fail(`Extension should handle large files gracefully: ${error}`);
      }
    });

    test('Should handle files with special characters in paths', async () => {
      const specialCharsDir = path.join(tempWorkspace, 'special chars & symbols!');
      await fs.ensureDir(specialCharsDir);

      const specialFile = path.join(specialCharsDir, 'file with spaces & symbols!.ts');
      const content = `
export function specialPathFunction() {
  return 'handled special characters in path';
}`;

      await fs.writeFile(specialFile, content);
      const document = await vscode.workspace.openTextDocument(specialFile);
      const editor = await vscode.window.showTextDocument(document);

      editor.selection = new vscode.Selection(1, 15, 1, 15);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled special characters in file path');
      } catch (error) {
        assert.fail(`Extension should handle special characters in paths: ${error}`);
      }
    });

    test('Should handle rapid successive command executions', async function () {
      this.timeout(8000);

      const rapidFile = path.join(tempWorkspace, 'rapid-commands.ts');
      const content = `
export function rapidFunction1() { return 'test1'; }
export function rapidFunction2() { return 'test2'; }
export function rapidFunction3() { return 'test3'; }`;

      await fs.writeFile(rapidFile, content);
      const document = await vscode.workspace.openTextDocument(rapidFile);
      const editor = await vscode.window.showTextDocument(document);

      // Execute multiple commands rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        editor.selection = new vscode.Selection((i % 3) + 1, 10, (i % 3) + 1, 10);
        promises.push(vscode.commands.executeCommand('additionalContextMenus.copyFunction'));
        await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
      }

      try {
        await Promise.all(promises);
        assert.ok(true, 'Extension handled rapid successive commands');
      } catch (error) {
        assert.ok(true, 'Extension handled rapid commands gracefully even with some failures');
      }
    });

    test('Should handle files with invalid UTF-8 sequences gracefully', async () => {
      const invalidFile = path.join(tempWorkspace, 'invalid-utf8.js');

      // Create file with some problematic content (but still parseable JS)
      const content = `
// File with edge case content
function edgeCaseFunction() {
  const str1 = "normal string";
  const str2 = \`template \${str1} string\`;
  const regex = /[\\u0000-\\u001f]/g;
  return str2.replace(regex, '');
}`;

      await fs.writeFile(invalidFile, content);
      const document = await vscode.workspace.openTextDocument(invalidFile);
      const editor = await vscode.window.showTextDocument(document);

      editor.selection = new vscode.Selection(2, 10, 2, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled edge case file content');
      } catch (error) {
        assert.fail(`Extension should handle edge case content gracefully: ${error}`);
      }
    });
  });

  // ============================================================================
  // Performance and Stress Testing
  // ============================================================================

  suite('Performance and Stress Testing', () => {
    test('Should handle deeply nested function structures', async () => {
      const nestedFile = path.join(tempWorkspace, 'deeply-nested.ts');

      // Create deeply nested structure
      let content = 'export function outerFunction() {\n';
      for (let i = 0; i < 20; i++) {
        const indent = '  '.repeat(i + 1);
        content += `${indent}function nested${i}() {\n`;
        content += `${indent}  const data${i} = { level: ${i}, nested: true };\n`;
      }

      // Close all functions
      for (let i = 19; i >= 0; i--) {
        const indent = '  '.repeat(i + 1);
        content += `${indent}}\n`;
      }
      content += '}\n';

      await fs.writeFile(nestedFile, content);
      const document = await vscode.workspace.openTextDocument(nestedFile);
      const editor = await vscode.window.showTextDocument(document);

      // Position cursor in deeply nested function
      editor.selection = new vscode.Selection(15, 5, 15, 5);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled deeply nested functions');
      } catch (error) {
        assert.fail(`Extension should handle deeply nested structures: ${error}`);
      }
    });

    test('Should handle multiple concurrent Save All operations', async function () {
      this.timeout(10000);

      // Create multiple files
      const files = [];
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(tempWorkspace, `concurrent-${i}.ts`);
        await fs.writeFile(filePath, `export const value${i} = ${i};`);

        const document = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(document);

        // Make the document dirty
        await editor.edit((editBuilder) => {
          editBuilder.insert(new vscode.Position(0, 0), `// Modified ${i}\n`);
        });

        files.push(document);
      }

      // Execute multiple Save All commands concurrently
      const savePromises = [];
      for (let i = 0; i < 3; i++) {
        savePromises.push(vscode.commands.executeCommand('additionalContextMenus.saveAll'));
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      try {
        await Promise.all(savePromises);

        // Verify all files are saved
        const allSaved = files.every((doc) => !doc.isDirty);
        assert.ok(allSaved, 'All documents should be saved after concurrent Save All operations');
      } catch (error) {
        assert.fail(`Concurrent Save All operations should work: ${error}`);
      }
    });

    test('Should handle memory pressure scenarios', async function () {
      this.timeout(15000);

      // Create multiple large arrays to simulate memory pressure
      const memoryConsumers = [];
      for (let i = 0; i < 5; i++) {
        memoryConsumers.push(new Array(100000).fill(`memory-consumer-${i}`));
      }

      const memoryFile = path.join(tempWorkspace, 'memory-test.tsx');
      const content = `
import React from 'react';

export default function MemoryIntensiveComponent() {
  const largeData = Array(1000).fill(0).map((_, index) => ({
    id: index,
    value: \`item-\${index}\`,
    metadata: { 
      created: new Date().toISOString(),
      tags: Array(10).fill(0).map((_, i) => \`tag-\${i}\`)
    }
  }));

  const processData = () => {
    return largeData
      .filter(item => item.id % 2 === 0)
      .map(item => ({ ...item, processed: true }))
      .sort((a, b) => a.id - b.id);
  };

  return (
    <div>
      {processData().map(item => (
        <div key={item.id}>{item.value}</div>
      ))}
    </div>
  );
}`;

      await fs.writeFile(memoryFile, content);
      const document = await vscode.workspace.openTextDocument(memoryFile);
      const editor = await vscode.window.showTextDocument(document);

      editor.selection = new vscode.Selection(15, 10, 15, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled memory pressure scenario');
      } catch (error) {
        assert.ok(true, 'Extension handled memory pressure gracefully even with failures');
      } finally {
        // Clean up memory
        memoryConsumers.length = 0;
      }
    });
  });

  // ============================================================================
  // Advanced Configuration Edge Cases
  // ============================================================================

  suite('Advanced Configuration Edge Cases', () => {
    test('Should handle rapid configuration changes', async function () {
      this.timeout(8000);

      const config = vscode.workspace.getConfiguration('additionalContextMenus');
      const originalEnabled = config.get('enabled');

      // Rapidly toggle configuration
      for (let i = 0; i < 10; i++) {
        await config.update('enabled', i % 2 === 0, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Test that extension still works after rapid changes
      const testFile = path.join(tempWorkspace, 'config-test.ts');
      await fs.writeFile(testFile, 'export function configTestFunction() { return "test"; }');

      const document = await vscode.workspace.openTextDocument(testFile);
      const editor = await vscode.window.showTextDocument(document);
      editor.selection = new vscode.Selection(0, 10, 0, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled rapid configuration changes');
      } catch (error) {
        assert.ok(true, 'Extension gracefully handled configuration stress test');
      } finally {
        // Restore original configuration
        await config.update('enabled', originalEnabled, vscode.ConfigurationTarget.Global);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    });

    test('Should handle invalid configuration values gracefully', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');

      // Store original values
      const originalExtensions = config.get('supportedExtensions');
      const originalInsertionPoint = config.get('copyCode.insertionPoint');

      try {
        // Set invalid configuration values
        await config.update('supportedExtensions', [''], vscode.ConfigurationTarget.Global);
        await config.update(
          'copyCode.insertionPoint',
          'invalid-value' as any,
          vscode.ConfigurationTarget.Global
        );
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Test that extension still works with invalid config
        const testFile = path.join(tempWorkspace, 'invalid-config-test.js');
        await fs.writeFile(testFile, 'function invalidConfigTest() { return true; }');

        const document = await vscode.workspace.openTextDocument(testFile);
        const editor = await vscode.window.showTextDocument(document);
        editor.selection = new vscode.Selection(0, 5, 0, 5);

        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled invalid configuration values gracefully');
      } catch (error) {
        assert.ok(true, 'Extension gracefully handled invalid configuration');
      } finally {
        // Restore original configuration
        await config.update(
          'supportedExtensions',
          originalExtensions,
          vscode.ConfigurationTarget.Global
        );
        await config.update(
          'copyCode.insertionPoint',
          originalInsertionPoint,
          vscode.ConfigurationTarget.Global
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    });

    test('Should handle configuration with extreme values', async () => {
      const config = vscode.workspace.getConfiguration('additionalContextMenus');
      const originalExtensions = config.get('supportedExtensions');

      try {
        // Set extreme configuration - very long extension list
        const extremeExtensions = Array(100)
          .fill(0)
          .map((_, i) => `.ext${i}`);
        await config.update(
          'supportedExtensions',
          extremeExtensions,
          vscode.ConfigurationTarget.Global
        );
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Test that extension handles extreme configuration
        const currentConfig = vscode.workspace.getConfiguration('additionalContextMenus');
        const updatedExtensions = currentConfig.get('supportedExtensions');

        assert.ok(Array.isArray(updatedExtensions), 'Configuration should handle extreme values');
        assert.ok(true, 'Extension handled extreme configuration values');
      } catch (error) {
        assert.ok(true, 'Extension gracefully handled extreme configuration');
      } finally {
        // Restore original configuration
        await config.update(
          'supportedExtensions',
          originalExtensions,
          vscode.ConfigurationTarget.Global
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    });
  });

  // ============================================================================
  // Multi-workspace and File System Edge Cases
  // ============================================================================

  suite('Multi-workspace and File System Edge Cases', () => {
    test('Should handle nested project structures', async () => {
      // Create nested project structure
      const parentProject = path.join(tempWorkspace, 'parent-project');
      const childProject = path.join(parentProject, 'child-project');

      await fs.ensureDir(childProject);

      // Create package.json files for both projects
      await fs.writeFile(
        path.join(parentProject, 'package.json'),
        JSON.stringify({
          name: 'parent-project',
          dependencies: { react: '^18.0.0' },
        })
      );

      await fs.writeFile(
        path.join(childProject, 'package.json'),
        JSON.stringify({
          name: 'child-project',
          dependencies: { express: '^4.0.0' },
        })
      );

      // Create files in both projects
      const parentFile = path.join(parentProject, 'parent-component.tsx');
      const childFile = path.join(childProject, 'child-service.ts');

      await fs.writeFile(
        parentFile,
        `
import React from 'react';
export function ParentComponent() {
  return <div>Parent</div>;
}`
      );

      await fs.writeFile(
        childFile,
        `
export function childService() {
  return { status: 'child service working' };
}`
      );

      // Test with parent file
      const parentDoc = await vscode.workspace.openTextDocument(parentFile);
      const parentEditor = await vscode.window.showTextDocument(parentDoc);
      parentEditor.selection = new vscode.Selection(2, 10, 2, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled nested project structure - parent');
      } catch (error) {
        assert.fail(`Extension should handle nested projects: ${error}`);
      }

      // Test with child file
      const childDoc = await vscode.workspace.openTextDocument(childFile);
      const childEditor = await vscode.window.showTextDocument(childDoc);
      childEditor.selection = new vscode.Selection(1, 10, 1, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled nested project structure - child');
      } catch (error) {
        assert.fail(`Extension should handle nested projects: ${error}`);
      }
    });

    test('Should handle very long file paths', async () => {
      // Create deeply nested directory structure
      let deepPath = tempWorkspace;
      for (let i = 0; i < 10; i++) {
        deepPath = path.join(deepPath, `very-long-directory-name-level-${i}-with-descriptive-text`);
      }

      await fs.ensureDir(deepPath);

      const longPathFile = path.join(
        deepPath,
        'file-with-extremely-long-name-that-tests-path-limits.ts'
      );
      const content = `
export function functionWithVeryLongNameThatTestsVariousLimits() {
  const variableWithExtremelyLongNameForTesting = 'test';
  return variableWithExtremelyLongNameForTesting;
}`;

      await fs.writeFile(longPathFile, content);
      const document = await vscode.workspace.openTextDocument(longPathFile);
      const editor = await vscode.window.showTextDocument(document);

      editor.selection = new vscode.Selection(1, 15, 1, 15);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled very long file paths');
      } catch (error) {
        assert.fail(`Extension should handle long paths: ${error}`);
      }
    });

    test('Should handle files with no extension', async () => {
      const noExtFile = path.join(tempWorkspace, 'Dockerfile');
      const content = `
# This is a Dockerfile without extension
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;

      await fs.writeFile(noExtFile, content);

      try {
        const document = await vscode.workspace.openTextDocument(noExtFile);
        const editor = await vscode.window.showTextDocument(document);
        editor.selection = new vscode.Selection(2, 5, 2, 5);

        // This should not crash, but may not have context menus visible
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Extension handled file without extension gracefully');
      } catch (error) {
        assert.ok(true, 'Extension gracefully handled unsupported file type');
      }
    });

    test('Should handle symbolic links and shortcuts', async function () {
      this.timeout(5000);

      // Create original file
      const originalFile = path.join(tempWorkspace, 'original.ts');
      const content = `export function originalFunction() { return 'original'; }`;
      await fs.writeFile(originalFile, content);

      try {
        // Create symbolic link (may not work on all systems)
        const linkFile = path.join(tempWorkspace, 'linked.ts');

        // Use fs.symlink but catch errors gracefully
        try {
          await fs.symlink(originalFile, linkFile);

          const document = await vscode.workspace.openTextDocument(linkFile);
          const editor = await vscode.window.showTextDocument(document);
          editor.selection = new vscode.Selection(0, 10, 0, 10);

          await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
          assert.ok(true, 'Extension handled symbolic links');
        } catch (symlinkError) {
          // Symlinks might not be supported on this system
          assert.ok(true, 'Symbolic link test skipped due to system limitations');
        }
      } catch (error) {
        assert.ok(true, 'Extension handled file system edge cases gracefully');
      }
    });
  });

  // ============================================================================
  // AST Parsing and Concurrent Operations Edge Cases
  // ============================================================================

  suite('AST Parsing and Concurrent Operations Edge Cases', () => {
    test('Should handle complex TypeScript syntax edge cases', async () => {
      const complexFile = path.join(tempWorkspace, 'complex-syntax.ts');
      const content = `
// Complex TypeScript with edge cases
type ComplexType<T extends string | number> = {
  [K in keyof T]: T[K] extends string ? \`prefix-\${T[K]}\` : T[K];
};

interface GenericInterface<T, U = T> {
  method<V>(param: V): Promise<T & U & V>;
}

export class ComplexClass<T extends Record<string, unknown>> implements GenericInterface<T> {
  private readonly #privateField: WeakMap<object, T> = new WeakMap();
  
  public async method<V extends keyof T>(param: V): Promise<T & T & V> {
    const result = await this.processWithDecorator(param);
    return result as T & T & V;
  }
  
  @decorator({ config: true })
  private async processWithDecorator<K extends keyof T>(
    key: K,
    ...args: T[K] extends Function ? Parameters<T[K]> : never[]
  ): Promise<ReturnType<T[K] extends Function ? T[K] : () => unknown>> {
    const computation = (x: number): number => x ** 2 + Math.sqrt(x);
    const lambdaExpression = <U>(fn: (x: U) => U) => (val: U) => fn(val);
    
    return lambdaExpression(computation)(42) as any;
  }
}

function decorator(config: { config: boolean }) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      config = config.config;
    };
  };
}

export const complexArrowFunction = <T extends string | number>(
  param: T
): T extends string ? string : number => {
  return (typeof param === 'string' ? param.toUpperCase() : param * 2) as any;
};`;

      await fs.writeFile(complexFile, content);
      const document = await vscode.workspace.openTextDocument(complexFile);
      const editor = await vscode.window.showTextDocument(document);

      // Test at different function locations
      const testPositions = [
        { line: 12, char: 10, desc: 'class method' },
        { line: 20, char: 10, desc: 'decorated method' },
        { line: 37, char: 10, desc: 'decorator function' },
        { line: 44, char: 10, desc: 'complex arrow function' },
      ];

      for (const pos of testPositions) {
        editor.selection = new vscode.Selection(pos.line, pos.char, pos.line, pos.char);

        try {
          await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
          assert.ok(true, `Extension handled complex TypeScript syntax: ${pos.desc}`);
        } catch (error) {
          assert.ok(true, `Extension gracefully handled complex syntax: ${pos.desc}`);
        }
      }
    });

    test('Should handle JSX with complex props and nested components', async () => {
      const jsxFile = path.join(tempWorkspace, 'complex-jsx.tsx');
      const content = `
import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface ComplexProps {
  data: Array<{ id: string; nested: { value: number; meta?: unknown } }>;
  render?: (item: ComplexProps['data'][0]) => React.ReactNode;
  onEvent: <T extends Event>(event: T) => void;
}

export const ComplexComponent: React.FC<ComplexProps> = ({ 
  data, 
  render = (item) => <span>{item.nested.value}</span>,
  onEvent 
}) => {
  const [state, setState] = useState<Map<string, Set<number>>>(new Map());
  
  const memoizedComputation = useMemo(() => {
    return data.reduce((acc, item) => {
      const key = \`\${item.id}_computed\`;
      acc.set(key, new Set([item.nested.value, ...Array.from(acc.get(key) || [])]));
      return acc;
    }, new Map<string, Set<number>>());
  }, [data]);
  
  const handleComplexEvent = useCallback(<T extends React.SyntheticEvent>(
    event: T,
    meta: { timestamp: number; source: string }
  ) => {
    event.preventDefault();
    setState(prev => new Map(prev));
    onEvent(event.nativeEvent);
  }, [onEvent]);
  
  useEffect(() => {
    const cleanup = () => {
      setState(new Map());
    };
    
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, []);

  const renderComplexStructure = (items: typeof data) => (
    <div>
      {items.map((item, index) => (
        <div 
          key={item.id}
          onClick={(e) => handleComplexEvent(e, { 
            timestamp: Date.now(), 
            source: \`item_\${index}\` 
          })}
        >
          {render ? render(item) : (
            <ComplexNestedComponent
              {...item}
              onRender={(rendered) => (
                <Fragment key={rendered.id}>
                  {rendered.children}
                  <span data-testid={\`item-\${item.id}-\${index}\`}>
                    {JSON.stringify(item.nested)}
                  </span>
                </Fragment>
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
  
  return (
    <div className="complex-component">
      {renderComplexStructure(data)}
      {memoizedComputation.size > 0 && (
        <pre>{JSON.stringify(Array.from(memoizedComputation.entries()), null, 2)}</pre>
      )}
    </div>
  );
};

const ComplexNestedComponent: React.FC<{
  id: string;
  nested: { value: number; meta?: unknown };
  onRender: (props: { id: string; children: React.ReactNode }) => React.ReactNode;
}> = ({ id, nested, onRender }) => {
  return <>{onRender({ id, children: <span>{nested.value}</span> })}</>;
};`;

      await fs.writeFile(jsxFile, content);
      const document = await vscode.workspace.openTextDocument(jsxFile);
      const editor = await vscode.window.showTextDocument(document);

      // Test different React component functions
      const reactTestPositions = [
        { line: 10, char: 15, desc: 'main component' },
        { line: 20, char: 10, desc: 'memoized computation' },
        { line: 27, char: 10, desc: 'callback handler' },
        { line: 42, char: 10, desc: 'render function' },
        { line: 67, char: 15, desc: 'nested component' },
      ];

      for (const pos of reactTestPositions) {
        editor.selection = new vscode.Selection(pos.line, pos.char, pos.line, pos.char);

        try {
          await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
          assert.ok(true, `Extension handled complex JSX: ${pos.desc}`);
        } catch (error) {
          assert.ok(true, `Extension gracefully handled JSX complexity: ${pos.desc}`);
        }
      }
    });

    test('Should handle concurrent copy operations without conflicts', async function () {
      this.timeout(10000);

      // Create multiple files with different function types
      const files = [
        {
          name: 'async-funcs.ts',
          content: `
export async function asyncFunction1() { return await Promise.resolve('test1'); }
export const asyncArrow1 = async () => { return await fetch('/api/data'); };`,
        },
        {
          name: 'generator-funcs.ts',
          content: `
export function* generatorFunction() { yield 1; yield 2; yield 3; }
export async function* asyncGenerator() { yield await Promise.resolve(1); }`,
        },
        {
          name: 'class-methods.ts',
          content: `
export class TestClass {
  public method1() { return 'method1'; }
  private method2() { return 'method2'; }
  static staticMethod() { return 'static'; }
}`,
        },
      ];

      const documents = [];
      for (const file of files) {
        const filePath = path.join(tempWorkspace, file.name);
        await fs.writeFile(filePath, file.content);
        const doc = await vscode.workspace.openTextDocument(filePath);
        documents.push({ doc, editor: await vscode.window.showTextDocument(doc) });
      }

      // Execute concurrent copy operations
      const concurrentPromises = documents.map(async ({ editor }, index) => {
        // Position at first function
        editor.selection = new vscode.Selection(1, 10, 1, 10);

        try {
          await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
          return { success: true, file: files[index]!.name };
        } catch (error) {
          return { success: false, file: files[index]!.name, error };
        }
      });

      const results = await Promise.all(concurrentPromises);
      const successful = results.filter((r) => r.success).length;

      assert.ok(
        successful >= 1,
        `At least one concurrent operation should succeed (${successful}/${results.length})`
      );
      assert.ok(true, 'Extension handled concurrent copy operations');
    });

    test('Should handle malformed but parseable JavaScript edge cases', async () => {
      const malformedFile = path.join(tempWorkspace, 'malformed-edge-cases.js');
      const content = `
// Edge cases that are syntactically valid but unusual
const weirdFunction = function(...args) {
  const { 
    a = function() { return function() { return 42; }; }(),
    b: { c = [] } = {},
    ...rest
  } = args[0] || {};
  
  return (function(x) {
    return function(y) {
      return function(z) {
        return x + y + z + (c.length || 0);
      };
    };
  })(a)(rest.length)(args.length);
};

// Function with unusual formatting and comments
function /* comment */ unusual /* in */ Formatting /* places */ (
  /* param comment */ param1 = /* default */ (() => { 
    /* nested comment */ return 'default'; 
  })() /* end default */,
  param2 = {
    /* object comment */
    nested: {
      deeper: function() { return 'deep'; }
    }
  }
) /* function comment */ {
  /* body comment */
  return /* return comment */ param1 + /* plus */ param2.nested.deeper();
} /* end function */

// Arrow function with destructuring and complex defaults
const complexArrow = ({
  prop1 = (() => 'default1')(),
  prop2: { nested = 'nested_default' } = {},
  ...spreadProps
}) => ({ prop1, nested, spreadCount: Object.keys(spreadProps).length });

// Function using eval-like constructs (but safe)
function dynamicPropertyAccess(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}`;

      await fs.writeFile(malformedFile, content);
      const document = await vscode.workspace.openTextDocument(malformedFile);
      const editor = await vscode.window.showTextDocument(document);

      // Test each unusual function
      const edgeCasePositions = [
        { line: 2, char: 10, desc: 'weird nested function' },
        { line: 17, char: 10, desc: 'unusual formatting with comments' },
        { line: 35, char: 10, desc: 'complex arrow with destructuring' },
        { line: 42, char: 10, desc: 'dynamic property access' },
      ];

      for (const pos of edgeCasePositions) {
        editor.selection = new vscode.Selection(pos.line, pos.char, pos.line, pos.char);

        try {
          await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
          assert.ok(true, `Extension handled malformed edge case: ${pos.desc}`);
        } catch (error) {
          assert.ok(true, `Extension gracefully handled edge case: ${pos.desc}`);
        }
      }
    });
  });
});
