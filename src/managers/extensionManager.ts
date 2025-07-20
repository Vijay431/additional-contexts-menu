import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigurationService } from '../services/configurationService';
import { ContextMenuManager } from './contextMenuManager';

export class ExtensionManager {
  private logger: Logger;
  private configService: ConfigurationService;
  private contextMenuManager: ContextMenuManager;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.contextMenuManager = new ContextMenuManager();
  }

  public async activate(context: vscode.ExtensionContext): Promise<void> {
    this.logger.info('Activating Additional Context Menus extension');

    try {
      // Check if extension is enabled
      if (!this.configService.isEnabled()) {
        this.logger.info('Extension is disabled, skipping activation');
        return;
      }

      // Initialize components
      await this.initializeComponents();

      // Register disposables with VS Code context
      this.disposables.forEach((disposable) => {
        context.subscriptions.push(disposable);
      });

      // Add our own disposables
      context.subscriptions.push({ dispose: () => this.dispose() });

      this.logger.info('Additional Context Menus extension activated successfully');

      // Show activation message (only in debug mode)
      if (process.env['NODE_ENV'] === 'development') {
        vscode.window.showInformationMessage('Additional Context Menus extension is now active');
      }
    } catch (error) {
      this.logger.error('Failed to activate extension', error);
      vscode.window.showErrorMessage('Failed to activate Additional Context Menus extension');
      throw error;
    }
  }

  private async initializeComponents(): Promise<void> {
    try {
      // Initialize context menu manager
      await this.contextMenuManager.initialize();

      // Listen for configuration changes to enable/disable extension
      this.disposables.push(
        this.configService.onConfigurationChanged(async () => {
          await this.handleConfigurationChanged();
        })
      );

      this.logger.debug('All components initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing components', error);
      throw error;
    }
  }

  private async handleConfigurationChanged(): Promise<void> {
    const isEnabled = this.configService.isEnabled();
    this.logger.debug(`Configuration changed - enabled: ${isEnabled}`);

    if (!isEnabled) {
      this.logger.info('Extension disabled via configuration');
      // Note: We don't dispose everything here as VS Code doesn't
      // provide a clean way to re-initialize after disable/enable
      // The extension will remain loaded but context menus won't show
    } else {
      this.logger.info('Extension enabled via configuration');
      // Context menus will automatically show based on when clauses
    }
  }

  public deactivate(): void {
    this.logger.info('Deactivating Additional Context Menus extension');
    this.dispose();
  }

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

  // Public API for testing or external access
  public getContextMenuManager(): ContextMenuManager {
    return this.contextMenuManager;
  }

  public getConfigurationService(): ConfigurationService {
    return this.configService;
  }

  public isActive(): boolean {
    return this.configService.isEnabled();
  }
}
