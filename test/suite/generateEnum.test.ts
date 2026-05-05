import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

async function openTsFile(content: string): Promise<vscode.TextDocument> {
  const tmpFile = path.join(os.tmpdir(), `acm-enum-test-${Date.now()}.ts`);
  await fs.writeFile(tmpFile, content, 'utf-8');
  const doc = await vscode.workspace.openTextDocument(tmpFile);
  await vscode.window.showTextDocument(doc);
  return doc;
}

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

  test('should generateEnum produces valid TypeScript enum string', () => {
    const { EnumGeneratorService } = require('../../src/services/enumGeneratorService');
    const svc = EnumGeneratorService.getInstance();
    const enumStr = svc.generateEnum(['pending', 'approved', 'rejected'], 'Status', 'UPPER_CASE');
    assert.ok(enumStr.includes('export enum Status'), 'Should declare named enum');
    assert.ok(enumStr.includes("PENDING = 'pending'"), 'Should include PENDING value');
    assert.ok(enumStr.includes("APPROVED = 'approved'"), 'Should include APPROVED value');
    assert.ok(enumStr.includes("REJECTED = 'rejected'"), 'Should include REJECTED value');
  });

  test('should formatEnumMember correctly converts values per convention', () => {
    const { EnumGeneratorService } = require('../../src/services/enumGeneratorService');
    const svc = EnumGeneratorService.getInstance();
    assert.strictEqual(svc.formatEnumMember('my-value', 'UPPER_CASE'), 'MY_VALUE');
    assert.strictEqual(svc.formatEnumMember('my-value', 'PascalCase'), 'MyValue');
    assert.strictEqual(svc.formatEnumMember('my-value', 'camelCase'), 'myValue');
  });

  test('should handle empty selection gracefully', async () => {
    const doc = await vscode.workspace.openTextDocument({ content: '', language: 'typescript' });
    await vscode.window.showTextDocument(doc);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.generateEnum')),
    );
  });

  test('should handle selection that is not a union type gracefully', async () => {
    await openTsFile('const x = 1;\nconst y = 2;');
    const editor = vscode.window.activeTextEditor!;
    // Select the non-union text
    editor.selection = new vscode.Selection(0, 0, 0, 12);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.generateEnum')),
    );
  });

  test('should extractUnionValues extracts double-quoted values', () => {
    const { EnumGeneratorService } = require('../../src/services/enumGeneratorService');
    const svc = EnumGeneratorService.getInstance();
    const values = svc.extractUnionValues('"pending" | "approved"');
    assert.deepStrictEqual(values, ['pending', 'approved']);
  });
});
