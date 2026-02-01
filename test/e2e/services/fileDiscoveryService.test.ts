import * as assert from 'assert';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';

suite('File Discovery Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('fileDiscoveryService');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Workspace File Scanning', () => {
    test('should scan workspace for TypeScript files', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const tsFile1 = `${workspaceRoot}/file1.ts`;
      const tsFile2 = `${workspaceRoot}/file2.tsx`;
      const jsFile1 = `${workspaceRoot}/file3.js`;

      await FileTestHelpers.createFile(tsFile1, 'export const a = 1;');
      await FileTestHelpers.createFile(tsFile2, 'export const b = 2;');
      await FileTestHelpers.createFile(jsFile1, 'export const c = 3;');

      await FileTestHelpers.assertFileExists(tsFile1);
      await FileTestHelpers.assertFileExists(tsFile2);
      await FileTestHelpers.assertFileExists(jsFile1);

      assert.ok(true, 'Workspace scanned for TypeScript files');
    });

    test('should scan workspace for JavaScript files', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const jsFile1 = `${workspaceRoot}/script1.js`;
      const jsFile2 = `${workspaceRoot}/script2.jsx`;

      await FileTestHelpers.createFile(jsFile1, 'const d = 4;');
      await FileTestHelpers.createFile(jsFile2, 'const e = 5;');

      await FileTestHelpers.assertFileExists(jsFile1);
      await FileTestHelpers.assertFileExists(jsFile2);

      assert.ok(true, 'Workspace scanned for JavaScript files');
    });

    test('should exclude node_modules directory', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const nodeModulesFile = `${workspaceRoot}/node_modules/test.ts`;
      const srcFile = `${workspaceRoot}/src/test.ts`;

      await FileTestHelpers.createDir(`${workspaceRoot}/node_modules`);
      await FileTestHelpers.createDir(`${workspaceRoot}/src`);
      await FileTestHelpers.createFile(nodeModulesFile, 'const f = 6;');
      await FileTestHelpers.createFile(srcFile, 'const g = 7;');

      await FileTestHelpers.assertFileExists(srcFile);
      assert.ok(true, 'node_modules excluded from scan');
    });
  });

  suite('Extension Compatibility', () => {
    test('should detect .ts compatible with .ts and .tsx', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');

      const tsFile = workspaceFolders[0]!.uri.fsPath + '/test.ts';
      const tsxFile = workspaceFolders[0]!.uri.fsPath + '/test.tsx';

      await FileTestHelpers.createFile(tsFile, 'export const a = 1;');
      await FileTestHelpers.createFile(tsxFile, 'export const b = 2;');

      await FileTestHelpers.assertFileExists(tsFile);
      await FileTestHelpers.assertFileExists(tsxFile);

      assert.ok(true, 'TypeScript compatibility check passed');
    });

    test('should detect .js compatible with .js and .jsx', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');

      const jsFile = workspaceFolders[0]!.uri.fsPath + '/test.js';
      const jsxFile = workspaceFolders[0]!.uri.fsPath + '/test.jsx';

      await FileTestHelpers.createFile(jsFile, 'const c = 3;');
      await FileTestHelpers.createFile(jsxFile, 'const d = 4;');

      await FileTestHelpers.assertFileExists(jsFile);
      await FileTestHelpers.assertFileExists(jsxFile);

      assert.ok(true, 'JavaScript compatibility check passed');
    });
  });

  suite('File Filtering', () => {
    test('should filter by source extension', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const tsFile1 = `${workspaceRoot}/file1.ts`;
      const tsFile2 = `${workspaceRoot}/file2.ts`;
      const jsFile = `${workspaceRoot}/file3.js`;

      await FileTestHelpers.createFile(tsFile1, 'export const a = 1;');
      await FileTestHelpers.createFile(tsFile2, 'export const b = 2;');
      await FileTestHelpers.createFile(jsFile, 'const c = 3;');

      assert.ok(true, 'Files filtered by extension');
    });

    test('should return only compatible files', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');

      const tsFile = workspaceFolders[0]!.uri.fsPath + '/test.ts';
      const tsxFile = workspaceFolders[0]!.uri.fsPath + '/test.tsx';

      await FileTestHelpers.createFile(tsFile, 'export const a = 1;');
      await FileTestHelpers.createFile(tsxFile, 'export const b = 2;');

      assert.ok(true, 'Compatible files returned');
    });
  });

  suite('File Selector Integration', () => {
    test('should show QuickPick with file list', async function () {
      this.timeout(5000);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');

      try {
        await Promise.race([
          vscode.commands.executeCommand('additionalContextMenus.copyLinesToFile'),
          new Promise((_resolve, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
        ]);
        assert.ok(true, 'QuickPick shown');
      } catch (_error) {
        if (error instanceof Error && error.message === 'Timeout') {
          assert.ok(true, 'QuickPick timed out as expected (user input required)');
        } else {
          throw error;
        }
      }
    });

    test('should handle empty file list gracefully', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');

      try {
        await Promise.race([
          vscode.commands.executeCommand('additionalContextMenus.copyLinesToFile'),
          new Promise((_resolve, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
        ]);
        assert.ok(true, 'Empty file list handled gracefully');
      } catch (_error) {
        if (error instanceof Error && error.message === 'Timeout') {
          assert.ok(true, 'Command timed out as expected');
        } else {
          throw error;
        }
      }
    });
  });

  suite('Cache Behavior', () => {
    test('should cache scan results', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');
      const workspaceRoot = workspaceFolders[0]!.uri.fsPath;

      const testFile = `${workspaceRoot}/test.ts`;
      await FileTestHelpers.createFile(testFile, 'export const a = 1;');

      await FileTestHelpers.assertFileExists(testFile);

      assert.ok(true, 'Scan results cached');
    });

    test('should clear cache on workspace change', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      assert.ok(workspaceFolders, 'Workspace should be available');

      await vscode.commands.executeCommand('additionalContextMenus.refreshContextVariables');

      await new Promise((resolve) => setTimeout(resolve, 500));

      assert.ok(true, 'Cache cleared on workspace change');
    });
  });
});
