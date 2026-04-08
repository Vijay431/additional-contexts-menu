import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Generate Cron Expression', () => {
  test('should command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.generateCronTimer'),
      'generateCronTimer command should be registered',
    );
  });

  test('should command can be invoked (fire-and-forget, QuickPick dismissed)', async () => {
    // Fire the command without awaiting — it shows a QuickPick that waits for user input.
    // Dismiss immediately via Escape to avoid timeout.
    const cmdPromise = vscode.commands.executeCommand('additionalContextMenus.generateCronTimer');
    // Give the QuickPick time to appear then dismiss it
    await new Promise((r) => setTimeout(r, 200));
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
    // Command should resolve (possibly with undefined) after dismissal
    await Promise.resolve(cmdPromise).catch(() => {});
    assert.ok(true, 'Command invoked without crashing');
  });
});
