import * as vscode from 'vscode';

import { ExtensionConfig } from '../types/extension';
import { Logger } from '../utils/logger';

/**
 * Centralized configuration management service for the extension.
 *
 * Provides type-safe access to VS Code workspace configuration settings
 * with default values and change notification support. Implements singleton
 * pattern to ensure consistent configuration state across the extension.
 *
 * Configuration sections:
 * - General settings (enabled, autoDetectProjects, supportedExtensions)
 * - Copy Code behavior (insertionPoint, handleImports, preserveComments)
 * - Save All options (showNotification, skipReadOnly)
 * - Terminal settings (type, externalTerminalCommand, openBehavior)
 */
export class ConfigurationService {
  private static instance: ConfigurationService;
  private logger: Logger;
  private readonly configSection = 'additionalContextMenus';

  /**
   * Private constructor to enforce singleton pattern.
   *
   * Initializes the logger instance for configuration operations.
   */
  private constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Gets the singleton instance of the ConfigurationService.
   *
   * Creates a new instance on first call, returns the existing instance
   * on subsequent calls.
   *
   * @returns The singleton ConfigurationService instance
   */
  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Retrieves the complete extension configuration from VS Code settings.
   *
   * Reads all configuration values from the workspace settings, applying
   * defaults for any missing values. Returns a strongly-typed configuration
   * object matching the ExtensionConfig interface.
   *
   * Configuration hierarchy:
   * 1. User settings (global)
   * 2. Workspace settings (project-specific)
   * 3. Default values (fallback)
   *
   * @returns The complete extension configuration with all settings
   */
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
    };
  }

  /**
   * Checks whether the extension is currently enabled.
   *
   * Convenience method to quickly check the enabled status without
   * retrieving the full configuration object.
   *
   * @returns True if the extension is enabled, false otherwise
   */
  public isEnabled(): boolean {
    return this.getConfiguration().enabled;
  }

  /**
   * Retrieves the list of supported file extensions.
   *
   * Returns the configured file extensions that the extension should
   * process. Defaults to TypeScript and JavaScript file types.
   *
   * @returns Array of file extensions (e.g., ['.ts', '.tsx', '.js', '.jsx'])
   */
  public getSupportedExtensions(): string[] {
    return this.getConfiguration().supportedExtensions;
  }

  /**
   * Checks whether automatic project detection is enabled.
   *
   * Determines if the extension should automatically detect and
   * configure project-specific settings based on workspace structure.
   *
   * @returns True if auto-detection is enabled, false otherwise
   */
  public shouldAutoDetectProjects(): boolean {
    return this.getConfiguration().autoDetectProjects;
  }

  /**
   * Retrieves the Copy Code feature configuration.
   *
   * Returns settings related to the copy code functionality including
   * insertion point behavior, import handling, and comment preservation.
   *
   * @returns Copy code configuration object
   */
  public getCopyCodeConfig() {
    return this.getConfiguration().copyCode;
  }

  /**
   * Retrieves the Save All feature configuration.
   *
   * Returns settings related to the save all functionality including
   * notification preferences and read-only file handling.
   *
   * @returns Save all configuration object
   */
  public getSaveAllConfig() {
    return this.getConfiguration().saveAll;
  }

  /**
   * Registers a callback to be invoked when extension configuration changes.
   *
   * Monitors VS Code configuration changes and triggers the callback when
   * any settings in the 'additionalContextMenus' section are modified.
   * Useful for reacting to user preference changes in real-time.
   *
   * @param callback - Function to call when configuration changes
   * @returns A disposable that removes the change listener when disposed
   */
  public onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this.configSection)) {
        this.logger.info('Configuration changed');
        callback();
      }
    });
  }

  /**
   * Updates a configuration value in VS Code settings.
   *
   * Modifies a specific configuration key with a new value. Changes can be
   * scoped to user settings, workspace settings, or workspace folder settings.
   * Logs the update for audit purposes.
   *
   * @param key - The configuration key to update (e.g., 'enabled', 'copyCode.insertionPoint')
   * @param value - The new value to set
   * @param target - Optional configuration target (defaults to Workspace)
   * @returns Promise that resolves when the configuration is updated
   */
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
