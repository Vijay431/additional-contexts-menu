import * as vscode from 'vscode';

import { FileTestHelpers } from './fileHelpers';

/**
 * Workspace Test Helpers
 *
 * Provides utilities for workspace operations in E2E tests
 * like opening files, setting cursor positions, and closing editors.
 */

/**
 * Open file in editor
 *
 * @param filePath - Path to file to open
 * @returns TextEditor instance for opened file
 */
export async function openFile(filePath: string): Promise<vscode.TextEditor> {
  const uri = vscode.Uri.file(filePath);
  const document = await vscode.workspace.openTextDocument(uri);
  return await vscode.window.showTextDocument(document);
}

/**
 * Save active document
 *
 * @returns Promise that resolves when saved
 */
export async function saveDocument(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.isDirty) {
    await editor.document.save();
  }
}

/**
 * Set cursor position
 *
 * @param editor - TextEditor to modify
 * @param line - Line number (0-indexed)
 * @param character - Character position in line (0-indexed)
 */
export function setCursorPosition(
  editor: vscode.TextEditor,
  line: number,
  character: number,
): void {
  const position = new vscode.Position(line, character);
  editor.selection = new vscode.Selection(position, position);
}

/**
 * Select text range
 *
 * @param editor - TextEditor to modify
 * @param startLine - Start line (0-indexed)
 * @param startChar - Start character (0-indexed)
 * @param endLine - End line (0-indexed)
 * @param endChar - End character (0-indexed)
 */
export function selectRange(
  editor: vscode.TextEditor,
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
): void {
  const startPos = new vscode.Position(startLine, startChar);
  const endPos = new vscode.Position(endLine, endChar);
  editor.selection = new vscode.Selection(startPos, endPos);
}

/**
 * Close all editors
 */
export async function closeAllEditors(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

/**
 * Get active editor
 *
 * @returns Active TextEditor or undefined
 */
export function getActiveEditor(): vscode.TextEditor | undefined {
  return vscode.window.activeTextEditor;
}

export const WorkspaceTestHelpers = {
  openFile,
  saveDocument,
  setCursorPosition,
  selectRange,
  closeAllEditors,
  getActiveEditor,
};
