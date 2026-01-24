import * as vscode from 'vscode';

import { FileSaveService } from '../services/fileSaveService';
import { Logger } from '../utils/logger';

import { ICommandHandler } from './types';

/**
 * Handles save commands: Save All
 *
 * This handler manages commands for saving files,
 * allowing users to quickly save all files in the workspace.
 *
 * Features:
 * - Saves all dirty files in the workspace
 * - Provides feedback on save results
 * - Error handling for save failures
 *
 * Commands:
 * - additionalContextMenus.saveAll: Saves all files in the workspace
 */
export class SaveCommandHandler implements ICommandHandler {
  private logger: Logger;
  private fileSaveService: FileSaveService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.fileSaveService = FileSaveService.getInstance();
  }

  /**
   * Initializes the handler and its dependencies
   *
   * Called during extension activation to ensure all services are ready.
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing SaveCommandHandler');
    this.logger.debug('SaveCommandHandler initialized successfully');
  }

  /**
   * Registers all save commands with VS Code
   *
   * @returns Array of disposables for registered commands
   */
  public registerCommands(): vscode.Disposable[] {
    const commands: vscode.Disposable[] = [
      vscode.commands.registerCommand(
        'additionalContextMenus.saveAll',
        () => this.handleSaveAll(),
      ),
    ];

    this.disposables.push(...commands);
    this.logger.debug('Save commands registered');
    return commands;
  }

  /**
   * Disposes of all registered commands and resources
   *
   * Called during extension deactivation to clean up resources.
   */
  public dispose(): void {
    this.logger.debug('Disposing SaveCommandHandler');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }

  /**
   * Handles the Save All command
   *
   * Saves all dirty files in the workspace and provides feedback
   * on the operation's success or failure.
   *
   * @throws Error if save operations fail
   */
  private async handleSaveAll(): Promise<void> {
    this.logger.info('Save All command triggered');

    try {
      const result = await this.fileSaveService.saveAllFiles();
      this.logger.info('Save All completed', result);
    } catch (error) {
      this.logger.error('Error in Save All command', error);
      vscode.window.showErrorMessage(`Failed to save files: ${(error as Error).message}`);
    }
  }
}
