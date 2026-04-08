import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

async function openDoc(content: string, language = 'typescript') {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(doc);
  return doc;
}

suite('Copy Function to File', () => {
  test('should command is registered and does not throw when invoked', async () => {
    const content = `export function helper(x: number): number {\n  return x * 2;\n}`;
    await openDoc(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(1, 2, 1, 2);

    // Command may show a QuickPick — just verify it doesn't throw
    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copyFunctionToFile')));
  });

  test('should does nothing gracefully when cursor is outside a function', async () => {
    const content = `const x = 1;`;
    await openDoc(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copyFunctionToFile')));
  });
});

suite('Move Function to File', () => {
  test('should command is registered and does not throw when invoked', async () => {
    const content = `export function transform(s: string): string {\n  return s.trim();\n}`;
    await openDoc(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(1, 2, 1, 2);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveFunctionToFile')));
  });

  test('should does nothing gracefully when cursor is outside a function', async () => {
    const content = `const y = 2;`;
    await openDoc(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveFunctionToFile')));
  });
});
