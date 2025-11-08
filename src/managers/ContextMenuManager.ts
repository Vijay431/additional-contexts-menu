import { constants } from 'fs';
import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import { CodeAnalysisService } from '../services/codeAnalysisService';
import { ConfigurationService } from '../services/configurationService';
import { FileDiscoveryService } from '../services/fileDiscoveryService';
import { FileSaveService } from '../services/fileSaveService';
import { ProjectDetectionService } from '../services/projectDetectionService';
import { TerminalService } from '../services/terminalService';
import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

export class ContextMenuManager {
  private logger: Logger;
  private configService: ConfigurationService;
  private projectDetectionService: ProjectDetectionService;
  private fileDiscoveryService: FileDiscoveryService;
  private fileSaveService: FileSaveService;
  private codeAnalysisService: CodeAnalysisService;
  private terminalService: TerminalService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.projectDetectionService = ProjectDetectionService.getInstance();
    this.fileDiscoveryService = FileDiscoveryService.getInstance();
    this.fileSaveService = FileSaveService.getInstance();
    this.codeAnalysisService = CodeAnalysisService.getInstance();
    this.terminalService = TerminalService.getInstance();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing ContextMenuManager');

    // Register commands
    this.registerCommands();

    // Initialize services that require watchers
    this.projectDetectionService.initialize();

    // Update context variables for menu visibility
    await this.projectDetectionService.updateContextVariables();

    // Listen for configuration changes
    this.disposables.push(
      this.configService.onConfigurationChanged(() => {
        void this.handleConfigurationChanged();
      }),
    );

    // Listen for workspace changes
    this.disposables.push(
      this.projectDetectionService.onWorkspaceChanged(() => {
        void this.handleWorkspaceChanged();
      }),
    );

    // Listen for file system changes
    this.disposables.push(this.fileDiscoveryService.onFileSystemChanged());

    this.logger.info('ContextMenuManager initialized successfully');
  }

  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand('additionalContextMenus.copyFunction', () =>
        this.handleCopyFunction(),
      ),
      vscode.commands.registerCommand('additionalContextMenus.copyLinesToFile', () =>
        this.handleCopyLinesToFile(),
      ),
      vscode.commands.registerCommand('additionalContextMenus.moveLinesToFile', () =>
        this.handleMoveLinesToFile(),
      ),
      vscode.commands.registerCommand('additionalContextMenus.saveAll', () => this.handleSaveAll()),
      vscode.commands.registerCommand(
        'additionalContextMenus.enable',
        async () => await this.handleEnable(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.disable',
        async () => await this.handleDisable(),
      ),
      vscode.commands.registerCommand('additionalContextMenus.openInTerminal', () =>
        this.handleOpenInTerminal(),
      ),
    );

    this.logger.debug('Commands registered');
  }

  private async handleCopyFunction(): Promise<void> {
    this.logger.info('Copy Function command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;

      // Reject untitled files
      if (document.isUntitled) {
        vscode.window.showErrorMessage(
          'Copy Function is not available for untitled files. Please save the file first.',
        );
        return;
      }

      const position = editor.selection.active;

      // Find function at cursor position
      const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(
        document,
        position,
      );

      if (!functionInfo) {
        vscode.window.showWarningMessage('No function found at cursor position');
        return;
      }

      // Copy function to clipboard
      await vscode.env.clipboard.writeText(functionInfo.fullText);

      vscode.window.showInformationMessage(
        `Copied ${functionInfo.type} '${functionInfo.name}' to clipboard`,
      );
      this.logger.info(`Function copied: ${functionInfo.name}`);
    } catch (error) {
      this.logger.error('Error in Copy Function command', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to copy function: ${errorMessage}`);
    }
  }

  private async handleCopyLinesToFile(): Promise<void> {
    this.logger.info('Copy Lines to File command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;

      // Reject untitled files
      if (document.isUntitled) {
        vscode.window.showErrorMessage(
          'Copy Lines to File is not available for untitled files. Please save the file first.',
        );
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      if (editor.selections.length > 1) {
        vscode.window.showWarningMessage(
          'Copy Lines to File does not support multiple selections.',
        );
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to copy lines to file: ${errorMessage}`);
    }
  }

  private async handleMoveLinesToFile(): Promise<void> {
    this.logger.info('Move Lines to File command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;

      // Reject untitled files
      if (document.isUntitled) {
        vscode.window.showErrorMessage(
          'Move Lines to File is not available for untitled files. Please save the file first.',
        );
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      if (editor.selections.length > 1) {
        vscode.window.showWarningMessage(
          'Move Lines to File does not support multiple selections.',
        );
        return;
      }

      const selectedText = editor.document.getText(selection);
      const sourceExtension = this.getFileExtension(editor.document.fileName);

      // Validate source file is writable before proceeding
      const sourceFilePath = document.fileName;
      if (!isSafeFilePath(sourceFilePath)) {
        this.logger.warn('Rejected unsafe source file path', { filePath: sourceFilePath });
        vscode.window.showErrorMessage('Source file path is not allowed.');
        return;
      }

      try {
        await fs.access(sourceFilePath, constants.W_OK);
      } catch (error) {
        this.logger.warn('Source file is not writable', { filePath: sourceFilePath, error });
        vscode.window.showErrorMessage(
          'Source file is read-only or not writable. Cannot move code from this file.',
        );
        return;
      }

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

      // Copy code to target file first - only proceed with deletion if copy succeeds
      try {
        await this.copyCodeToTargetFile(selectedText, targetFilePath, editor.document);
      } catch (copyError) {
        // If copy fails, preserve source file and show error
        this.logger.error('Failed to copy code to target file', copyError);
        const errorMsg = (copyError as Error).message;
        vscode.window.showErrorMessage(
          `Failed to copy code to target file. Source file preserved: ${errorMsg}`,
        );
        return; // Exit early - source file remains unchanged
      }

      // Only delete from source file after successful copy
      try {
        await editor.edit((editBuilder) => {
          editBuilder.delete(selection);
        });
      } catch (deleteError) {
        // If deletion fails, log error but don't throw - code is already copied
        this.logger.error('Failed to delete code from source file', deleteError);
        const deleteErrorMsg = (deleteError as Error).message;
        vscode.window.showWarningMessage(
          `Code copied to target file, but failed to remove from source: ${deleteErrorMsg}`,
        );
      }

      const fileName = this.getFileName(targetFilePath);
      vscode.window.showInformationMessage(`Lines moved to ${fileName}`);
      this.logger.info(`Lines moved to: ${targetFilePath}`);
    } catch (error) {
      this.logger.error('Error in Move Lines to File command', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to move lines to file: ${errorMessage}`);
    }
  }

  private async handleSaveAll(): Promise<void> {
    this.logger.info('Save All command triggered');

    try {
      const result = await this.fileSaveService.saveAllFiles();
      this.logger.info('Save All completed', result);
    } catch (error) {
      this.logger.error('Error in Save All command', error);
      vscode.window.showErrorMessage(`Failed to save files: ${(error as Error).message}`);
    }
  }

  private async copyCodeToTargetFile(
    code: string,
    targetFilePath: string,
    sourceDocument: vscode.TextDocument,
  ): Promise<void> {
    try {
      if (!isSafeFilePath(targetFilePath)) {
        this.logger.warn('Rejected unsafe target file path', { targetFilePath });
        throw new Error('Target file path is not allowed.');
      }

      // Open target file
      const targetUri = vscode.Uri.file(targetFilePath);
      const targetDocument = await vscode.workspace.openTextDocument(targetUri);

      // Get insertion point
      const insertionPoint = this.getInsertionPoint(targetDocument, code);

      // Open target file in editor to make edits
      const targetEditor = await vscode.window.showTextDocument(targetDocument, {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: true,
        preview: false,
      });

      const normalizedCode = code.replace(/\r\n/g, '\n');

      const succeeded = await targetEditor.edit((editBuilder) => {
        const needsTrailingNewline = normalizedCode.endsWith('\n') ? '' : '\n';
        const textToInsert = `${normalizedCode}${needsTrailingNewline}`;
        const prefix = insertionPoint.line === 0 && insertionPoint.character === 0 ? '' : '\n';
        editBuilder.insert(insertionPoint, `${prefix}${textToInsert}`);
      });

      if (!succeeded) {
        throw new Error('Failed to apply edits to target file');
      }

      // Handle imports if configured
      if (this.configService.getCopyCodeConfig().handleImports === 'merge') {
        await this.handleImportMerging(sourceDocument, targetDocument, code);
      }
    } catch (error) {
      this.logger.error('Error copying code to target file', error);
      throw error;
    }
  }

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

  private findSmartInsertionPoint(document: vscode.TextDocument): vscode.Position {
    const text = document.getText();
    const lines = text.split('\n');

    let lastImportLine = -1;
    let firstExportLine = -1;

    for (const [index, rawLine] of lines.entries()) {
      const trimmed = rawLine.trim();

      if (trimmed.startsWith('import ')) {
        lastImportLine = index;
      } else if (trimmed.startsWith('export ') && firstExportLine === -1) {
        firstExportLine = index;
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

      // NOTE: Import merging logic is not yet fully implemented
      // Current behavior: Imports are extracted but not automatically merged
      // Future enhancement: Implement smart import merging that:
      // - Deduplicates imports from the same module
      // - Merges named imports from the same source
      // - Handles default vs named imports appropriately
      // - Respects the handleImports configuration ('merge', 'duplicate', 'skip')
      //
      // For now, imports in copied code are included as-is in the target file
      this.logger.debug('Import merging not yet fully implemented', {
        sourceImports: sourceImports.length,
        targetImports: targetImports.length,
        handleImports: this.configService.getCopyCodeConfig().handleImports,
      });
    } catch (error) {
      this.logger.warn('Error handling import merging', error);
    }
  }

  private async handleEnable(): Promise<void> {
    await this.configService.updateConfiguration('enabled', true);
    vscode.window.showInformationMessage('Additional Context Menus enabled');
  }

  private async handleDisable(): Promise<void> {
    await this.configService.updateConfiguration('enabled', false);
    vscode.window.showInformationMessage('Additional Context Menus disabled');
  }

  private async handleOpenInTerminal(): Promise<void> {
    this.logger.info('Open in Terminal command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const filePath = editor.document.fileName;
      await this.terminalService.openInTerminal(filePath);
    } catch (error) {
      this.logger.error('Error in Open in Terminal command', error);
      vscode.window.showErrorMessage('Failed to open terminal');
    }
  }

  private async handleConfigurationChanged(): Promise<void> {
    this.logger.debug('Configuration changed, updating context variables');
    await this.projectDetectionService.updateContextVariables();
  }

  private async handleWorkspaceChanged(): Promise<void> {
    this.logger.debug('Workspace changed, clearing caches');
    this.fileDiscoveryService.clearCache();
    this.projectDetectionService.clearCache();
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot >= 0 ? fileName.substring(lastDot) : '';
  }

  private getFileName(filePath: string): string {
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
  }

  public dispose(): void {
    this.logger.debug('Disposing ContextMenuManager');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
    this.projectDetectionService.dispose();
  }
}
