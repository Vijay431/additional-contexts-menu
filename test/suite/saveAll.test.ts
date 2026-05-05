import * as assert from 'assert';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

async function openTsFile(content: string): Promise<{ doc: vscode.TextDocument; filePath: string }> {
  const filePath = path.join(os.tmpdir(), `acm-save-test-${Date.now()}.ts`);
  await fs.writeFile(filePath, content, 'utf-8');
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
  return { doc, filePath };
}

suite('Save All', () => {
  test('should command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.saveAll'),
      'saveAll command should be registered',
    );
  });

  test('should execute without error when no dirty files', async () => {
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.saveAll')),
    );
  });

  test('should save a dirty document and mark it clean', async () => {
    const { doc } = await openTsFile('const initial = 1;');

    // Make the document dirty via a workspace edit
    const edit = new vscode.WorkspaceEdit();
    edit.insert(doc.uri, new vscode.Position(0, 0), '// edited\n');
    await vscode.workspace.applyEdit(edit);

    assert.ok(doc.isDirty, 'Document should be dirty after edit');

    await vscode.commands.executeCommand('additionalContextMenus.saveAll');

    // Give VS Code time to flush the save
    await new Promise((r) => setTimeout(r, 300));

    assert.ok(!doc.isDirty, 'Document should not be dirty after saveAll');
  });

  test('should execute without error when an untitled document is open', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'const x = 1;',
      language: 'typescript',
    });
    await vscode.window.showTextDocument(doc);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.saveAll')),
    );
  });
});
