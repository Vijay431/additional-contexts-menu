import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigurationService } from '../services/configurationService';
import { ProjectDetectionService } from '../services/projectDetectionService';
import { FileDiscoveryService } from '../services/fileDiscoveryService';
import { FileSaveService } from '../services/fileSaveService';
import { CodeAnalysisService } from '../services/codeAnalysisService';

export class ContextMenuManager {
  private logger: Logger;
  private configService: ConfigurationService;
  private projectDetectionService: ProjectDetectionService;
  private fileDiscoveryService: FileDiscoveryService;
  private fileSaveService: FileSaveService;
  private codeAnalysisService: CodeAnalysisService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.projectDetectionService = ProjectDetectionService.getInstance();
    this.fileDiscoveryService = FileDiscoveryService.getInstance();
    this.fileSaveService = FileSaveService.getInstance();
    this.codeAnalysisService = CodeAnalysisService.getInstance();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing ContextMenuManager');

    // Register commands
    this.registerCommands();

    // Update context variables for menu visibility
    await this.projectDetectionService.updateContextVariables();

    // Listen for configuration changes
    this.disposables.push(
      this.configService.onConfigurationChanged(() => {
        this.handleConfigurationChanged();
      })
    );

    // Listen for workspace changes
    this.disposables.push(
      this.projectDetectionService.onWorkspaceChanged(() => {
        this.handleWorkspaceChanged();
      })
    );

    // Listen for file system changes
    this.disposables.push(this.fileDiscoveryService.onFileSystemChanged());

    this.logger.info('ContextMenuManager initialized successfully');
  }

  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand('additionalContextMenus.copyFunction', () =>
        this.handleCopyFunction()
      ),
      vscode.commands.registerCommand('additionalContextMenus.copyCodeToFile', () =>
        this.handleCopyCodeToFile()
      ),
      vscode.commands.registerCommand('additionalContextMenus.moveCodeToFile', () =>
        this.handleMoveCodeToFile()
      ),
      vscode.commands.registerCommand('additionalContextMenus.saveAll', () => this.handleSaveAll()),
      vscode.commands.registerCommand('additionalContextMenus.enable', async () => await this.handleEnable()),
      vscode.commands.registerCommand('additionalContextMenus.disable', async () => await this.handleDisable()),
      vscode.commands.registerCommand('additionalContextMenus.showOutputChannel', () =>
        this.handleShowOutputChannel()
      )
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
      const position = editor.selection.active;

      // Find function at cursor position
      const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(
        document,
        position
      );

      if (!functionInfo) {
        vscode.window.showWarningMessage('No function found at cursor position');
        return;
      }

      // Copy function to clipboard
      await vscode.env.clipboard.writeText(functionInfo.fullText);

      vscode.window.showInformationMessage(
        `Copied ${functionInfo.type} '${functionInfo.name}' to clipboard`
      );
      this.logger.info(`Function copied: ${functionInfo.name}`);
    } catch (error) {
      this.logger.error('Error in Copy Function command', error);
      vscode.window.showErrorMessage('Failed to copy function');
    }
  }

  private async handleCopyCodeToFile(): Promise<void> {
    this.logger.info('Copy Code to File command triggered');

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
      vscode.window.showInformationMessage(`Code copied to ${fileName}`);
      this.logger.info(`Code copied to: ${targetFilePath}`);
    } catch (error) {
      this.logger.error('Error in Copy Code to File command', error);
      vscode.window.showErrorMessage('Failed to copy code to file');
    }
  }

  private async handleMoveCodeToFile(): Promise<void> {
    this.logger.info('Move Code to File command triggered');

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
      vscode.window.showInformationMessage(`Code moved to ${fileName}`);
      this.logger.info(`Code moved to: ${targetFilePath}`);
    } catch (error) {
      this.logger.error('Error in Move Code to File command', error);
      vscode.window.showErrorMessage('Failed to move code to file');
    }
  }

  private async handleSaveAll(): Promise<void> {
    this.logger.info('Save All command triggered');

    try {
      const result = await this.fileSaveService.saveAllFiles();
      this.logger.info('Save All completed', result);
    } catch (error) {
      this.logger.error('Error in Save All command', error);
      vscode.window.showErrorMessage('Failed to save files: ' + (error as Error).message);
    }
  }

  private async copyCodeToTargetFile(
    code: string,
    targetFilePath: string,
    sourceDocument: vscode.TextDocument
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
        vscode.ViewColumn.Beside
      );

      // Insert code at the determined position
      await targetEditor.edit((editBuilder) => {
        editBuilder.insert(insertionPoint, '\n' + code + '\n');
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';

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

  private async handleImportMerging(
    sourceDocument: vscode.TextDocument,
    targetDocument: vscode.TextDocument,
    copiedCode: string
  ): Promise<void> {
    try {
      // Extract imports from copied code
      const sourceImports = this.codeAnalysisService.extractImports(
        copiedCode,
        sourceDocument.languageId
      );

      if (sourceImports.length === 0) {
        return;
      }

      // Get existing imports from target file
      const targetText = targetDocument.getText();
      const targetImports = this.codeAnalysisService.extractImports(
        targetText,
        targetDocument.languageId
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

  private async handleEnable(): Promise<void> {
    await this.configService.updateConfiguration('enabled', true);
    vscode.window.showInformationMessage('Additional Context Menus enabled');
  }

  private async handleDisable(): Promise<void> {
    await this.configService.updateConfiguration('enabled', false);
    vscode.window.showInformationMessage('Additional Context Menus disabled');
  }

  private handleShowOutputChannel(): void {
    this.logger.show();
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
  }
}
