import * as assert from 'assert';
import * as vscode from 'vscode';

export class CommandValidator {
  public static async assertCommandsRegistered(expectedCommands: string[]): Promise<void> {
    const commands = await vscode.commands.getCommands();
    const ourCommands = commands.filter((cmd) => cmd.startsWith('additionalContextMenus.'));

    for (const command of expectedCommands) {
      assert.ok(
        commands.includes(command),
        `Command ${command} should be registered. Available commands: ${ourCommands.join(', ')}`,
      );
    }
  }

  public static async assertCommandNotRegistered(command: string): Promise<void> {
    const commands = await vscode.commands.getCommands();
    assert.ok(!commands.includes(command), `Command ${command} should NOT be registered`);
  }

  public static async getAllExtensionCommands(): Promise<string[]> {
    const commands = await vscode.commands.getCommands();
    return commands.filter((cmd) => cmd.startsWith('additionalContextMenus.'));
  }
}
