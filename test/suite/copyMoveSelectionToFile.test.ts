import * as assert from 'assert';
import * as vscode from 'vscode';

async function openDoc(content: string, language = 'typescript') {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(doc);
  return doc;
}

suite('Copy Selection to File', () => {
  test('should command is registered and does not throw with a selection', async () => {
    const content = `import { useState } from 'react';\n\nconst value = 42;`;
    const doc = await openDoc(content);
    const editor = vscode.window.activeTextEditor!;
    // Select the const line
    editor.selection = new vscode.Selection(2, 0, 2, content.split('\n')[2]!.length);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copySelectionToFile')));
  });

  test('should handles empty selection gracefully', async () => {
    const content = `const x = 1;`;
    await openDoc(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copySelectionToFile')));
  });
});

suite('Move Selection to File', () => {
  test('should command is registered and does not throw with a selection', async () => {
    const content = `const helper = () => 'help';`;
    const doc = await openDoc(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, content.length);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveSelectionToFile')));
  });

  test('should handles empty selection gracefully', async () => {
    const content = `const z = 3;`;
    await openDoc(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    await assert.doesNotReject(Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveSelectionToFile')));
  });
});
