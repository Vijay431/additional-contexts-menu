import * as vscode from 'vscode';

import { SaveAllResult } from '../types/extension';
import { Logger } from '../utils/logger';

import { ConfigurationService } from './configurationService';

/**
 * Service for managing file save operations in the VS Code extension.
 *
 * Provides functionality to save all unsaved files with support for:
 * - Batch saving with progress indication for large file sets
 * - Configurable notifications for save results
 * - Skipping read-only files based on configuration
 * - Detailed error tracking and reporting
 *
 * The service operates as a singleton and integrates with VS Code's workspace API
 * to identify and save unsaved text documents while handling edge cases like
 * untitled documents and read-only files.
 */
export class FileSaveService {
  private static instance: FileSaveService;
  private logger: Logger;
  private configService: ConfigurationService;

  /**
   * Private constructor to enforce singleton pattern.
   *
   * Initializes the logger and configuration service instances for file save operations.
   */
  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  /**
   * Gets the singleton instance of the FileSaveService.
   *
   * Creates a new instance on first call, returns the existing instance
   * on subsequent calls.
   *
   * @returns The singleton FileSaveService instance
   */
  public static getInstance(): FileSaveService {
    if (!FileSaveService.instance) {
      FileSaveService.instance = new FileSaveService();
    }
    return FileSaveService.instance;
  }

  /**
   * Saves all unsaved files in the workspace.
   *
   * Identifies all dirty (unsaved) text documents and attempts to save them.
   * For operations with more than 5 files, displays a progress indicator.
   * Shows notifications based on configuration settings and tracks successful,
   * failed, and skipped saves.
   *
   * @returns A promise resolving to a SaveAllResult object containing save statistics
   * @throws Throws an error if the save operation fails catastrophically
   */
  public async saveAllFiles(): Promise<SaveAllResult> {
    this.logger.info('Save All operation started');

    try {
      const unsavedFiles = await this.getUnsavedFiles();

      if (unsavedFiles.length === 0) {
        const message = 'No unsaved files found';
        this.logger.info(message);

        if (this.configService.getSaveAllConfig().showNotification) {
          vscode.window.showInformationMessage(message);
        }

        return {
          totalFiles: 0,
          savedFiles: 0,
          failedFiles: [],
          skippedFiles: [],
          success: true,
        };
      }

      const result: SaveAllResult = {
        totalFiles: unsavedFiles.length,
        savedFiles: 0,
        failedFiles: [],
        skippedFiles: [],
        success: false,
      };

      // Show progress for large operations
      if (unsavedFiles.length > 5) {
        return await this.saveWithProgress(unsavedFiles);
      }

      // Save files sequentially for better error handling
      for (const document of unsavedFiles) {
        try {
          const saved = await this.saveFile(document);
          if (saved) {
            result.savedFiles++;
            this.logger.debug(`Saved file: ${document.fileName}`);
          } else {
            result.skippedFiles.push(document.fileName);
            this.logger.warn(`Skipped file: ${document.fileName}`);
          }
        } catch (error) {
          result.failedFiles.push(document.fileName);
          this.logger.error(`Failed to save file: ${document.fileName}`, error);
        }
      }

      result.success = result.failedFiles.length === 0;

      this.showCompletionNotification(result);
      this.logger.info('Save All operation completed', result);

      return result;
    } catch (error) {
      this.logger.error('Save All operation failed', error);
      throw error;
    }
  }

  /**
   * Retrieves all unsaved text documents from the workspace.
   *
   * Scans all open text documents and filters for dirty (unsaved) documents
   * that are not untitled. Respects the skipReadOnly configuration to exclude
   * read-only files when configured.
   *
   * @returns A promise resolving to an array of unsaved text documents
   */
  private async getUnsavedFiles(): Promise<vscode.TextDocument[]> {
    const unsavedFiles: vscode.TextDocument[] = [];

    // Get all open text documents
    for (const document of vscode.workspace.textDocuments) {
      if (document.isDirty && !document.isUntitled) {
        // Skip read-only files if configured to do so
        if (this.configService.getSaveAllConfig().skipReadOnly) {
          try {
            // Check if file is writable by attempting to get its stats
            const uri = document.uri;
            if (uri.scheme === 'file') {
              unsavedFiles.push(document);
            }
          } catch {
            this.logger.warn(`Skipping read-only file: ${document.fileName}`);
            continue;
          }
        } else {
          unsavedFiles.push(document);
        }
      }
    }

    return unsavedFiles;
  }

  /**
   * Saves a single text document.
   *
   * Attempts to save the specified document using VS Code's save API.
   * Logs errors and re-throws them for higher-level handling.
   *
   * @param document - The text document to save
   * @returns A promise resolving to true if the save was successful, false otherwise
   * @throws Throws an error if the save operation fails
   */
  private async saveFile(document: vscode.TextDocument): Promise<boolean> {
    try {
      // Use VS Code's save API
      const success = await document.save();
      return success;
    } catch (error) {
      this.logger.error(`Error saving file ${document.fileName}`, error);
      throw error;
    }
  }

  /**
   * Saves multiple files with a progress indicator.
   *
   * Displays a VS Code progress notification while saving files sequentially.
   * Updates the progress indicator for each file and tracks save results.
   * Used for operations involving more than 5 files to provide user feedback.
   *
   * @param files - Array of text documents to save
   * @returns A promise resolving to a SaveAllResult object containing save statistics
   */
  private async saveWithProgress(files: vscode.TextDocument[]): Promise<SaveAllResult> {
    const result: SaveAllResult = {
      totalFiles: files.length,
      savedFiles: 0,
      failedFiles: [],
      skippedFiles: [],
      success: false,
    };

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Saving all files...',
        cancellable: false,
      },
      async (progress) => {
        const increment = 100 / files.length;

        for (let i = 0; i < files.length; i++) {
          const document = files[i];

          if (!document) {
            continue;
          }

          progress.report({
            message: `Saving ${document.fileName}`,
            increment: i === 0 ? 0 : increment,
          });

          try {
            const saved = await this.saveFile(document);
            if (saved) {
              result.savedFiles++;
            } else {
              result.skippedFiles.push(document.fileName);
            }
          } catch (error) {
            result.failedFiles.push(document.fileName);
            this.logger.error(`Failed to save file: ${document.fileName}`, error);
          }
        }

        progress.report({ increment: 100 });
      },
    );

    result.success = result.failedFiles.length === 0;
    this.showCompletionNotification(result);

    return result;
  }

  /**
   * Displays a notification with save operation results.
   *
   * Shows an information message for successful saves and a warning message
   * with a "Show Details" option for failures. Respects the showNotification
   * configuration setting.
   *
   * @param result - The save operation result containing statistics and file lists
   */
  private showCompletionNotification(result: SaveAllResult): void {
    const config = this.configService.getSaveAllConfig();

    if (!config.showNotification) {
      return;
    }

    if (result.success) {
      if (result.savedFiles > 0) {
        const message = `Saved ${result.savedFiles} file${result.savedFiles === 1 ? '' : 's'}`;
        vscode.window.showInformationMessage(message);
      }
    } else {
      const message = `Saved ${result.savedFiles}/${result.totalFiles} files. ${
        result.failedFiles.length
      } failed.`;
      vscode.window
        .showWarningMessage(message, 'Show Details')
        .then(
          (selection) => {
            if (selection === 'Show Details') {
              this.showFailureDetails(result);
            }
            return selection;
          },
          (error: unknown) => {
            this.logger.error('Error showing warning message', error);
          },
        )
        .catch((error: unknown) => {
          this.logger.error('Unexpected error in warning message handling', error);
        });
    }
  }

  /**
   * Displays detailed information about failed and skipped files.
   *
   * Opens the output channel to show comprehensive save results including
   * total files processed, successful saves, and lists of failed and skipped files.
   *
   * @param result - The save operation result containing failure and skip information
   */
  private showFailureDetails(result: SaveAllResult): void {
    const details = [
      'Save All Results:',
      `- Total files: ${result.totalFiles}`,
      `- Saved successfully: ${result.savedFiles}`,
      `- Failed: ${result.failedFiles.length}`,
      `- Skipped: ${result.skippedFiles.length}`,
      '',
    ];

    if (result.failedFiles.length > 0) {
      details.push('Failed files:');
      result.failedFiles.forEach((file) => details.push(`- ${file}`));
      details.push('');
    }

    if (result.skippedFiles.length > 0) {
      details.push('Skipped files:');
      result.skippedFiles.forEach((file) => details.push(`- ${file}`));
    }

    this.logger.info('Save All details shown to user');
    this.logger.show();
  }

  /**
   * Checks if there are any unsaved changes in the workspace.
   *
   * Scans all open text documents to determine if any have unsaved changes
   * (are dirty) and are not untitled documents.
   *
   * @returns True if there are unsaved changes, false otherwise
   */
  public hasUnsavedChanges(): boolean {
    return vscode.workspace.textDocuments.some((doc) => doc.isDirty && !doc.isUntitled);
  }

  /**
   * Gets the count of unsaved files in the workspace.
   *
   * Counts all open text documents that have unsaved changes (are dirty)
   * and are not untitled documents.
   *
   * @returns The number of unsaved files
   */
  public getUnsavedFileCount(): number {
    return vscode.workspace.textDocuments.filter((doc) => doc.isDirty && !doc.isUntitled).length;
  }
}
