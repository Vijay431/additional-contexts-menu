import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

async function openTsFile(content: string): Promise<vscode.TextDocument> {
  const tmpFile = path.join(os.tmpdir(), `acm-sel-test-${Date.now()}.ts`);
  await fs.writeFile(tmpFile, content, 'utf-8');
  const doc = await vscode.workspace.openTextDocument(tmpFile);
  await vscode.window.showTextDocument(doc);
  return doc;
}

async function openDoc(content: string, language = 'typescript') {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(doc);
  return doc;
}

suite('Copy Selection to File', () => {
  test('should register the command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.copySelectionToFile'),
      'copySelectionToFile command should be registered',
    );
  });

  test('should not throw when a selection is active on a real file', async () => {
    const content = `import { useState } from 'react';\n\nconst value = 42;`;
    const doc = await openTsFile(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(2, 0, 2, content.split('\n')[2]!.length);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copySelectionToFile')),
    );

    // Source document must not lose content (copy never removes from source)
    assert.ok(
      editor.document.getText().includes('const value = 42;'),
      'Source document should still contain the selected text after a copy',
    );
    void doc;
  });

  test('should handle empty selection gracefully', async () => {
    await openDoc(`const x = 1;`);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);

    // Pre-capture clipboard so we can confirm it was not written
    await vscode.env.clipboard.writeText('');
    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copySelectionToFile')),
    );

    // Empty selection → command bails before copying; clipboard must remain empty
    const clipboardText = await vscode.env.clipboard.readText();
    assert.strictEqual(clipboardText, '', 'Clipboard must not be written when selection is empty');
  });

  test('should not throw when copying selection to file', async () => {
    const content = `import { useState } from 'react';\nimport { useEffect } from 'react';\n\nconst Component = () => null;`;
    const doc = await openTsFile(content);
    const editor = vscode.window.activeTextEditor!;
    const lines = content.split('\n');
    editor.selection = new vscode.Selection(3, 0, 3, lines[3]!.length);
    const selectedText = editor.document.getText(editor.selection);

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.copySelectionToFile')),
    );

    // Source document must still contain the copied text (copy does not delete)
    assert.ok(
      editor.document.getText().includes(selectedText),
      'Source document should still contain the selection after copy',
    );
    void doc;
  });
});

suite('Move Selection to File', () => {
  test('should register the command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('additionalContextMenus.moveSelectionToFile'),
      'moveSelectionToFile command should be registered',
    );
  });

  test('should not throw when a selection is active on a real file', async () => {
    const content = `const helper = () => 'help';`;
    const doc = await openTsFile(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, content.length);
    const originalText = editor.document.getText();

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveSelectionToFile')),
    );

    // Either the move completed (source shrank) or QuickPick was dismissed (text unchanged);
    // in either case the document must not contain stale partial edits.
    const textAfter = editor.document.getText();
    assert.ok(
      textAfter === originalText || textAfter.length < originalText.length,
      'Document text should be either unchanged (QuickPick dismissed) or shorter (move succeeded)',
    );
    void doc;
  });

  test('should handle empty selection gracefully', async () => {
    await openDoc(`const z = 3;`);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    const originalText = editor.document.getText();

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveSelectionToFile')),
    );

    // Empty selection → command bails before any edit; document must be unchanged
    assert.strictEqual(
      editor.document.getText(),
      originalText,
      'Document must not change when selection is empty',
    );
  });

  test('should not throw when full line is selected', async () => {
    const content = `export const PI = 3.14159;`;
    const doc = await openTsFile(content);
    const editor = vscode.window.activeTextEditor!;
    editor.selection = new vscode.Selection(0, 0, 0, content.length);

    const selectedText = editor.document.getText(editor.selection);
    assert.strictEqual(selectedText, content, 'Full line should be selected');

    await assert.doesNotReject(
      Promise.resolve(vscode.commands.executeCommand('additionalContextMenus.moveSelectionToFile')),
    );

    // Document should be in a consistent state (not partially edited)
    const textAfter = editor.document.getText();
    assert.ok(
      textAfter === content || !textAfter.includes(content),
      'Document should be either fully intact or fully moved, never partially edited',
    );
    void doc;
  });
});
