import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

const createdTmpFiles: string[] = [];

async function openTsFile(content: string): Promise<vscode.TextDocument> {
  const tmpFile = path.join(os.tmpdir(), `acm-fn-test-${Date.now()}.ts`);
  await fs.writeFile(tmpFile, content, 'utf-8');
  createdTmpFiles.push(tmpFile);
  const doc = await vscode.workspace.openTextDocument(tmpFile);
  await vscode.window.showTextDocument(doc);
  return doc;
}

suiteTeardown(async () => {
  for (const f of createdTmpFiles) {
    await fs.unlink(f).catch(() => {});
  }
});

suite('Copy Function to File', () => {
  test('should register the copyFunctionToFile command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.copyFunctionToFile'),
      'copyFunctionToFile command should be registered',
    );
  });

  test('should not throw when cursor is inside a function', async () => {
    await openTsFile(`export function helper(x: number): number {\n  return x * 2;\n}`);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(1, 2, 1, 2);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copyFunctionToFile')),
    );
  });

  test('should not throw when cursor is outside a function', async () => {
    await openTsFile(`const x = 1;`);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copyFunctionToFile')),
    );
  });

});

suite('Move Function to File', () => {
  test('should register the moveFunctionToFile command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.moveFunctionToFile'),
      'moveFunctionToFile command should be registered',
    );
  });

  test('should not throw when cursor is inside a function', async () => {
    await openTsFile(`export function transform(s: string): string {\n  return s.trim();\n}`);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(1, 2, 1, 2);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveFunctionToFile')),
    );
  });

  test('should not throw when cursor is outside a function', async () => {
    await openTsFile(`const y = 2;`);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveFunctionToFile')),
    );
  });

});
