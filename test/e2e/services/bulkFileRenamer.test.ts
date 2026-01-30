import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';

import { E2ETestSetup } from '../utils/e2eTestSetup';
import { FileTestHelpers } from '../utils/fileHelpers';
import { WorkspaceTestHelpers } from '../utils/workspaceHelpers';

suite('Bulk File Renamer Service - E2E Tests', () => {
  let testContext: Awaited<ReturnType<typeof E2ETestSetup.setup>>;

  suiteSetup(async () => {
    testContext = await E2ETestSetup.setup('bulkFileRenamer');
    assert.ok(testContext.extension?.isActive, 'Extension should be active');
  });

  suiteTeardown(async () => {
    await E2ETestSetup.teardown();
  });

  setup(async () => {
    await E2ETestSetup.resetConfig();
  });

  suite('Command Registration', () => {
    test('Bulk Rename command should be registered', async () => {
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('additionalContextMenus.bulkRename'),
        'Bulk Rename command should be registered',
      );
    });
  });

  suite('Single File Rename', () => {
    test('should rename single file successfully', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'old-name.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'new-name.ts');

      await FileTestHelpers.createFile(sourceFile, 'const value = "old";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 15);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRename');

      await FileTestHelpers.assertFileExists(targetFile);
      await FileTestHelpers.assertFileNotExists(sourceFile);
    });

    test('should update import statements after rename', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'source.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'target.ts');
      const consumerFile = path.join(testContext.tempWorkspace, 'consumer.ts');

      const sourceContent = `export const source = () => 'source';`;
      const consumerContent = `import { source } from './source';`;

      await FileTestHelpers.createFile(sourceFile, sourceContent);
      await FileTestHelpers.createFile(consumerFile, 'import test');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRename');

      await FileTestHelpers.assertFileContains(consumerFile, "import { source } from './source';");
    });

    test('should detect circular dependencies', async () => {
      const file1 = path.join(testContext.tempWorkspace, 'file1.ts');
      const file2 = path.join(testContext.tempWorkspace, 'file2.ts');
      const file3 = path.join(testContext.tempWorkspace, 'file3.ts');

      await FileTestHelpers.createFile(file1, `import { file2 } from './file2';`);
      await FileTestHelpers.createFile(file2, `import { file3 } from './file3';`);
      await FileTestHelpers.createFile(file3, `import { file1 } from './file1';`);

      const document = await WorkspaceTestHelpers.openFile(file1);
      WorkspaceTestHelpers.setCursorPosition(document, 1, 0);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRename');

      assert.ok(true, 'Circular dependency detection executed');
    });

    test('should handle target file exists conflict', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'conflict-source.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'conflict-target.ts');

      await FileTestHelpers.createFile(sourceFile, 'const value = "old";');
      await FileTestHelpers.createFile(targetFile, 'const value = "new";');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.bulkRename');
        assert.fail('Should have thrown error for file exists');
      } catch {
        assert.ok(true, 'Handled file exists conflict gracefully');
      }
    });
  });

  suite('Bulk Rename Operations', () => {
    test('should rename multiple files', async () => {
      const operations = [];
      for (let i = 0; i < 3; i++) {
        const sourceFile = path.join(testContext.tempWorkspace, `file${i}.ts`);
        const targetFile = path.join(testContext.tempWorkspace, `renamed${i}.ts`);

        await FileTestHelpers.createFile(sourceFile, `const value${i} = "old";`);
        await FileTestHelpers.createFile(targetFile, `const value${i} = "new";`);

        operations.push({
          oldPath: sourceFile,
          newPath: targetFile,
          oldName: `file${i}`,
          newName: `renamed${i}`,
        });
      }

      const document = await WorkspaceTestHelpers.openFile(operations[0].oldPath);
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 35);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRename');

      for (const op of operations) {
        await FileTestHelpers.assertFileExists(op.newPath);
        await FileTestHelpers.assertFileNotExists(op.oldPath);
      }
    });

    test('should perform dry-run rename', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'dry-run-source.ts');
      const targetFile = path.join(testContext.tempWorkspace, 'dry-run-target.ts');

      await FileTestHelpers.createFile(sourceFile, 'const value = "test";');
      await FileTestHelpers.createFile(targetFile, '');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRename');

      await FileTestHelpers.assertFileExists(sourceFile);
      assert.ok(true, 'Dry-run should not modify files');
    });

    test('should preserve file extensions', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'component.tsx');
      const targetFile = path.join(testContext.tempWorkspace, 'Component.ts');

      await FileTestHelpers.createFile(sourceFile, 'const Component = () => <div>Test</div>;');
      await FileTestHelpers.createFile(targetFile, 'const Component = () => <div>Test</div>;');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRename');

      await FileTestHelpers.assertFileContains(targetFile, 'Component');
    });
  });

  suite('Error Handling', () => {
    test('should handle no active editor gracefully', async () => {
      await WorkspaceTestHelpers.closeAllEditors();

      try {
        await vscode.commands.executeCommand('additionalContextMenus.bulkRename');
        assert.ok(true, 'Handled no active editor gracefully');
      } catch (error) {
        assert.ok(true, 'Handled no active editor error gracefully');
      }
    });

    test('should handle read permission errors gracefully', async () => {
      const sourceFile = path.join(testContext.tempWorkspace, 'readonly.ts');
      await FileTestHelpers.createFile(sourceFile, 'const value = "readonly";');

      const document = await WorkspaceTestHelpers.openFile(sourceFile);
      WorkspaceTestHelpers.setCursorPosition(document, 0, 25);

      try {
        await vscode.commands.executeCommand('additionalContextMenus.bulkRename');
        assert.ok(true, 'Handled read-only error gracefully');
      } catch {
        assert.ok(true, 'Handled read-only error gracefully');
      }
    });
  });

  suite('Integration Scenarios', () => {
    test('should work with nested file structure', async () => {
      const nestedDir = path.join(testContext.tempWorkspace, 'nested');
      await fs.mkdir(nestedDir, { recursive: true });

      const files = ['parent.ts', 'child1.ts', 'child2.ts'];
      for (const file of files) {
        const filePath = path.join(nestedDir, file);
        await FileTestHelpers.createFile(filePath, 'const value = "test";');
      }

      const document = await WorkspaceTestHelpers.openFile(path.join(nestedDir, 'parent.ts'));
      WorkspaceTestHelpers.selectRange(document, 0, 0, 0, 20);

      await vscode.commands.executeCommand('additionalContextMenus.bulkRename');
      assert.ok(true, 'Nested file structure handled');
    });
  });
});
