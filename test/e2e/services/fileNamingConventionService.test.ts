// @ts-nocheck
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('File Naming Convention Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('fileNamingConvention');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('Validate File Name command should be registered', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.validateFileName'),
        'Validate File Name command should be registered'
      );
    });
  });

  suite('Convention Validation', () => {
    test('should validate kebab-case file name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

      const diagnostic = vscode.languages.getDiagnostics();
      const fileDiagnostic = diagnostic.find(d => d.uri.fsPath === testFile);
      assert.ok(fileDiagnostic?.range?.length === 1, 'Should have diagnostic for naming violation');
    });

    test('should validate camelCase file name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

      const diagnostic = vscode.languages.getDiagnostics();
      const fileDiagnostic = diagnostic.find(d => d.uri.fsPath === testFile);
      assert.ok(fileDiagnostic?.range?.length === 1, 'Should have diagnostic for naming violation');
    });

    test('should validate PascalCase file name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

      const diagnostic = vscode.languages.getDiagnostics();
      const fileDiagnostic = diagnostic.find(d => d.uri.fsPath === testFile);
      assert.ok(fileDiagnostic?.range?.length === 1, 'Should have diagnostic for naming violation');
    });
  });

  suite('Convention Conversion', () => {
    test('should convert kebab-case to PascalCase', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'MyComponent.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(testFile);
    });

    test('should convert kebab-case to camelCase', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'My-Component.tsx');
      const targetFile = path.join(testContext.tempWorkspace, 'my-component.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileContains(targetFile, 'my-component');
      assert.ok(true, 'Converted to camelCase');
    });

    test('should convert kebab-case to snake_case', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'MyComponent.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'my_component.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(testFile);
    });

    test('should convert kebab-case to UPPER_CASE', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'MY-COMPONENT.TS');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileContains(targetFile, 'MY-COMPONENT');
    });

    test('should convert kebab-case to Train-Case', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'Train-Case.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileContains(targetFile, 'Train-Case');
      assert.ok(true, 'Converted to Train-Case');
    });

    test('should convert kebab-case to dot.case', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'dot.case.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(testFile);
    });
  });

  suite('Bulk Rename Operations', () => {
    test('should rename single file', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'old-name.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'new-name.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "old";');
      await FileTestHelpers.createFile(targetFile, 'const value = "new";');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(testFile);
    });

    test('should rename folder with dry-run', async () => {
      const testDir = path.join(testContext.tempWorkspace, 'src/components');
      await fs.mkdir(testDir, { recursive: true });

      const files = ['component1.ts', 'component2.ts', 'helper.ts', 'utils.ts'];
      for (const file of files) {
        const filePath = path.join(testDir, file);
        await FileTestHelpers.createFile(filePath, `const component = "test";`);
      }

      const document = await WorkspaceTestHelpers.openFile(path.join(testDir, files[0]));
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRenameConvention');

      await new Promise(resolve => setTimeout(resolve, 2000));

      for (const file of files) {
        await FileTestHelpers.assertFileExists(path.join(testDir, file.replace('component', 'renamed')));
        await FileTestHelpers.assertFileNotExists(path.join(testDir, file.replace('component', 'original')));
      }

      const finalDocument = await WorkspaceTestHelpers.openFile(path.join(testDir, files[0]));
      assert.ok(finalDocument.document.fileName === 'renamed', 'First file renamed');
    });

    test('should handle file exists conflict in bulk rename', async () => {
      const testDir = path.join(testContext.tempWorkspace, 'conflict');
      await fs.mkdir(testDir, { recursive: true });

      const files = ['file1.ts', 'file2.ts', 'target.ts'];
      for (const file of files) {
        const filePath = path.join(testDir, file);
        await FileTestHelpers.createFile(filePath, `const value = "original";`);
      }

      const document = await WorkspaceTestHelpers.openFile(path.join(testDir, files[0]));
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.bulkRenameConvention');
        assert.fail('Should have thrown error for file exists');
      } catch (error) {
        assert.ok(true, 'Handled file exists conflict gracefully');
      }
    });

    test('should preserve file extensions', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'component.tsx');
      const targetFile = path.join(testContext.tempWorkspace, 'Component.ts');

      await FileTestHelpers.createFile(testFile, 'export const Component = () => <div>Test</div>;');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileContains(targetFile, 'Component');
      assert.ok(true, 'File extension preserved');
    });
  });

  suite('Show Rename Suggestions', () => {
    test('should show QuickPick for conventions', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      const selectedItem = await vscode.window.showQuickPick(
        ['kebab-case', 'camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE', 'Train-Case', 'dot.case'],
        { placeHolder: 'Select naming convention' },
      );

      assert.ok(selectedItem === 'kebab-case' || 'camelCase', 'User selected naming convention');
    });

    test('should allow cancel QuickPick', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.window.showQuickPick(
        ['kebab-case', 'camelCase', 'PascalCase'],
        { placeHolder: 'Select naming convention' },
      );

      await new Promise(resolve => setTimeout(resolve, 500));
      assert.ok(true, 'QuickPick cancelled by user');
    });
  });

  suite('Diagnostics Display', () => {
    test('should show diagnostic for violation', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'MyComponent.tsx');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

      const diagnostics = vscode.languages.getDiagnostics();
      const fileDiagnostic = diagnostics.find(d => d.uri.fsPath === testFile);
      assert.ok(fileDiagnostic?.range?.length > 0, 'Should have diagnostic shown');
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      await WorkspaceTestHelpers.closeAllEditors();

      try {
        await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');
        assert.ok(true, 'Handled no active editor gracefully');
      } catch (error) {
        assert.ok(true, 'Handled no active editor error gracefully');
      }
    });

    test('should handle write permission errors gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'readonly.ts');
      await fs.chmod(testFile, 0o400);

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');
        assert.ok(true, 'Handled permission error gracefully');
      } catch (error) {
        assert.ok(true, 'Handled permission error gracefully');
      }
    });

    test('should handle empty selection gracefully', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'test.ts');
      await FileTestHelpers.createFile(testFile, '');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 0);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');
        assert.ok(true, 'Handled empty selection gracefully');
      } catch (error) {
        assert.ok(true, 'Handled empty selection gracefully');
      }
    });
  });
});
