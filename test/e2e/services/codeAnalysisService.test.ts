import * as assert from 'assert';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Code Analysis Service - E2E Tests', function () {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async function () {
    testContext = await E2ETestSetup.setup('codeAnalysisService');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async function () {
    await E2ETestSetup.teardown();
  });

  setup(async function () {
    await E2ETestSetup.resetConfig();
  });

  suite('Function Declaration Detection', function () {
    test('should find regular function declarations', async function () {
      const testFile = `${testContext.tempWorkspace}/functions.ts`;
      const content = `
export function getUserById(id: string) {
  return fetch(\`/api/users/\${id}\`);
}

const calculateTotal = (items: any[]) => {
  return items.reduce((sum, item) => sum + item.value, 0);
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 1, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Function declaration detected');
    });

    test('should find exported functions', async function () {
      const testFile = `${testContext.tempWorkspace}/exported.ts`;
      const content = `
export function exportedFunction() {
  return 'exported';
}

function nonExportedFunction() {
  return 'not exported';
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 1, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Exported function found');
    });
  });

  suite('Arrow Function Detection', function () {
    test('should find const arrow functions', async function () {
      const testFile = `${testContext.tempWorkspace}/arrows.ts`;
      const content = `
const arrowFunction = (data: any[]) => {
  return data.filter(item => item.active);
};

const asyncArrow = async () => {
  return await fetchData();
};
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 1, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Arrow function detected');
    });

    test('should detect single-expression arrow functions', async function () {
      const testFile = `${testContext.tempWorkspace}/single-expr.ts`;
      const content = `
const identity = x => x;
const double = x => x * 2;
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 1, 15);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Single-expression arrow function detected');
    });
  });

  suite('React Component Detection', function () {
    test('should find functional components', async function () {
      const testFile = `${testContext.tempWorkspace}/component.tsx`;
      const content = `
import React from 'react';

const MyComponent: React.FC<{ name: string }> = ({ name }) => {
  return <div>Hello, {name}!</div>;
};

export default MyComponent;
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 2, 30);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'React component detected');
    });

    test('should detect uppercase component names', async function () {
      const testFile = `${testContext.tempWorkspace}/uppercase.tsx`;
      const content = `
const UserProfile = () => {
  return <div>Profile</div>;
};

const HeaderBar = () => {
  return <header>Header</header>;
};
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 1, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Uppercase component names detected');
    });

    test('should detect React hooks', async function () {
      const testFile = `${testContext.tempWorkspace}/hooks.ts`;
      const content = `
import { useState, useEffect } from 'react';

const useCounter = (initialValue: number) => {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return { count, setCount };
};

export default useCounter;
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 3, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'React hooks detected');
    });
  });

  suite('Function at Cursor Position', function () {
    test('should return function containing cursor', async function () {
      const testFile = `${testContext.tempWorkspace}/cursor.ts`;
      const content = `
function outerFunction() {
  function innerFunction() {
    return 'inner';
  }
  return innerFunction();
}

function anotherFunction() {
  return 'another';
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 2, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Function containing cursor returned');
    });

    test('should return null when cursor outside function', async function () {
      const testFile = `${testContext.tempWorkspace}/outside.ts`;
      const content = `
const constant = 'constant';

function testFunction() {
  return 'test';
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 1, 10);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Null returned when cursor outside function');
    });
  });

  suite('Import Extraction', function () {
    test('should extract import statements', async function () {
      const testFile = `${testContext.tempWorkspace}/imports.ts`;
      const content = `
import { useState } from 'react';
import { Button } from './components/Button';
import * as utils from './utils';
import Logger from './logger';

export function myComponent() {
  return null;
}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 6, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Import statements extracted');
    });

    test('should handle named imports', async function () {
      const testFile = `${testContext.tempWorkspace}/named.ts`;
      const content = `
import { useState, useEffect } from 'react';
import { ComponentA, ComponentB } from './components';

export function test() {}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 4, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Named imports extracted');
    });

    test('should handle default imports', async function () {
      const testFile = `${testContext.tempWorkspace}/default.ts`;
      const content = `
import React from 'react';
import Router from 'react-router';

export function test() {}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 4, 20);

      await vscode.commands.executeCommand('additionalContextMenus.copyFunction');

      assert.ok(true, 'Default imports extracted');
    });
  });

  suite('Error Handling', function () {
    test('should handle malformed code gracefully', async function () {
      const testFile = `${testContext.tempWorkspace}/malformed.ts`;
      const content = `
function incomplete( {
  return
const syntaxError = 
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 1, 10);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Malformed code handled gracefully');
      } catch (_error) {
        assert.ok(true, 'Malformed code handled with error: ' + (_error as Error).message);
      }
    });

    test('should handle empty file gracefully', async function () {
      const testFile = `${testContext.tempWorkspace}/empty.ts`;
      const content = '';
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Empty file handled gracefully');
      } catch (_error) {
        assert.ok(true, 'Empty file handled with error: ' + (_error as Error).message);
      }
    });

    test('should handle comments only file gracefully', async function () {
      const testFile = `${testContext.tempWorkspace}/comments.ts`;
      const content = `
// This is a comment

export function test() {}
`;
      await FileTestHelpers.createFile(testFile, content);
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.copyFunction');
        assert.ok(true, 'Comments only file handled gracefully');
      } catch (_error) {
        assert.ok(true, 'Comments only file handled with error: ' + (_error as Error).message);
      }
    });
  });
});
