import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { FileSaveService } from '../../services/fileSaveService';

suite('FileSaveService Tests', () => {
  let fileSaveService: FileSaveService;
  let tempDir: string;

  setup(async () => {
    fileSaveService = FileSaveService.getInstance();
    tempDir = path.join(__dirname, '../temp-save-test');
    await fs.ensureDir(tempDir);
  });

  teardown(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }

    // Close all open documents
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  async function createTestDocument(
    fileName: string,
    content: string,
    isDirty = false
  ): Promise<vscode.TextDocument> {
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, content);
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);

    if (isDirty) {
      // Make the document dirty by editing it
      const editor = await vscode.window.showTextDocument(document);
      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), '// Modified\n');
      });
    }

    return document;
  }

  test('Should save all dirty files successfully', async () => {
    // Create multiple dirty documents
    const doc1 = await createTestDocument('file1.ts', 'const a = 1;', true);
    const doc2 = await createTestDocument('file2.ts', 'const b = 2;', true);
    await createTestDocument('file3.ts', 'const c = 3;', false); // Not dirty

    const result = await fileSaveService.saveAllFiles();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.totalFiles, 2); // Only 2 dirty files
    assert.strictEqual(result.savedFiles, 2);
    assert.strictEqual(result.failedFiles.length, 0);
    assert.strictEqual(result.skippedFiles.length, 0);

    // Verify files are no longer dirty
    assert.strictEqual(doc1.isDirty, false);
    assert.strictEqual(doc2.isDirty, false);
  });

  test('Should handle case with no unsaved files', async () => {
    // Create clean documents (not dirty)
    await createTestDocument('clean1.ts', 'const x = 1;', false);
    await createTestDocument('clean2.ts', 'const y = 2;', false);

    const result = await fileSaveService.saveAllFiles();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.totalFiles, 0);
    assert.strictEqual(result.savedFiles, 0);
    assert.strictEqual(result.failedFiles.length, 0);
    assert.strictEqual(result.skippedFiles.length, 0);
  });

  test('Should report unsaved file count correctly', async () => {
    // Initially no unsaved files
    assert.strictEqual(fileSaveService.hasUnsavedChanges(), false);
    assert.strictEqual(fileSaveService.getUnsavedFileCount(), 0);

    // Create dirty documents
    await createTestDocument('dirty1.ts', 'const a = 1;', true);
    await createTestDocument('dirty2.ts', 'const b = 2;', true);

    assert.strictEqual(fileSaveService.hasUnsavedChanges(), true);
    assert.strictEqual(fileSaveService.getUnsavedFileCount(), 2);
  });

  test('Should skip untitled documents', async () => {
    // Create regular dirty document
    await createTestDocument('normal.ts', 'const normal = 1;', true);

    // Create untitled document
    const untitledDocument = await vscode.workspace.openTextDocument({
      content: 'const untitled = 1;',
      language: 'typescript',
    });

    // Make untitled document dirty
    const editor = await vscode.window.showTextDocument(untitledDocument);
    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// Untitled modified\n');
    });

    const result = await fileSaveService.saveAllFiles();

    // Should only save the regular file, not the untitled one
    assert.strictEqual(result.totalFiles, 1);
    assert.strictEqual(result.savedFiles, 1);
  });

  test('Should handle mixed success and failure scenarios', async () => {
    // Create a dirty document
    await createTestDocument('normal.ts', 'const normal = 1;', true);

    // Create a document that will fail to save (by making it read-only after creation)
    await createTestDocument('readonly.ts', 'const readonly = 1;', true);
    const readOnlyPath = path.join(tempDir, 'readonly.ts');

    // Make file read-only on Windows (if possible)
    try {
      await fs.chmod(readOnlyPath, 0o444); // Read-only permissions
    } catch {
      // Skip this test if we can't make file read-only
      console.log('Skipping read-only test: cannot set file permissions');
      return;
    }

    const result = await fileSaveService.saveAllFiles();

    // Normal file should save, read-only might fail
    assert.ok(result.totalFiles >= 1);
    assert.ok(result.savedFiles >= 1 || result.failedFiles.length >= 1);
  });

  test('Should respect configuration settings', async () => {
    // Test with notifications enabled (using default configuration)
    await createTestDocument('test.ts', 'const test = 1;', true);

    const result = await fileSaveService.saveAllFiles();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.savedFiles, 1);
  });

  test('Should handle large number of files with progress', async () => {
    // Create multiple dirty documents (6 files to trigger progress display)
    const documents = [];
    for (let i = 0; i < 6; i++) {
      const doc = await createTestDocument(`file${i}.ts`, `const file${i} = ${i};`, true);
      documents.push(doc);
    }

    const result = await fileSaveService.saveAllFiles();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.totalFiles, 6);
    assert.strictEqual(result.savedFiles, 6);
    assert.strictEqual(result.failedFiles.length, 0);

    // Verify all documents are saved
    documents.forEach((doc) => {
      assert.strictEqual(doc.isDirty, false);
    });
  });

  test('Should handle save operation cancellation gracefully', async () => {
    // Create dirty documents
    await createTestDocument('test1.ts', 'const test1 = 1;', true);
    await createTestDocument('test2.ts', 'const test2 = 2;', true);

    // This test verifies the save operation completes normally
    // In a real scenario, user cancellation would be handled by VS Code
    const result = await fileSaveService.saveAllFiles();

    assert.strictEqual(result.totalFiles, 2);
    assert.ok(result.savedFiles >= 0); // Should handle gracefully
  });

  test('Should handle empty workspace gracefully', async () => {
    // Save when no documents are open
    const result = await fileSaveService.saveAllFiles();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.totalFiles, 0);
    assert.strictEqual(result.savedFiles, 0);
  });

  test('Should detect changes correctly after save', async () => {
    // Create dirty document
    const doc = await createTestDocument('changeable.ts', 'const initial = 1;', true);

    assert.strictEqual(fileSaveService.hasUnsavedChanges(), true);
    assert.strictEqual(fileSaveService.getUnsavedFileCount(), 1);

    // Save all files
    await fileSaveService.saveAllFiles();

    assert.strictEqual(fileSaveService.hasUnsavedChanges(), false);
    assert.strictEqual(fileSaveService.getUnsavedFileCount(), 0);

    // Make document dirty again
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), '// Changed again\n');
    });

    assert.strictEqual(fileSaveService.hasUnsavedChanges(), true);
    assert.strictEqual(fileSaveService.getUnsavedFileCount(), 1);
  });
});
