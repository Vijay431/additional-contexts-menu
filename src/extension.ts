import * as vscode from 'vscode';
import { ExtensionManager } from './managers/extensionManager';

let extensionManager: ExtensionManager | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    extensionManager = new ExtensionManager();
    await extensionManager.activate(context);
  } catch (error) {
    console.error('Failed to activate Additional Context Menus extension:', error);
    vscode.window.showErrorMessage('Failed to activate Additional Context Menus extension');
  }
}

export function deactivate(): void {
  if (extensionManager) {
    extensionManager.deactivate();
    extensionManager = undefined;
  }
}
