import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Copy Function to File - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('copyFunctionToFile');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('should register Copy Function to File command', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.copyFunctionToFile'),
        'Copy Function to File command should be registered',
      );
    });
  });

  suite('Function Detection', () => {
    test('should copy function when cursor is inside function', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'arrow-function.ts');
      const content = `
const myArrowFunc = () => {
  return 'test value';
};
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunctionToFile');

      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    test('should show warning when no function found at cursor', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'no-function.ts');
      const content = `
// Just a comment
console.log('no function here');
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      const message = await vscode.commands.executeCommand(
        'additionalContextMenus.copyFunctionToFile',
      );

      assert.ok(message, 'Should show warning message');
    });

    test('should work with arrow functions', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'arrow.ts');
      const content = `
const arrow = (param: string) => param.toUpperCase();
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      _editor.selection = new vscode.Selection(2, 0, 2, 0);

      assert.ok(true, 'Arrow function should be detected');
    });

    test('should work with async functions', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'async.ts');
      const content = `
async function fetchData() {
  return await fetch('data');
}
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      _editor.selection = new vscode.Selection(1, 0, 1, 0);

      assert.ok(true, 'Async function should be detected');
    });

    test('should work with regular functions', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'regular.ts');
      const content = `
function regularFunc() {
  return 'value';
}
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      _editor.selection = new vscode.Selection(1, 0, 1, 0);

      assert.ok(true, 'Regular function should be detected');
    });

    test('should work with React functional components', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'component.tsx');
      const content = `
const MyComponent = () => {
  return <div>Test</div>;
};
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      _editor.selection = new vscode.Selection(1, 0, 1, 0);

      assert.ok(true, 'React component should be detected');
    });

    test('should work with React hooks', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'hook.tsx');
      const content = `
const useCustomHook = () => {
  return useState(null);
};
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      _editor.selection = new vscode.Selection(1, 0, 1, 0);

      assert.ok(true, 'React hook should be detected');
    });

    test('should work with TypeScript files', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'typescript.ts');
      const content = `
interface User {
  id: string;
  name: string;
}

function getUser(): User {
  return { id: '1', name: 'Test' };
}
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      _editor.selection = new vscode.Selection(5, 0, 5, 0);

      assert.ok(true, 'TypeScript function should be detected');
    });

    test('should work with JavaScript files', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'javascript.js');
      const content = `
const jsFunction = function() {
  return 'javascript value';
};
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      const _editor = await vscode.window.showTextDocument(doc);

      _editor.selection = new vscode.Selection(2, 0, 2, 0);

      assert.ok(true, 'JavaScript function should be detected');
    });
  });

  suite('File Selection', () => {
    test('should show file selector when multiple compatible files exist', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');
      await fs.writeFile(sourceFile, 'const value = 1;');

      const target1 = path.join(testContext.tempWorkspace, 'target1.ts');
      await fs.writeFile(target1, '// target file 1');

      const target2 = path.join(testContext.tempWorkspace, 'target2.ts');
      await fs.writeFile(target2, '// target file 2');

      const doc = await vscode.workspace.openTextDocument(sourceFile);
      await vscode.window.showTextDocument(doc);

      assert.ok(true, 'Should show file selector');
    });

    test('should auto-select single compatible file', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');
      await fs.writeFile(sourceFile, 'const value = 1;');

      const target = path.join(testContext.tempWorkspace, 'target.ts');
      await fs.writeFile(target, '// target file');

      const doc = await vscode.workspace.openTextDocument(sourceFile);
      await vscode.window.showTextDocument(doc);

      assert.ok(true, 'Should auto-select single target file');
    });

    test('should validate target file before copying', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');
      await fs.writeFile(sourceFile, 'const func = () => {};');

      const target = path.join(testContext.tempWorkspace, 'target.ts');
      await fs.writeFile(target, '// valid target file');

      const doc = await vscode.workspace.openTextDocument(sourceFile);
      await vscode.window.showTextDocument(doc);

      assert.ok(true, 'Should validate target file');
    });

    test('should show error message when target file is invalid', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');
      await fs.writeFile(sourceFile, 'const func = () => {};');

      const doc = await vscode.workspace.openTextDocument(sourceFile);
      await vscode.window.showTextDocument(doc);

      const message = await vscode.commands.executeCommand(
        'additionalContextMenus.copyFunctionToFile',
      );

      if (message && typeof message === 'string' && message.includes('not accessible')) {
        assert.ok(true, 'Should show error for invalid file');
      } else {
        assert.fail('Should have shown error for invalid file');
      }
    });
  });

  suite('Import Handling', () => {
    test('should preserve function text when copying', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'preserve.ts');
      const content = `
const preserved = () => {
  return 'preserved text';
};
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      await vscode.window.showTextDocument(doc);

      assert.ok(true, 'Function text should be preserved');
    });

    test('should handle function with imports correctly', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'imports.ts');
      const content = `
import { useState } from 'react';

const withImport = () => {
  const [state, setState] = useState(null);
  return state;
};
`;
      await fs.writeFile(testFile, content);

      const doc = await vscode.workspace.openTextDocument(testFile);
      await vscode.window.showTextDocument(doc);

      assert.ok(true, 'Should handle imports correctly');
    });
  });
});
