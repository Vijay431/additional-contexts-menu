import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Generate Enum', () => {
  test('should command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.generateEnum'),
      'generateEnum command should be registered',
    );
  });

  test('should parseUnionType extracts values from type alias', () => {
    const { EnumGeneratorService } = require('../../src/services/enumGeneratorService');
    const svc = EnumGeneratorService.getInstance();
    const result = svc.parseUnionType(`type Status = 'pending' | 'approved' | 'rejected';`);
    assert.ok(result, 'Should parse union type');
    assert.strictEqual(result!.variableName, 'Status');
    assert.deepStrictEqual(result!.values, ['pending', 'approved', 'rejected']);
  });

  test('should parseUnionType returns null for non-union text', () => {
    const { EnumGeneratorService } = require('../../src/services/enumGeneratorService');
    const svc = EnumGeneratorService.getInstance();
    const result = svc.parseUnionType(`const x = 1;`);
    assert.strictEqual(result, null);
  });

  test('should command handles empty selection gracefully', async () => {
    const doc = await vscode.workspace.openTextDocument({ content: '', language: 'typescript' });
    await vscode.window.showTextDocument(doc);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.generateEnum')));
  });
});
