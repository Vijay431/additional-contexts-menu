import * as vscode from 'vscode';

import { CodeAnalysisService } from '../services/codeAnalysisService';
import { ConfigurationService } from '../services/configurationService';
import { FileDiscoveryService } from '../services/fileDiscoveryService';
import { Logger } from '../utils/logger';

import { ICommandHandler } from './types';

/**
 * Handles file operation commands: Copy Lines to File and Move Lines to File
 *
 * This handler manages commands that copy or move selected code lines to other files,
 * including smart insertion point detection, import merging, and file validation.
 *
 * Features:
 * - Compatible file discovery based on language extension
 * - Smart insertion point detection (beginning, end, or after imports)
 * - Import merging capabilities (when configured)
 * - File validation before operations
 *
 * Commands:
 * - additionalContextMenus.copyLinesToFile: Copies selected lines to another file
 * - additionalContextMenus.moveLinesToFile: Moves selected lines to another file
 */
export class FileOperationCommandHandler implements ICommandHandler {
  private logger: Logger;
  private configService: ConfigurationService;
  private fileDiscoveryService: FileDiscoveryService;
  private codeAnalysisService: CodeAnalysisService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.fileDiscoveryService = FileDiscoveryService.getInstance();
    this.codeAnalysisService = CodeAnalysisService.getInstance();
  }

  /**
   * Initializes the handler and its dependencies
   *
   * Called during extension activation to ensure all services are ready.
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing FileOperationCommandHandler');
    this.logger.debug('FileOperationCommandHandler initialized successfully');
  }

  /**
   * Registers all file operation commands with VS Code
   *
   * @returns Array of disposables for registered commands
   */
  public registerCommands(): vscode.Disposable[] {
    const commands: vscode.Disposable[] = [
      vscode.commands.registerCommand(
        'additionalContextMenus.copyLinesToFile',
        () => this.handleCopyLinesToFile(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.moveLinesToFile',
        () => this.handleMoveLinesToFile(),
      ),
    ];

    this.disposables.push(...commands);
    this.logger.debug('File operation commands registered');
    return commands;
  }

  /**
   * Disposes of all registered commands and resources
   *
   * Called during extension deactivation to clean up resources.
   */
  public dispose(): void {
    this.logger.debug('Disposing FileOperationCommandHandler');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }

  /**
   * Handles the Copy Lines to File command
   *
   * Copies selected code lines from the active editor to a target file selected by the user.
   * Performs file validation and smart insertion point detection.
   *
   * @throws Error if file operations fail
   */
  private async handleCopyLinesToFile(): Promise<void> {
    this.logger.info('Copy Lines to File command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      const selectedText = editor.document.getText(selection);
      const sourceExtension = this.getFileExtension(editor.document.fileName);

      // Get compatible files
      const compatibleFiles = await this.fileDiscoveryService.getCompatibleFiles(sourceExtension);

      // Show file selector
      const targetFilePath = await this.fileDiscoveryService.showFileSelector(compatibleFiles);
      if (!targetFilePath) {
        return; // User cancelled
      }

      // Validate target file
      const isValid = await this.fileDiscoveryService.validateTargetFile(targetFilePath);
      if (!isValid) {
        vscode.window.showErrorMessage('Target file is not accessible or writable');
        return;
      }

      // Copy code to target file
      await this.copyCodeToTargetFile(selectedText, targetFilePath, editor.document);

      const fileName = this.getFileName(targetFilePath);
      vscode.window.showInformationMessage(`Lines copied to ${fileName}`);
      this.logger.info(`Lines copied to: ${targetFilePath}`);
    } catch (error) {
      this.logger.error('Error in Copy Lines to File command', error);
      vscode.window.showErrorMessage('Failed to copy lines to file');
    }
  }

  /**
   * Handles the Move Lines to File command
   *
   * Moves selected code lines from the active editor to a target file selected by the user.
   * The lines are removed from the source file after being copied to the target.
   *
   * @throws Error if file operations fail
   */
  private async handleMoveLinesToFile(): Promise<void> {
    this.logger.info('Move Lines to File command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      const selectedText = editor.document.getText(selection);
      const sourceExtension = this.getFileExtension(editor.document.fileName);

      // Get compatible files
      const compatibleFiles = await this.fileDiscoveryService.getCompatibleFiles(sourceExtension);

      // Show file selector
      const targetFilePath = await this.fileDiscoveryService.showFileSelector(compatibleFiles);
      if (!targetFilePath) {
        return; // User cancelled
      }

      // Validate target file
      const isValid = await this.fileDiscoveryService.validateTargetFile(targetFilePath);
      if (!isValid) {
        vscode.window.showErrorMessage('Target file is not accessible or writable');
        return;
      }

      // Copy code to target file first
      await this.copyCodeToTargetFile(selectedText, targetFilePath, editor.document);

      // Remove code from source file
      await editor.edit((editBuilder) => {
        editBuilder.delete(selection);
      });

      const fileName = this.getFileName(targetFilePath);
      vscode.window.showInformationMessage(`Lines moved to ${fileName}`);
      this.logger.info(`Lines moved to: ${targetFilePath}`);
    } catch (error) {
      this.logger.error('Error in Move Lines to File command', error);
      vscode.window.showErrorMessage('Failed to move lines to file');
    }
  }

  /**
   * Copies code to the target file at the appropriate insertion point
   *
   * Opens the target file, determines the insertion point based on configuration,
   * inserts the code, and optionally handles import merging.
   *
   * @param code - The code to copy
   * @param targetFilePath - Absolute path to the target file
   * @param sourceDocument - The source text document (for import extraction)
   * @throws Error if file operations fail
   */
  private async copyCodeToTargetFile(
    code: string,
    targetFilePath: string,
    sourceDocument: vscode.TextDocument,
  ): Promise<void> {
    try {
      // Open target file
      const targetUri = vscode.Uri.file(targetFilePath);
      const targetDocument = await vscode.workspace.openTextDocument(targetUri);

      // Get insertion point
      const insertionPoint = this.getInsertionPoint(targetDocument, code);

      // Open target file in editor to make edits
      const targetEditor = await vscode.window.showTextDocument(
        targetDocument,
        vscode.ViewColumn.Beside,
      );

      // Insert code at the determined position
      await targetEditor.edit((editBuilder) => {
        editBuilder.insert(insertionPoint, `\n${code}\n`);
      });

      // Handle imports if configured
      if (this.configService.getCopyCodeConfig().handleImports === 'merge') {
        await this.handleImportMerging(sourceDocument, targetDocument, code);
      }
    } catch (error) {
      this.logger.error('Error copying code to target file', error);
      throw error;
    }
  }

  /**
   * Determines the insertion point based on configuration
   *
   * @param document - The target document
   * @param _code - The code to insert (currently unused, reserved for future smart detection)
   * @returns The position where code should be inserted
   */
  private getInsertionPoint(document: vscode.TextDocument, _code: string): vscode.Position {
    const config = this.configService.getCopyCodeConfig();

    switch (config.insertionPoint) {
      case 'beginning':
        return new vscode.Position(0, 0);
      case 'end':
        return new vscode.Position(document.lineCount, 0);
      case 'smart':
      default:
        // Smart insertion: after imports, before exports
        return this.findSmartInsertionPoint(document);
    }
  }

  /**
   * Finds the smart insertion point in the document
   *
   * Analyzes the document to find the best insertion point:
   * 1. After the last import statement
   * 2. Before the first export statement (if no imports)
   * 3. At the end of the file (if neither imports nor exports)
   *
   * @param document - The document to analyze
   * @returns The optimal insertion position
   */
  private findSmartInsertionPoint(document: vscode.TextDocument): vscode.Position {
    const text = document.getText();
    const lines = text.split('\n');

    let lastImportLine = -1;
    let firstExportLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? '';

      if (line.startsWith('import ')) {
        lastImportLine = i;
      } else if (line.startsWith('export ') && firstExportLine === -1) {
        firstExportLine = i;
      }
    }

    // Insert after imports, or before exports, or at end
    if (lastImportLine >= 0) {
      return new vscode.Position(lastImportLine + 1, 0);
    } else if (firstExportLine >= 0) {
      return new vscode.Position(firstExportLine, 0);
    } else {
      return new vscode.Position(document.lineCount, 0);
    }
  }

  /**
   * Handles merging of imports between source and target files
   *
   * Extracts imports from the copied code and merges them with existing
   * imports in the target file. This is a placeholder for future implementation.
   *
   * @param sourceDocument - The source text document
   * @param targetDocument - The target text document
   * @param copiedCode - The code that was copied
   */
  private async handleImportMerging(
    sourceDocument: vscode.TextDocument,
    targetDocument: vscode.TextDocument,
    copiedCode: string,
  ): Promise<void> {
    try {
      // Extract imports from copied code
      const sourceImports = this.codeAnalysisService.extractImports(
        copiedCode,
        sourceDocument.languageId,
      );

      if (sourceImports.length === 0) {
        return;
      }

      // Get existing imports from target file
      const targetText = targetDocument.getText();
      const targetImports = this.codeAnalysisService.extractImports(
        targetText,
        targetDocument.languageId,
      );

      // TODO: Implement smart import merging logic
      // This would involve parsing import statements and merging them intelligently
      this.logger.debug('Import merging not yet fully implemented', {
        sourceImports: sourceImports.length,
        targetImports: targetImports.length,
      });
    } catch (error) {
      this.logger.warn('Error handling import merging', error);
    }
  }

  /**
   * Extracts the file extension from a file name
   *
   * @param fileName - The file name or path
   * @returns The file extension including the dot (e.g., '.ts'), or empty string
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot >= 0 ? fileName.substring(lastDot) : '';
  }

  /**
   * Extracts the file name from a file path
   *
   * @param filePath - The absolute or relative file path
   * @returns The file name without path, or the original string if no path separator found
   */
  private getFileName(filePath: string): string {
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
  }
}
