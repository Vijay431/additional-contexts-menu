import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Open in Terminal', () => {
  test('should command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.openInTerminal'),
      'openInTerminal command should be registered',
    );
  });

  test('should executes without error when a file is open', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'const x = 1;',
      language: 'typescript',
    });
    await vscode.window.showTextDocument(doc);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.openInTerminal')));
  });
});
