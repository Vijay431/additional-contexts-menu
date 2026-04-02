import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

const WALKTHROUGH_COMPLETED_KEY = 'additionalContextMenus.walkthroughCompleted';
const WALKTHROUGH_INSTALL_VERSION_KEY = 'additionalContextMenus.installVersion';
const WALKTHROUGH_ID =
  'VijayGangatharan.additional-context-menus#additionalContextMenus.gettingStarted';

/**
 * Manages the first-run onboarding walkthrough experience.
 *
 * Tracks whether the user has completed the walkthrough using VS Code's
 * globalState, and exposes commands to open the walkthrough on demand.
 */
export class WalkthroughManager {
  private readonly logger: Logger;
  private context: vscode.ExtensionContext | undefined;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Initializes the walkthrough manager.
   * Opens the walkthrough automatically on first install.
   *
   * @param context - The VS Code extension context used to access globalState.
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    this.context = context;

    try {
      if (this.isFirstInstall()) {
        this.logger.info('First install detected — opening walkthrough');
        await this.openWalkthrough();
        this.markInstallComplete();
      }
    } catch (error) {
      // Walkthrough errors must not block extension activation
      this.logger.warn('WalkthroughManager.initialize encountered an error', error);
    }
  }

  /**
   * Opens the VS Code built-in walkthrough for this extension.
   */
  public async openWalkthrough(): Promise<void> {
    try {
      await vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        WALKTHROUGH_ID,
        false,
      );
    } catch (error) {
      this.logger.error('Failed to open walkthrough', error);
    }
  }

  /**
   * Returns true if this is the first time the extension has been installed
   * (i.e., the walkthrough completion flag has not been set in globalState).
   */
  public isFirstInstall(): boolean {
    if (!this.context) {
      return false;
    }
    return !this.context.globalState.get<boolean>(WALKTHROUGH_COMPLETED_KEY, false);
  }

  /**
   * Persists the walkthrough completion state so the walkthrough does not
   * re-open on subsequent VS Code restarts. Idempotent — safe to call multiple times.
   */
  public markInstallComplete(): void {
    if (!this.context) {
      return;
    }
    void this.context.globalState.update(WALKTHROUGH_COMPLETED_KEY, true);
    void this.context.globalState.update(
      WALKTHROUGH_INSTALL_VERSION_KEY,
      this.context.extension.packageJSON.version as string,
    );
    this.logger.debug('Walkthrough marked as complete');
  }
}
