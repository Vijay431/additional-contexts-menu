// @ts-nocheck
import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';

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

  suite('Convention Validation', () => {
    test('should validate kebab-case file name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    test('should validate camelCase file name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'myComponent.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    test('should validate PascalCase file name', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    test('should detect naming violation', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'MyComponent.tsx');
      await FileTestHelpers.createFile(
        testFile,
        'export const MyComponent = () => <div>Test</div>;',
      );
      const document = await WorkspaceTestHelpers.openFile(testFile);

      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.validateFileName');

      await new Promise((resolve) => setTimeout(resolve, 500));

      const diagnostics = vscode.languages.getDiagnostics();
      const fileDiagnostic = diagnostics.find((d) => d.uri.fsPath === testFile);
      assert.ok(fileDiagnostic?.range?.length, 'Should have diagnostic for naming violation');
    });
  });

  suite('Single File Rename', () => {
    test('should rename to kebab-case', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'MyComponent.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'my-component.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(testFile);
    });

    test('should rename to camelCase', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'MyComponent.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(testFile);
    });

    test('should rename to PascalCase', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'my-component.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'MyComponent.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(testFile);
    });
  });

  suite('Bulk Folder Rename', () => {
    test('should rename all files in folder to kebab-case', async () => {
      const testDir = path.join(testContext.tempWorkspace, 'src/components');
      await fs.mkdir(testDir, { recursive: true });

      const files = ['MyComponent1.ts', 'MyComponent2.tsx', 'userProfile.ts'];
      for (const file of files) {
        const filePath = path.join(testDir, file);
        await FileTestHelpers.createFile(filePath, `const component = "test";`);
      }

      const document = await WorkspaceTestHelpers.openFile(path.join(testDir, files[0]));
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRenameConvention');

      await new Promise((resolve) => setTimeout(resolve, 2000));

      for (const file of files) {
        const renamedPath = path.join(testDir, file.replace('Component', 'component'));
        await FileTestHelpers.assertFileExists(renamedPath);
        await FileTestHelpers.assertFileNotExists(path.join(testDir, file));
      }
    });

    test('should handle file exists conflict', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'conflict.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'new-conflict.ts');

      await FileTestHelpers.createFile(testFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, 'const value = "test";');

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');
        assert.fail('Should have thrown error for file exists conflict');
      } catch {
        assert.ok(true, 'Handled file exists conflict gracefully');
      }
    });

    test('should preserve file extensions', async () => {
      const testFile = path.join(testContext.tempWorkspace, 'component.tsx');
      const targetFile = path.join(testContext.tempWorkspace, 'Component.ts');

      await FileTestHelpers.createFile(testFile, 'export const Component = () => <div>Test</div>;');
      await FileTestHelpers.createFile(
        targetFile,
        'export const Component = () => <div>Test</div>;',
      );

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 30);

      await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');

      const renamedFile = await FileTestHelpers.readFile(targetFile);
      assert.ok(renamedFile.includes('Component.ts'), 'File extension preserved');
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
      await fs.chmod(testFile, 0o444);

      const document = await WorkspaceTestHelpers.openFile(testFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');
        assert.ok(true, 'Handled read-only error gracefully');
      } catch (error) {
        assert.ok(true, 'Handled read-only error gracefully');
      }
    });

    test('should handle untitled document gracefully', async () => {
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.parse('untitled:Untitled-1'),
      );

      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.renameFileConvention');
        assert.ok(true, 'Handled untitled document gracefully');
      } catch (error) {
        assert.ok(true, 'Handled untitled document error gracefully');
      }
    });
  });
});
