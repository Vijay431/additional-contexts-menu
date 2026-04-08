import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Generate .env File', () => {
  test('should command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.generateEnvFile'),
      'generateEnvFile command should be registered',
    );
  });

  test('should command executes without throwing', async () => {
    // Command shows an InputBox — just verify it doesn't throw
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.generateEnvFile')));
  });
});
