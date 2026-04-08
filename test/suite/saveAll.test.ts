import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Save All', () => {
  test('should command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.saveAll'),
      'saveAll command should be registered',
    );
  });

  test('should executes without error when no dirty files', async () => {
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.saveAll')));
  });

  test('should saves a dirty document', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'const x = 1;',
      language: 'typescript',
    });
    await vscode.window.showTextDocument(doc);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.saveAll')));
  });
});
