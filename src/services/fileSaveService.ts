import { constants } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { SaveAllResult } from '../types/extension';
import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

import { ConfigurationService } from './configurationService';

export class FileSaveService {
  private static instance: FileSaveService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  public static getInstance(): FileSaveService {
    FileSaveService.instance ??= new FileSaveService();
    return FileSaveService.instance;
  }

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
      let skippedFiles: string[] = [];
      let failedFiles: string[] = [];

      // Show progress for large operations
      if (unsavedFiles.length > 5) {
        return await this.saveWithProgress(unsavedFiles);
      }

      // Save files sequentially for better error handling
      for (const document of unsavedFiles) {
        try {
          const fileName = this.getSafeFileName(document);
          const saved = await this.saveFile(document);
          if (saved) {
            result.savedFiles++;
            this.logger.debug(`Saved file: ${fileName}`);
          } else {
            skippedFiles = [...skippedFiles, fileName];
            this.logger.warn(`Skipped file: ${fileName}`);
          }
        } catch (error) {
          const fileName = this.getSafeFileName(document);
          failedFiles = [...failedFiles, fileName];
          this.logger.error(`Failed to save file: ${fileName}`, error);
        }
      }
      result.failedFiles = failedFiles;
      result.skippedFiles = skippedFiles;
      result.success = failedFiles.length === 0;

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
            const uri = document.uri;
            if (uri.scheme === 'file') {
              const filePath = uri.fsPath;
              if (!isSafeFilePath(filePath)) {
                this.logger.warn('Skipping save for unsafe file path', { filePath });
              } else {
                await fs.access(filePath, constants.W_OK);
                unsavedFiles.push(document);
              }
            }
          } catch (error) {
            // File is read-only or not accessible
            this.logger.warn(`Skipping read-only file: ${document.fileName}`, error);
          }
        } else {
          unsavedFiles.push(document);
        }
      }
    }

    return unsavedFiles;
  }

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

  private async saveWithProgress(files: vscode.TextDocument[]): Promise<SaveAllResult> {
    const result: SaveAllResult = {
      totalFiles: files.length,
      savedFiles: 0,
      failedFiles: [],
      skippedFiles: [],
      success: false,
    };
    let skippedFiles: string[] = [];
    let failedFiles: string[] = [];

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Saving all files...',
        cancellable: false,
      },
      async (progress) => {
        const increment = 100 / files.length;

        let index = 0;
        for (const document of files) {
          const fileName = this.getSafeFileName(document);

          progress.report({
            message: 'Saving file...',
            increment: index === 0 ? 0 : increment,
          });

          try {
            const saved = await this.saveFile(document);
            if (saved) {
              result.savedFiles++;
            } else {
              skippedFiles = [...skippedFiles, fileName];
            }
          } catch (error) {
            failedFiles = [...failedFiles, fileName];
            this.logger.error(`Failed to save file: ${fileName}`, error);
          }

          index++;
        }

        progress.report({ increment: 100 });
      },
    );

    result.failedFiles = failedFiles;
    result.skippedFiles = skippedFiles;
    result.success = failedFiles.length === 0;
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
      }
    } else {
      const message = `Saved ${result.savedFiles}/${result.totalFiles} files. ${
        result.failedFiles.length
      } failed.`;
      void vscode.window.showWarningMessage(message, 'Show Details').then(
        (selection) => {
          if (selection === 'Show Details') {
            this.showFailureDetails(result);
          }
          return undefined;
        },
        (error: unknown) => {
          this.logger.error('Error showing warning message', error);
          return undefined;
        },
      );
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

  private getSafeFileName(document: vscode.TextDocument): string {
    return path.basename(document.fileName);
  }
}
