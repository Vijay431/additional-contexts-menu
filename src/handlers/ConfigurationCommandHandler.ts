import * as vscode from 'vscode';

import { ConfigurationService } from '../services/configurationService';
import { Logger } from '../utils/logger';

import { ICommandHandler } from './types';

/**
 * Handles configuration commands: Enable/Disable extension
 *
 * This handler manages commands for enabling and disabling the extension,
 * allowing users to quickly toggle extension functionality.
 *
 * Features:
 * - Enable/disable extension commands
 * - Configuration updates via ConfigurationService
 * - User feedback via info messages
 *
 * Commands:
 * - additionalContextMenus.enable: Enables the extension
 * - additionalContextMenus.disable: Disables the extension
 */
export class ConfigurationCommandHandler implements ICommandHandler {
  private logger: Logger;
  private configService: ConfigurationService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  /**
   * Initializes the handler and its dependencies
   *
   * Called during extension activation to ensure all services are ready.
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing ConfigurationCommandHandler');
    this.logger.debug('ConfigurationCommandHandler initialized successfully');
  }

  /**
   * Registers all configuration commands with VS Code
   *
   * @returns Array of disposables for registered commands
   */
  public registerCommands(): vscode.Disposable[] {
    const commands: vscode.Disposable[] = [
      vscode.commands.registerCommand(
        'additionalContextMenus.enable',
        async () => await this.handleEnable(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.disable',
        async () => await this.handleDisable(),
      ),
    ];

    this.disposables.push(...commands);
    this.logger.debug('Configuration commands registered');
    return commands;
  }

  /**
   * Disposes of all registered commands and resources
   *
   * Called during extension deactivation to clean up resources.
   */
  public dispose(): void {
    this.logger.debug('Disposing ConfigurationCommandHandler');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }

  /**
   * Handles the Enable command
   *
   * Enables the extension by updating the configuration.
   * Shows an information message to confirm the action.
   */
  private async handleEnable(): Promise<void> {
    await this.configService.updateConfiguration('enabled', true);
    vscode.window.showInformationMessage('Additional Context Menus enabled');
  }

  /**
   * Handles the Disable command
   *
   * Disables the extension by updating the configuration.
   * Shows an information message to confirm the action.
   */
  private async handleDisable(): Promise<void> {
    await this.configService.updateConfiguration('enabled', false);
    vscode.window.showInformationMessage('Additional Context Menus disabled');
  }
}
