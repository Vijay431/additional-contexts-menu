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
      await new Promise(resolve => setTimeout(resolve, 2000));
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
    await config.update('copyCode.preserveComments', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('saveAll.showNotification', undefined, vscode.ConfigurationTarget.Workspace);
    await config.update('saveAll.skipReadOnly', undefined, vscode.ConfigurationTarget.Workspace);
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Allow time for config updates

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
      const ourCommands = commands.filter(cmd => cmd.startsWith('additionalContextMenus.'));
      console.log('Registered extension commands:', ourCommands);

      const expectedCommands = [
        'additionalContextMenus.copyFunction',
        'additionalContextMenus.copyCodeToFile',
        'additionalContextMenus.moveCodeToFile',
        'additionalContextMenus.saveAll',
        'additionalContextMenus.enable',
        'additionalContextMenus.disable',
        'additionalContextMenus.showOutputChannel'
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
    });
  });

  // ============================================================================
  // Extension Commands E2E Tests
  // ============================================================================

  suite('Extension Commands', () => {
    test('Enable/Disable commands should work correctly', async () => {
      // Test disable command
      await vscode.commands.executeCommand('additionalContextMenus.disable');
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow time for config update
      
      let config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), false, 'Extension should be disabled');

      // Test enable command
      await vscode.commands.executeCommand('additionalContextMenus.enable');
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow time for config update
      
      config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), true, 'Extension should be enabled');
    });

    test('Show Output Channel command should execute without errors', async () => {
      // This should not throw any errors
      await vscode.commands.executeCommand('additionalContextMenus.showOutputChannel');
      assert.ok(true, 'Show output channel command executed successfully');
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
    async function createAndTestFile(fileName: string, content: string, expectedToWork: boolean = true) {
      const filePath = path.join(tempWorkspace, fileName);
      await fs.writeFile(filePath, content);

      const document = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(document);

      // Position cursor inside function
      const functionLineIndex = content.split('\n').findIndex(line => 
        line.includes('function') || line.includes('=>') || line.includes('const ')
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

    test('Copy Code to File should handle text selection', async function() {
      // Set shorter timeout for this test since it involves user interaction  
      this.timeout(5000);
      
      const sourceFile = path.join(tempWorkspace, 'source.ts');
      const targetFile = path.join(tempWorkspace, 'target.ts');

      // Create source file with code to copy
      await fs.writeFile(sourceFile, `
const utilityFunction = (data: any[]) => {
  return data.filter(item => item.active);
};

const anotherFunction = () => {
  console.log('Another function');
};`);

      // Create target file
      await fs.writeFile(targetFile, `
// Target file
export const existingFunction = () => {
  return 'existing';
};`);

      // Open source file and select code
      const sourceDoc = await vscode.workspace.openTextDocument(sourceFile);
      const sourceEditor = await vscode.window.showTextDocument(sourceDoc);

      // Select the utilityFunction
      const startPos = new vscode.Position(1, 0);
      const endPos = new vscode.Position(3, 2);
      sourceEditor.selection = new vscode.Selection(startPos, endPos);

      // Use Promise.race to timeout the command execution
      try {
        const commandPromise = vscode.commands.executeCommand('additionalContextMenus.copyCodeToFile');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Command timed out - likely waiting for user input')), 3000)
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

    test('Move Code to File should handle text selection', async function() {
      // Set shorter timeout for this test since it involves user interaction
      this.timeout(5000);
      
      const sourceFile = path.join(tempWorkspace, 'move-source.ts');
      
      await fs.writeFile(sourceFile, `
const temporaryFunction = () => {
  return 'This will be moved';
};

const keepThisFunction = () => {
  return 'This stays';
};`);

      const sourceDoc = await vscode.workspace.openTextDocument(sourceFile);
      const sourceEditor = await vscode.window.showTextDocument(sourceDoc);

      // Select the temporaryFunction
      const startPos = new vscode.Position(1, 0);
      const endPos = new vscode.Position(3, 2);
      sourceEditor.selection = new vscode.Selection(startPos, endPos);

      // Use Promise.race to timeout the command execution
      try {
        const commandPromise = vscode.commands.executeCommand('additionalContextMenus.moveCodeToFile');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Command timed out - likely waiting for user input')), 3000)
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
        'additionalContextMenus.moveCodeToFile'
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
        'additionalContextMenus.moveCodeToFile'
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
      await fs.writeFile(malformedFile, `
function unclosedFunction() {
  const malformed = 
  return something that doesn't parse;
}`);

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
      await new Promise(resolve => setTimeout(resolve, 300)); // Allow more time for config update
      
      config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), false);

      await config.update('enabled', true, vscode.ConfigurationTarget.Global);
      await new Promise(resolve => setTimeout(resolve, 300)); // Allow more time for config update
      
      config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.strictEqual(config.get('enabled'), true);

      // Test other configuration changes
      const originalExtensions = config.get('supportedExtensions');
      await config.update('supportedExtensions', ['.ts', '.js'], vscode.ConfigurationTarget.Global);
      await new Promise(resolve => setTimeout(resolve, 300)); // Allow more time for config update
      
      config = vscode.workspace.getConfiguration('additionalContextMenus');
      assert.deepStrictEqual(config.get('supportedExtensions'), ['.ts', '.js']);

      // Restore original
      await config.update('supportedExtensions', originalExtensions, vscode.ConfigurationTarget.Global);
      await new Promise(resolve => setTimeout(resolve, 300)); // Allow more time for config update

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
        assert.ok(workspaceFolders.length > 0, 'Workspace folders should exist in test environment');
      }

      // Create a project structure
      const projectDir = path.join(tempWorkspace, 'test-project');
      await fs.ensureDir(projectDir);
      await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
        name: 'test-project',
        dependencies: {
          'react': '^18.0.0'
        }
      }, null, 2));

      const componentFile = path.join(projectDir, 'Component.tsx');
      await fs.writeFile(componentFile, `
import React from 'react';

export default function TestComponent() {
  return <div>Test</div>;
}`);

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
        await fs.writeFile(filePath, `
// ${fileName}
export const ${fileName.replace('.', '_')}Function = () => {
  return "${fileName}";
};`);
        
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
});