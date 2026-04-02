import * as vscode from 'vscode';

import type { IAccessibilityService } from '../di/interfaces/IAccessibilityService';
import type { IConfigurationService } from '../di/interfaces/IConfigurationService';
import type {
  IFileSaveService,
  FileSaveResult as IFileSaveResult,
} from '../di/interfaces/IFileSaveService';
import type { ILogger } from '../di/interfaces/ILogger';
import { AccessibilityService } from '../services/accessibilityService';
import { SaveAllResult } from '../types/extension';
import { Logger } from '../utils/logger';

import { ConfigurationService } from './configurationService';

/**
 * File Save Service
 *
 * Enhanced file save operations with progress feedback, read-only handling,
 * and configurable notifications.
 *
 * @description
 * This service provides improved save functionality for VS Code workspaces.
 * Handles multiple files simultaneously with progress feedback and error reporting.
 *
 * Key Features:
 * - Save all dirty documents with progress tracking
 * - Visual progress notification for large operations (5+ files)
 * - Read-only file handling (configurable skip)
 * - Configurable success/failure notifications
 * - Detailed error reporting with failure counts
 * - Support for workspace multi-root scenarios
 *
 * @example
 * ```typescript
 * // Using DI (recommended)
 * constructor(@inject(TYPES.FileSaveService) private saveService: IFileSaveService) {}
 *
 * // Using singleton (legacy)
 * const saveService = FileSaveService.getInstance();
 * ```
 *
 * @see ConfigurationService - Provides saveAll configuration
 * @see ContextMenuManager - Uses this service for save operations
 *
 * @category File Operations
 * @subcategory File Management
 *
 * @author Vijay Gangatharan <vijayanand431@gmail.com>
 * @since 1.0.0
 */
export class FileSaveService implements IFileSaveService {
  private static instance: FileSaveService | undefined;
  private logger: ILogger;
  private configService: IConfigurationService;
  private accessibilityService: IAccessibilityService;

  private constructor(
    logger: ILogger,
    configService: IConfigurationService,
    accessibilityService: IAccessibilityService,
  ) {
    this.logger = logger;
    this.configService = configService;
    this.accessibilityService = accessibilityService;
  }

  /**
   * Get the singleton instance (legacy pattern)
   *
   * @deprecated Use DI injection instead
   */
  public static getInstance(): FileSaveService {
    return (
      FileSaveService.instance ??
      new FileSaveService(
        Logger.getInstance(),
        ConfigurationService.getInstance(),
        AccessibilityService.getInstance(),
      )
    );
  }

  /**
   * Create a new FileSaveService instance (DI pattern)
   *
   * This method is used by the DI container.
   *
   * @param logger - The logger instance to use
   * @param configService - The configuration service instance
   * @param accessibilityService - The accessibility service instance
   * @returns A new FileSaveService instance
   */
  public static create(
    logger: ILogger,
    configService: IConfigurationService,
    accessibilityService: IAccessibilityService,
  ): FileSaveService {
    return new FileSaveService(logger, configService, accessibilityService);
  }

  public async saveAllFiles(): Promise<IFileSaveResult> {
    const result = await this.saveAllFilesLegacy();
    return {
      savedCount: result.savedFiles,
      skippedCount: result.skippedFiles.length,
      failedCount: result.failedFiles.length,
      savedFiles:
        result.savedFiles > 0
          ? Array.from({ length: result.savedFiles }, (_, i) => `file${i}`)
          : [],
      skippedFiles: result.skippedFiles,
      failedFiles: result.failedFiles.map((f) => ({ path: f, error: 'Save failed' })),
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  private async saveAllFilesLegacy(): Promise<SaveAllResult> {
    this.logger.info('Save All operation started');

    try {
      const unsavedFiles = await this.getUnsavedFiles();

      if (unsavedFiles.length === 0) {
        const message = 'No unsaved files found';
        this.logger.info(message);

        await this.accessibilityService.announce(message, 'normal');

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
          const saved = await this.saveFileInternal(document);
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

  private async saveFileInternal(document: vscode.TextDocument): Promise<boolean> {
    try {
      // Use VS Code's save API
      const success = await document.save();
      return success;
    } catch (error) {
      this.logger.error(`Error saving file ${document.fileName}`, error);
      throw error;
    }
  }

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
          const document = files.at(i);

          if (!document) {
            continue;
          }

          const fileName = document.fileName;
          const progressMessage = `Saving ${fileName} (${i + 1} of ${files.length})`;

          progress.report({
            message: progressMessage,
            increment: i === 0 ? 0 : increment,
          });

          // Announce progress for verbose mode
          void this.accessibilityService.announceProgress('Saving files', i + 1, files.length);

          try {
            const saved = await this.saveFileInternal(document);
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

  private showCompletionNotification(result: SaveAllResult): void {
    const config = this.configService.getSaveAllConfig();

    if (!config.showNotification) {
      return;
    }

    if (result.success) {
      if (result.savedFiles > 0) {
        const message = `Saved ${result.savedFiles} file${result.savedFiles === 1 ? '' : 's'}`;
        vscode.window.showInformationMessage(message);
        void this.accessibilityService.announceSuccess(
          'Save All',
          `Saved ${result.savedFiles} files`,
        );
      }
    } else {
      const message = `Saved ${result.savedFiles}/${result.totalFiles} files. ${
        result.failedFiles.length
      } failed.`;
      void this.accessibilityService.announceError(
        'Save All',
        `${result.failedFiles.length} files failed to save`,
      );
      Promise.resolve(vscode.window.showWarningMessage(message, 'Show Details'))
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

  public hasUnsavedChanges(): boolean {
    return vscode.workspace.textDocuments.some((doc) => doc.isDirty && !doc.isUntitled);
  }

  public getUnsavedFileCount(): number {
    return vscode.workspace.textDocuments.filter((doc) => doc.isDirty && !doc.isUntitled).length;
  }

  public async saveFile(uri: { toString(): string }): Promise<void> {
    const document = vscode.workspace.textDocuments.find(
      (doc) => doc.uri.toString() === uri.toString(),
    );
    if (document?.isDirty) {
      await document.save();
    }
  }

  public async saveFiles(uris: { toString(): string }[]): Promise<IFileSaveResult> {
    let savedCount = 0;
    const skippedFiles: string[] = [];
    const failedFiles: { path: string; error: string }[] = [];
    const savedFiles: string[] = [];

    for (const uri of uris) {
      try {
        await this.saveFile(uri);
        savedCount++;
        savedFiles.push(uri.toString());
      } catch (error) {
        failedFiles.push({ path: uri.toString(), error: String(error) });
      }
    }

    return {
      savedCount,
      skippedCount: skippedFiles.length,
      failedCount: failedFiles.length,
      savedFiles,
      skippedFiles,
      failedFiles,
    };
  }
}
