import * as vscode from 'vscode';

import { TerminalService } from '../services/terminalService';
import { Logger } from '../utils/logger';

import { ICommandHandler } from './types';

/**
 * Handles terminal commands: Open in Terminal
 *
 * This handler manages commands that interact with the system terminal,
 * allowing users to quickly open a terminal at specific locations.
 *
 * Features:
 * - Opens terminal at the file's directory
 * - Automatic path resolution
 * - Integration with VS Code's terminal API
 *
 * Commands:
 * - additionalContextMenus.openInTerminal: Opens a terminal at the active file's location
 */
export class TerminalCommandHandler implements ICommandHandler {
  private logger: Logger;
  private terminalService: TerminalService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.terminalService = TerminalService.getInstance();
  }

  /**
   * Initializes the handler and its dependencies
   *
   * Called during extension activation to ensure all services are ready.
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing TerminalCommandHandler');
    this.logger.debug('TerminalCommandHandler initialized successfully');
  }

  /**
   * Registers all terminal commands with VS Code
   *
   * @returns Array of disposables for registered commands
   */
  public registerCommands(): vscode.Disposable[] {
    const commands: vscode.Disposable[] = [
      vscode.commands.registerCommand(
        'additionalContextMenus.openInTerminal',
        () => this.handleOpenInTerminal(),
      ),
    ];

    this.disposables.push(...commands);
    this.logger.debug('Terminal commands registered');
    return commands;
  }

  /**
   * Disposes of all registered commands and resources
   *
   * Called during extension deactivation to clean up resources.
   */
  public dispose(): void {
    this.logger.debug('Disposing TerminalCommandHandler');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }

  /**
   * Handles the Open in Terminal command
   *
   * Opens a new terminal instance at the directory containing the active file.
   * Uses the TerminalService to handle path resolution and terminal creation.
   *
   * @throws Error if terminal operations fail
   */
  private async handleOpenInTerminal(): Promise<void> {
    this.logger.info('Open in Terminal command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const filePath = editor.document.fileName;
      await this.terminalService.openInTerminal(filePath);
    } catch (error) {
      this.logger.error('Error in Open in Terminal command', error);
      vscode.window.showErrorMessage('Failed to open terminal');
    }
  }
}
