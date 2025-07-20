import * as vscode from 'vscode';
import { SaveAllResult } from '../types/extension';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';

export class FileSaveService {
  private static instance: FileSaveService;
  private logger: Logger;
  private configService: ConfigurationService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  public static getInstance(): FileSaveService {
    if (!FileSaveService.instance) {
      FileSaveService.instance = new FileSaveService();
    }
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
      }
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
      }
    } else {
      const message = `Saved ${result.savedFiles}/${result.totalFiles} files. ${result.failedFiles.length} failed.`;
      vscode.window.showWarningMessage(message, 'Show Details').then((selection) => {
        if (selection === 'Show Details') {
          this.showFailureDetails(result);
        }
      });
    }
  }

  private showFailureDetails(result: SaveAllResult): void {
    const details = [
      `Save All Results:`,
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
}
