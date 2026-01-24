import * as vscode from 'vscode';

import { ConfigurationService } from './services/configurationService';
import { ExtensionManager } from './managers/ExtensionManager';
import { Logger } from './utils/logger';

let extensionManager: ExtensionManager | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Create service instances with dependency injection
    const logger = new Logger();
    const configService = new ConfigurationService(logger);

    // Pass dependencies to ExtensionManager
    extensionManager = new ExtensionManager(logger, configService);
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
