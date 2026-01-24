import * as vscode from 'vscode';

import { CodeAnalysisService } from '../services/codeAnalysisService';
import { Logger } from '../utils/logger';

import { ICommandHandler } from './types';

/**
 * Handles code analysis commands: Copy Function
 *
 * This handler manages commands that analyze code structure and extract
 * specific code elements like functions, classes, or methods.
 *
 * Features:
 * - Function detection at cursor position
 * - Support for multiple function types (function declarations, arrow functions, methods)
 * - React component and hook detection
 * - Clipboard integration for easy copying
 *
 * Commands:
 * - additionalContextMenus.copyFunction: Copies the function at the cursor position to clipboard
 */
export class CodeAnalysisCommandHandler implements ICommandHandler {
  private logger: Logger;
  private codeAnalysisService: CodeAnalysisService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.codeAnalysisService = CodeAnalysisService.getInstance();
  }

  /**
   * Initializes the handler and its dependencies
   *
   * Called during extension activation to ensure all services are ready.
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing CodeAnalysisCommandHandler');
    this.logger.debug('CodeAnalysisCommandHandler initialized successfully');
  }

  /**
   * Registers all code analysis commands with VS Code
   *
   * @returns Array of disposables for registered commands
   */
  public registerCommands(): vscode.Disposable[] {
    const commands: vscode.Disposable[] = [
      vscode.commands.registerCommand(
        'additionalContextMenus.copyFunction',
        () => this.handleCopyFunction(),
      ),
    ];

    this.disposables.push(...commands);
    this.logger.debug('Code analysis commands registered');
    return commands;
  }

  /**
   * Disposes of all registered commands and resources
   *
   * Called during extension deactivation to clean up resources.
   */
  public dispose(): void {
    this.logger.debug('Disposing CodeAnalysisCommandHandler');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }

  /**
   * Handles the Copy Function command
   *
   * Finds the function at the cursor position and copies its full text
   * to the clipboard. Supports various function types including regular
   * functions, arrow functions, class methods, and React components.
   *
   * @throws Error if function detection or clipboard operations fail
   */
  private async handleCopyFunction(): Promise<void> {
    this.logger.info('Copy Function command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;
      const position = editor.selection.active;

      // Find function at cursor position
      const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(
        document,
        position,
      );

      if (!functionInfo) {
        vscode.window.showWarningMessage('No function found at cursor position');
        return;
      }

      // Copy function to clipboard
      await vscode.env.clipboard.writeText(functionInfo.fullText);

      vscode.window.showInformationMessage(
        `Copied ${functionInfo.type} '${functionInfo.name}' to clipboard`,
      );
      this.logger.info(`Function copied: ${functionInfo.name}`);
    } catch (error) {
      this.logger.error('Error in Copy Function command', error);
      vscode.window.showErrorMessage('Failed to copy function');
    }
  }
}
