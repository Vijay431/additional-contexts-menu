import * as vscode from 'vscode';

import { ExtensionConfig } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Configuration Service
 *
 * Manages VS Code configuration settings for the Additional Context Menus extension.
 * Provides type-safe access to extension settings with change event handling.
 *
 * @description
 * This service is the central configuration manager for the entire extension.
 * It handles reading, updating, and monitoring configuration changes
 * in VS Code's settings system.
 *
 * Key Features:
 * - Singleton pattern for global access across the extension
 * - Type-safe configuration retrieval with proper TypeScript types
 * - Automatic default value handling
 * - Configuration change event handling with filtering
 * - Update methods for individual settings or full config
 *
 * Configuration Structure:
 * - enabled: Enable/disable extension globally
 * - autoDetectProjects: Automatic project detection
 * - supportedExtensions: File extensions for context menu display
 * - copyCode: Settings for copy code operations
 * - saveAll: Settings for save all operation
 * - terminal: Terminal integration settings
 *
 * Use Cases:
 * - Checking if extension is enabled before showing menus
 * - Getting supported file extensions for filtering
 * - Retrieving copy/terminal settings for operations
 * - Listening for configuration changes to update UI
 * - Updating individual settings from user preferences
 *
 * @example
 * // Get configuration service instance
 * const configService = ConfigurationService.getInstance();
 *
 * // Check if extension is enabled
 * if (configService.isEnabled()) {
 *   console.log('Extension is active');
 * }
 *
 * // Get supported extensions
 * const extensions = configService.getSupportedExtensions();
 * console.log(`Supported: ${extensions.join(', ')}`);
 *
 * // Listen for configuration changes
 * const disposable = configService.onConfigurationChanged(() => {
 *   console.log('Settings changed');
 * });
 *
 * // Update a setting
 * await configService.updateConfiguration('enabled', false);
 *
 * @see ExtensionManager - Uses this service for configuration management
 * @see ContextMenuManager - Uses this service for feature toggles
 *
 * @category Configuration & State
 * @subcategory Settings Management
 *
 * @author Vijay Gangatharan <vijayanand431@gmail.com>
 * @since 1.0.0
 */
export class ConfigurationService {
  private static instance: ConfigurationService | undefined;
  private logger: Logger;
  private readonly configSection = 'additionalContextMenus';

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ConfigurationService {
    ConfigurationService.instance ??= new ConfigurationService();
    return ConfigurationService.instance;
  }

  public getConfiguration(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(this.configSection);

    return {
      enabled: config.get<boolean>('enabled', true),
      autoDetectProjects: config.get<boolean>('autoDetectProjects', true),
      supportedExtensions: config.get<string[]>('supportedExtensions', [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
      ]),
      copyCode: {
        insertionPoint: config.get<'smart' | 'end' | 'beginning'>(
          'copyCode.insertionPoint',
          'smart',
        ),
        handleImports: config.get<'merge' | 'duplicate' | 'skip'>(
          'copyCode.handleImports',
          'merge',
        ),
        preserveComments: config.get<boolean>('copyCode.preserveComments', true),
      },
      saveAll: {
        showNotification: config.get<boolean>('saveAll.showNotification', true),
        skipReadOnly: config.get<boolean>('saveAll.skipReadOnly', true),
      },
      terminal: {
        type: config.get<'integrated' | 'external' | 'system-default'>(
          'terminal.type',
          'integrated',
        ),
        externalTerminalCommand: config.get<string>('terminal.externalTerminalCommand', ''),
        openBehavior: config.get<'parent-directory' | 'workspace-root' | 'current-directory'>(
          'terminal.openBehavior',
          'parent-directory',
        ),
      },
      keybindings: {
        enabled: config.get<boolean>('enableKeybindings', false),
        showInMenu: config.get<boolean>('showKeybindingsInMenu', true),
      },
    };
  }

  public isEnabled(): boolean {
    return this.getConfiguration().enabled;
  }

  public getSupportedExtensions(): string[] {
    return this.getConfiguration().supportedExtensions;
  }

  public shouldAutoDetectProjects(): boolean {
    return this.getConfiguration().autoDetectProjects;
  }

  public getCopyCodeConfig() {
    return this.getConfiguration().copyCode;
  }

  public getSaveAllConfig() {
    return this.getConfiguration().saveAll;
  }

  public onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this.configSection)) {
        this.logger.info('Configuration changed');
        callback();
      }
    });
  }

  public async updateConfiguration<T>(
    key: string,
    value: T,
    target?: vscode.ConfigurationTarget,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update(key, value, target);
    this.logger.info(`Configuration updated: ${key} = ${JSON.stringify(value)}`);
  }
}
