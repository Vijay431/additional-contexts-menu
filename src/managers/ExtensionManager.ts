import * as vscode from 'vscode';

import { ConfigurationService } from '../services/configurationService';
import { Logger } from '../utils/logger';

import { ContextMenuManager } from './ContextMenuManager';

/**
 * Main manager class for the Additional Context Menus extension.
 *
 * Responsible for extension lifecycle management including activation,
 * deactivation, and coordination of child managers. Handles configuration
 * changes and manages VS Code context variables for conditional UI display.
 *
 * Architecture:
 * - Coordinates ContextMenuManager for context menu registration
 * - Uses ConfigurationService to track extension enabled/disabled state
 * - Manages disposables for proper cleanup on deactivation
 * - Updates VS Code context variables for when clause support
 */
export class ExtensionManager {
  private logger: Logger;
  private configService: ConfigurationService;
  private contextMenuManager: ContextMenuManager;
  private disposables: vscode.Disposable[] = [];

  /**
   * Creates a new ExtensionManager instance.
   *
   * Initializes the logger, configuration service, and context menu manager.
   * Typically instantiated once during extension activation.
   */
  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.contextMenuManager = new ContextMenuManager();
  }

  /**
   * Activates the extension and initializes all components.
   *
   * This is the main entry point called by VS Code when the extension is activated.
   * Initializes all child managers, registers disposables, and sets up configuration
   * change listeners. Commands are always registered regardless of configuration;
   * VS Code's when clauses handle visibility based on the enabled state.
   *
   * @param context - The VS Code extension context for registering subscriptions
   * @throws Will throw an error if activation fails
   */
  public async activate(context: vscode.ExtensionContext): Promise<void> {
    this.logger.info('Activating Additional Context Menus extension');

    try {
      // Always initialize components - commands should always be registered
      // VS Code's when clauses will handle visibility based on configuration
      await this.initializeComponents();

      // Register disposables with VS Code context
      this.disposables.forEach((disposable) => {
        context.subscriptions.push(disposable);
      });

      // Add our own disposables
      context.subscriptions.push({ dispose: () => this.dispose() });

      // Set initial context variable for enabled state
      await this.updateEnabledContext();

      this.logger.info('Additional Context Menus extension activated successfully');

      // Show activation message (only in debug mode and when enabled)
      if (process.env['NODE_ENV'] === 'development' && this.configService.isEnabled()) {
        vscode.window.showInformationMessage('Additional Context Menus extension is now active');
      }
    } catch (error) {
      this.logger.error('Failed to activate extension', error);
      vscode.window.showErrorMessage('Failed to activate Additional Context Menus extension');
      throw error;
    }
  }

  /**
   * Initializes all extension components.
   *
   * Sets up the context menu manager and registers configuration change listeners.
   * All disposables created during initialization are tracked for cleanup.
   *
   * @throws Will throw an error if component initialization fails
   */
  private async initializeComponents(): Promise<void> {
    try {
      // Initialize context menu manager
      await this.contextMenuManager.initialize();


      // Listen for configuration changes to enable/disable extension
      this.disposables.push(
        this.configService.onConfigurationChanged(() => {
          void this.handleConfigurationChanged();
        }),
      );

      this.logger.debug('All components initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing components', error);
      throw error;
    }
  }

  /**
   * Handles configuration change events.
   *
   * Called when the extension's configuration changes. Updates VS Code context
   * variables to reflect the new enabled/disabled state, which controls when
   * clause visibility for context menus.
   */
  private async handleConfigurationChanged(): Promise<void> {
    const isEnabled = this.configService.isEnabled();
    this.logger.debug(`Configuration changed - enabled: ${isEnabled}`);

    // Update VS Code context variable for when clauses
    await this.updateEnabledContext();

    if (!isEnabled) {
      this.logger.info('Extension disabled via configuration');
      // Context menus won't show due to when clauses, but commands remain registered
    } else {
      this.logger.info('Extension enabled via configuration');
      // Context menus will automatically show based on when clauses
    }
  }

  /**
   * Updates VS Code context variables for the extension's enabled state.
   *
   * Sets the 'additionalContextMenus.enabled' context variable which is used
   * by when clauses in package.json to conditionally show context menu items.
   */
  private async updateEnabledContext(): Promise<void> {
    const isEnabled = this.configService.isEnabled();

    await vscode.commands.executeCommand('setContext', 'additionalContextMenus.enabled', isEnabled);

    this.logger.debug(`Context variables updated: enabled = ${isEnabled}`);
  }

  /**
   * Deactivates the extension and cleans up resources.
   *
   * Called by VS Code when the extension is deactivated. Disposes all
   * resources including managers, disposables, and the logger.
   */
  public deactivate(): void {
    this.logger.info('Deactivating Additional Context Menus extension');
    this.dispose();
  }

  /**
   * Disposes all resources held by the manager.
   *
   * Disposes the context menu manager, all registered disposables, and the logger.
   * Errors during disposal are logged but don't stop the disposal process.
   */
  private dispose(): void {
    this.logger.debug('Disposing ExtensionManager');

    // Dispose context menu manager
    if (this.contextMenuManager) {
      this.contextMenuManager.dispose();
    }


    // Dispose all registered disposables
    this.disposables.forEach((disposable) => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn('Error disposing resource', error);
      }
    });

    this.disposables = [];

    // Dispose logger last
    this.logger.dispose();
  }

  /**
   * Gets the context menu manager instance.
   *
   * Provides access to the context menu manager for testing or external access.
   *
   * @returns The ContextMenuManager instance
   */
  public getContextMenuManager(): ContextMenuManager {
    return this.contextMenuManager;
  }

  /**
   * Gets the configuration service instance.
   *
   * Provides access to the configuration service for testing or external access.
   *
   * @returns The ConfigurationService instance
   */
  public getConfigurationService(): ConfigurationService {
    return this.configService;
  }

  /**
   * Checks if the extension is currently active.
   *
   * Returns the enabled state from the configuration service, indicating whether
   * the extension is active and its features should be available.
   *
   * @returns True if the extension is active, false otherwise
   */
  public isActive(): boolean {
    return this.configService.isEnabled();
  }
}
