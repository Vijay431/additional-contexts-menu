import * as path from 'path';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

/**
 * E2E Test Context
 *
 * Context object for E2E tests containing workspace info and extension state.
 */
export interface E2ETestContext {
  tempWorkspace: string;
  extension: vscode.Extension<any> | undefined;
  tempDir: string;
}

/**
 * E2E Test Setup Utilities
 *
 * Provides setup/teardown for E2E tests following architectural patterns.
 * Creates temporary workspaces, activates extension, and manages cleanup.
 */
export class E2ETestSetup {
  private static tempWorkspaces: string[] = [];

  /**
   * Setup E2E test environment
   *
   * - Creates temporary workspace
   * - Activates extension
   * - Sets up test fixtures
   *
   * @param testName - Name for test workspace
   * @returns Test context with workspace and extension info
   */
  public static async setup(testName: string): Promise<E2ETestContext> {
    // Create temp workspace
    const tempWorkspace = path.join(__dirname, '../temp-workspaces', testName);
    await fs.mkdir(tempWorkspace, { recursive: true });
    E2ETestSetup.tempWorkspaces.push(tempWorkspace);

    // Get and activate extension
    const extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus');
    if (extension && !extension.isActive) {
      await extension.activate();
      // Wait for activation
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      tempWorkspace,
      extension,
      tempDir: path.join(tempWorkspace, 'temp'),
    };
  }

  /**
   * Teardown E2E test environment
   *
   * - Closes all editors
   * - Cleans up temporary workspaces
   */
  public static async teardown(): Promise<void> {
    // Close all editors
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');

    // Clean up temp workspaces
    for (const workspace of E2ETestSetup.tempWorkspaces) {
      try {
        await fs.rm(workspace, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to cleanup ${workspace}`, error);
      }
    }
    E2ETestSetup.tempWorkspaces = [];
  }

  /**
   * Reset to default configuration
   */
  public static async resetConfig(): Promise<void> {
    const config = vscode.workspace.getConfiguration('additionalContextMenus');
    await config.update('enabled', true, vscode.ConfigurationTarget.Workspace);
    await config.update('autoDetectProjects', true, vscode.ConfigurationTarget.Workspace);
  }
}
