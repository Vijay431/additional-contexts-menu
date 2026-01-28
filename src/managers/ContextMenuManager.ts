import { constants } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import * as vscode from 'vscode';

import { CodeAnalysisService } from '../services/codeAnalysisService';
import { CommitlintConfigGeneratorService } from '../services/commitlintConfigGeneratorService';
import { ConfigurationService } from '../services/configurationService';
import { CriticalCssExtractorService } from '../services/criticalCssExtractorService';
import { EnumCreatorService } from '../services/enumCreatorService';
import { FileDiscoveryService } from '../services/fileDiscoveryService';
import { FileSaveService } from '../services/fileSaveService';
import { InfiniteScrollGeneratorService } from '../services/infiniteScrollGeneratorService';
import { PaginatedQueryBuilderService } from '../services/paginatedQueryBuilderService';
import { PdfReportGeneratorService } from '../services/pdfReportGeneratorService';
import { ProjectDetectionService } from '../services/projectDetectionService';
import { RateLimitDashboardGeneratorService } from '../services/rateLimitDashboardGeneratorService';
import { ReactHocCreatorService } from '../services/reactHocCreatorService';
import { SagaPatternGeneratorService } from '../services/sagaPatternGeneratorService';
import { SemanticReleaseConfigGeneratorService } from '../services/semanticReleaseConfigGeneratorService';
import { SocketIOHandlerGeneratorService } from '../services/socketIoHandlerGeneratorService';
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
  private infiniteScrollGeneratorService: InfiniteScrollGeneratorService;
  private sagaPatternGeneratorService: SagaPatternGeneratorService;
  private socketIoHandlerGeneratorService: SocketIOHandlerGeneratorService;
  private paginatedQueryBuilderService: PaginatedQueryBuilderService;
  private commitlintConfigGeneratorService: CommitlintConfigGeneratorService;
  private criticalCssExtractorService: CriticalCssExtractorService;
  private pdfReportGeneratorService: PdfReportGeneratorService;
  private rateLimitDashboardGeneratorService: RateLimitDashboardGeneratorService;
  private enumCreatorService: EnumCreatorService;
  private reactHocCreatorService: ReactHocCreatorService;
  private semanticReleaseConfigGeneratorService: SemanticReleaseConfigGeneratorService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.projectDetectionService = ProjectDetectionService.getInstance();
    this.fileDiscoveryService = FileDiscoveryService.getInstance();
    this.fileSaveService = FileSaveService.getInstance();
    this.codeAnalysisService = CodeAnalysisService.getInstance();
    this.terminalService = TerminalService.getInstance();
    this.infiniteScrollGeneratorService = InfiniteScrollGeneratorService.getInstance();
    this.sagaPatternGeneratorService = SagaPatternGeneratorService.getInstance();
    this.socketIoHandlerGeneratorService = SocketIOHandlerGeneratorService.getInstance();
    this.paginatedQueryBuilderService = PaginatedQueryBuilderService.getInstance();
    this.pdfReportGeneratorService = PdfReportGeneratorService.getInstance();
    this.commitlintConfigGeneratorService = CommitlintConfigGeneratorService.getInstance();
    this.criticalCssExtractorService = CriticalCssExtractorService.getInstance();
    this.enumCreatorService = EnumCreatorService.getInstance();
    this.rateLimitDashboardGeneratorService = RateLimitDashboardGeneratorService.getInstance();
    this.reactHocCreatorService = ReactHocCreatorService.getInstance();
    this.semanticReleaseConfigGeneratorService = SemanticReleaseConfigGeneratorService.getInstance();
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
      vscode.commands.registerCommand(
        'additionalContextMenus.generateInfiniteScroll',
        async () => await this.handleGenerateInfiniteScroll(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateSagaPattern',
        async () => await this.handleGenerateSagaPattern(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateSocketIoHandler',
        async () => await this.handleGenerateSocketIoHandler(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generatePaginatedQuery',
        async () => await this.handleGeneratePaginatedQuery(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateCommitlintConfig',
        async () => await this.handleGenerateCommitlintConfig(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.extractCriticalCss',
        async () => await this.handleExtractCriticalCss(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateRateLimitDashboard',
        async () => await this.handleGenerateRateLimitDashboard(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generatePdfReport',
        async () => await this.handleGeneratePdfReport(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.createEnum',
        async () => await this.handleCreateEnum(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateReactHoc',
        async () => await this.handleGenerateReactHoc(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateSemanticReleaseConfig',
        async () => await this.handleGenerateSemanticReleaseConfig(),
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

  private async handleGenerateInfiniteScroll(): Promise<void> {
    this.logger.info('Generate Infinite Scroll command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;
      const selection = editor.selection;

      // Reject untitled files
      if (document.isUntitled) {
        vscode.window.showErrorMessage(
          'Generate Infinite Scroll is not available for untitled files. Please save the file first.',
        );
        return;
      }

      // Validate file is TypeScript/JavaScript React file
      const supportedLangIds = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'];
      if (!supportedLangIds.includes(document.languageId)) {
        vscode.window.showWarningMessage(
          'Generate Infinite Scroll is only available for TypeScript and JavaScript React files.',
        );
        return;
      }

      // Get options from user
      const options = await this.infiniteScrollGeneratorService.getGeneratorOptions();

      if (!options) {
        this.logger.info('User cancelled Infinite Scroll generation');
        return;
      }

      // Generate the infinite scroll component
      const result = await this.infiniteScrollGeneratorService.generateInfiniteScrollComponent(
        document,
        selection,
        options,
      );

      // Check if component file already exists
      const componentExists = await this.infiniteScrollGeneratorService.componentFileExists(
        result.componentFilePath,
      );

      if (componentExists) {
        const overwrite = await vscode.window.showWarningMessage(
          `Infinite scroll component already exists at ${result.componentFilePath}. Overwrite?`,
          { modal: true },
          'Yes',
          'No',
        );

        if (overwrite !== 'Yes') {
          this.logger.info('User chose not to overwrite existing infinite scroll component file');
          return;
        }
      }

      // Create component file
      await this.infiniteScrollGeneratorService.createComponentFile(
        result.componentFilePath,
        result.componentCode,
      );

      // Create hook file if generated
      if (result.hookCode && result.hookFilePath) {
        await this.infiniteScrollGeneratorService.createHookFile(
          result.hookFilePath,
          result.hookCode,
        );
      }

      // Open the generated component file
      const componentUri = vscode.Uri.file(result.componentFilePath);
      await vscode.window.showTextDocument(componentUri, { preview: false });

      vscode.window.showInformationMessage(
        `Infinite Scroll component (${result.componentName}) saved to ${result.componentFilePath}`,
      );
      this.logger.info('Infinite Scroll generated successfully');
    } catch (error) {
      this.logger.error('Error generating Infinite Scroll', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate Infinite Scroll: ${errorMessage}`);
    }
  }

  private async handleGenerateSagaPattern(): Promise<void> {
    this.logger.info('Generate Saga Pattern command triggered');

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
          'Generate Saga Pattern is not available for untitled files. Please save the file first.',
        );
        return;
      }

      // Validate file is TypeScript/JavaScript file
      const supportedLangIds = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
      if (!supportedLangIds.includes(document.languageId)) {
        vscode.window.showWarningMessage(
          'Generate Saga Pattern is only available for TypeScript and JavaScript files.',
        );
        return;
      }

      // Get options from user
      const options = await this.sagaPatternGeneratorService.getGeneratorOptions();

      if (!options) {
        this.logger.info('User cancelled Saga Pattern generation');
        return;
      }

      // Generate the saga orchestrator
      const result = await this.sagaPatternGeneratorService.generateSagaOrchestrator(
        document,
        options,
      );

      // Check if orchestrator file already exists
      const orchestratorExists = await this.sagaPatternGeneratorService.orchestratorFileExists(
        result.filePath,
      );

      if (orchestratorExists) {
        const overwrite = await vscode.window.showWarningMessage(
          `Saga orchestrator already exists at ${result.filePath}. Overwrite?`,
          { modal: true },
          'Yes',
          'No',
        );

        if (overwrite !== 'Yes') {
          this.logger.info('User chose not to overwrite existing saga orchestrator file');
          return;
        }
      }

      // Create orchestrator file
      await this.sagaPatternGeneratorService.createOrchestratorFile(
        result.filePath,
        result.orchestratorCode,
      );

      // Open the generated orchestrator file
      const orchestratorUri = vscode.Uri.file(result.filePath);
      await vscode.window.showTextDocument(orchestratorUri, { preview: false });

      vscode.window.showInformationMessage(
        `Saga orchestrator (${result.orchestratorName}) saved to ${result.filePath}`,
      );
      this.logger.info('Saga Pattern generated successfully');
    } catch (error) {
      this.logger.error('Error generating Saga Pattern', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate Saga Pattern: ${errorMessage}`);
    }
  }

  private async handleGenerateSocketIoHandler(): Promise<void> {
    this.logger.info('Generate Socket.IO Handler command triggered');

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
          'Generate Socket.IO Handler is not available for untitled files. Please save the file first.',
        );
        return;
      }

      // Validate file is TypeScript/JavaScript file
      const supportedLangIds = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
      if (!supportedLangIds.includes(document.languageId)) {
        vscode.window.showWarningMessage(
          'Generate Socket.IO Handler is only available for TypeScript and JavaScript files.',
        );
        return;
      }

      // Get configuration
      const config = this.configService.getSocketIoHandlerGeneratorConfig();

      if (!config.enabled) {
        vscode.window.showWarningMessage('Socket.IO Handler Generator is disabled in settings.');
        return;
      }

      // Generate the Socket.IO handler
      const options = await this.socketIoHandlerGeneratorService.collectOptions();
      if (!options) {
        this.logger.info('User cancelled Socket.IO Handler generation');
        return;
      }

      const result = await this.socketIoHandlerGeneratorService.generateSocketIOHandler(document, options);

      // Create handler file
      await this.socketIoHandlerGeneratorService.createHandlerFile(result.filePath, result);

      // Open the generated file
      const handlerUri = vscode.Uri.file(result.filePath);
      await vscode.window.showTextDocument(handlerUri, { preview: false });

      vscode.window.showInformationMessage(
        `Socket.IO Handler (${result.serverName}) saved to ${result.filePath}`,
      );

      this.logger.info('Socket.IO Handler generated successfully');
    } catch (error) {
      this.logger.error('Error generating Socket.IO Handler', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate Socket.IO Handler: ${errorMessage}`);
    }
  }

  private async handleGeneratePaginatedQuery(): Promise<void> {
    this.logger.info('Generate Paginated Query command triggered');

    try {
      const workspacePath =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      // Get config from configuration service
      const config = this.configService.getPaginatedQueryBuilderConfig();

      if (!config?.enabled) {
        vscode.window.showWarningMessage('Paginated Query Builder is not enabled');
        return;
      }

      // Generate the paginated query
      const result = await this.paginatedQueryBuilderService.generatePaginatedQuery(
        workspacePath,
        config,
      );

      if (!result) {
        this.logger.info('User cancelled Paginated Query generation');
        return;
      }

      // Get output directory
      const outputPath = config.outputDirectory || workspacePath;

      // Create query files
      await this.paginatedQueryBuilderService.createQueryFiles(outputPath, result);

      vscode.window.showInformationMessage(
        `Paginated Query files saved to ${outputPath}`,
      );
      this.logger.info('Paginated Query generated successfully');
    } catch (error) {
      this.logger.error('Error generating Paginated Query', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate Paginated Query: ${errorMessage}`);
    }
  }

  private async handleGenerateCommitlintConfig(): Promise<void> {
    this.logger.info('Generate CommitLint Configuration command triggered');

    try {
      await this.commitlintConfigGeneratorService.generateCommitlintConfig();
      this.logger.info('CommitLint configuration generated successfully');
    } catch (error) {
      this.logger.error('Error generating CommitLint configuration', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate CommitLint configuration: ${errorMessage}`);
    }
  }

  private async handleExtractCriticalCss(): Promise<void> {
    this.logger.info('Extract Critical CSS command triggered');

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
          'Extract Critical CSS is not available for untitled files. Please save the file first.',
        );
        return;
      }

      // Validate file is CSS or component file
      const supportedLangIds = ['css', 'scss', 'less', 'stylus', 'typescriptreact', 'javascriptreact'];
      if (!supportedLangIds.includes(document.languageId)) {
        vscode.window.showWarningMessage(
          'Extract Critical CSS is only available for CSS and component files.',
        );
        return;
      }

      // Get configuration
      const config = this.configService.getCriticalCssExtractorConfig();

      if (!config.enabled) {
        vscode.window.showWarningMessage('Critical CSS Extractor is disabled in settings.');
        return;
      }

      // Get options from user
      const options = await this.criticalCssExtractorService.getExtractionOptions();

      if (!options) {
        this.logger.info('User cancelled Critical CSS extraction');
        return;
      }

      // Get selection or entire document
      const selection =
        editor.selection.isEmpty
          ? new vscode.Selection(new vscode.Position(0, 0), document.lineAt(document.lineCount - 1).rangeIncludingLineBreak.end)
          : editor.selection;

      // Extract critical CSS
      const result = await this.criticalCssExtractorService.extractCriticalCss(
        document,
        selection,
        options,
      );

      // Get workspace path
      const workspacePath =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      // Create CSS files
      await this.criticalCssExtractorService.createCssFiles(
        options.outputDirectory,
        options.criticalFileName,
        options.nonCriticalFileName,
        result,
        workspacePath,
      );

      // Show results
      const stats = result.statistics;
      const message = `
Critical CSS Extracted Successfully!

Statistics:
- Total Rules: ${stats.totalRules}
- Critical Rules: ${stats.criticalRules}
- Non-Critical Rules: ${stats.nonCriticalRules}
- Original Size: ${this.formatBytes(stats.originalSize)}
- Critical Size: ${this.formatBytes(stats.criticalSize)}
- Estimated Savings: ${this.formatBytes(stats.estimatedSavings)}

Files created in: ${options.outputDirectory}
  - ${options.criticalFileName}
  - ${options.nonCriticalFileName}
  ${options.generateAsyncLoader ? `- css-async-loader.js` : ''}
      `.trim();

      vscode.window.showInformationMessage(message, { modal: true });

      // Generate HTML snippet
      const htmlSnippet = this.criticalCssExtractorService.generateHtmlSnippet(
        options.criticalFileName,
        options.nonCriticalFileName,
        options.generateAsyncLoader,
      );

      // Show HTML snippet in new document
      const snippetDoc = await vscode.workspace.openTextDocument({
        content: htmlSnippet,
        language: 'html',
      });
      await vscode.window.showTextDocument(snippetDoc, { preview: false });

      this.logger.info('Critical CSS extracted successfully', {
        criticalSize: stats.criticalSize,
        estimatedSavings: stats.estimatedSavings,
      });
    } catch (error) {
      this.logger.error('Error extracting Critical CSS', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to extract Critical CSS: ${errorMessage}`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private async handleGenerateRateLimitDashboard(): Promise<void> {
    this.logger.info('Generate Rate Limit Dashboard command triggered');

    try {
      const workspacePath =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
      if (!workspacePath) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      // Get config from configuration service
      const config = this.configService.getRateLimitDashboardGeneratorConfig();

      if (!config?.enabled) {
        vscode.window.showWarningMessage('Rate Limit Dashboard Generator is not enabled');
        return;
      }

      // Generate the rate limit dashboard
      const result = await this.rateLimitDashboardGeneratorService.generateRateLimitDashboard(
        workspacePath,
        config,
      );

      if (!result) {
        this.logger.info('User cancelled Rate Limit Dashboard generation');
        return;
      }

      // Create files
      for (const file of result.files) {
        const directory = path.dirname(file.path);
        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(directory));
        } catch {
          await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
        }
        await this.rateLimitDashboardGeneratorService.createFile(file.path, file.content);
      }

      vscode.window.showInformationMessage(
        `Rate Limit Dashboard (${result.name}) generated successfully with ${result.metrics.length} metrics`,
      );
      this.logger.info('Rate Limit Dashboard generated successfully');
    } catch (error) {
      this.logger.error('Error generating Rate Limit Dashboard', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate Rate Limit Dashboard: ${errorMessage}`);
    }
  }

  private async handleGeneratePdfReport(): Promise<void> {
    this.logger.info('Generate PDF Report command triggered');

    try {
      await this.pdfReportGeneratorService.generatePdfReport();
      this.logger.info('PDF Report generated successfully');
    } catch (error) {
      this.logger.error('Error generating PDF Report', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate PDF Report: ${errorMessage}`);
    }
  }

  private async handleGenerateReactHoc(): Promise<void> {
    this.logger.info('Generate React HOC command triggered');

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
          'Generate React HOC is not available for untitled files. Please save the file first.',
        );
        return;
      }

      // Validate file is TypeScript/JavaScript React file
      const supportedLangIds = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'];
      if (!supportedLangIds.includes(document.languageId)) {
        vscode.window.showWarningMessage(
          'Generate React HOC is only available for TypeScript and JavaScript React files.',
        );
        return;
      }

      // Get options from user
      const options = await this.reactHocCreatorService.getGeneratorOptions();

      if (!options) {
        this.logger.info('User cancelled React HOC generation');
        return;
      }

      // Generate the HOC
      const result = await this.reactHocCreatorService.generateHoc(document, options);

      // Check if HOC file already exists
      const hocExists = await this.reactHocCreatorService.hocFileExists(result.filePath);

      if (hocExists) {
        const overwrite = await vscode.window.showWarningMessage(
          `HOC file already exists at ${result.filePath}. Overwrite?`,
          { modal: true },
          'Yes',
          'No',
        );

        if (overwrite !== 'Yes') {
          this.logger.info('User chose not to overwrite existing HOC file');
          return;
        }
      }

      // Create HOC file
      await this.reactHocCreatorService.createHocFile(result.filePath, result.hocCode);

      // Open the generated HOC file
      const hocUri = vscode.Uri.file(result.filePath);
      await vscode.window.showTextDocument(hocUri, { preview: false });

      vscode.window.showInformationMessage(
        `React HOC (${result.hocName}) saved to ${result.filePath}`,
      );
      this.logger.info('React HOC generated successfully');
    } catch (error) {
      this.logger.error('Error generating React HOC', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate React HOC: ${errorMessage}`);
    }
  }

  private async handleGenerateSemanticReleaseConfig(): Promise<void> {
    this.logger.info('Generate semantic-release configuration command triggered');

    try {
      await this.semanticReleaseConfigGeneratorService.generateSemanticReleaseConfig();
      this.logger.info('semantic-release configuration generated successfully');
    } catch (error) {
      this.logger.error('Error generating semantic-release configuration', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to generate semantic-release configuration: ${errorMessage}`);
    }
  }

  private async handleCreateEnum(): Promise<void> {
    this.logger.info('Create Enum command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;
      const selection = editor.selection;

      if (selection.isEmpty) {
        vscode.window.showWarningMessage(
          'Please select a string literal union type (e.g., type Status = "pending" | "approved" | "rejected")',
        );
        return;
      }

      // Get default enum name from selection or user input
      const selectedText = document.getText(selection);
      const typeMatch = selectedText.match(/type\s+(\w+)\s*=/);
      const defaultEnumName = typeMatch?.[1] || undefined;

      // Get generation options from user
      const options = await this.enumCreatorService.getGenerationOptions(defaultEnumName);

      if (!options) {
        this.logger.info('User cancelled enum creation');
        return;
      }

      // Generate enum from selection
      const result = await this.enumCreatorService.generateEnumFromSelection(
        document,
        selection,
        options,
      );

      // Show preview and get user confirmation
      const shouldCreate = await this.enumCreatorService.showEnumPreview(result);

      if (!shouldCreate) {
        this.logger.info('User chose not to create enum file');
        return;
      }

      // Check if file already exists
      const fileExists = await this.enumCreatorService.enumFileExists(result.filePath);

      if (fileExists) {
        const overwrite = await vscode.window.showWarningMessage(
          `Enum file already exists at ${result.filePath}. Overwrite?`,
          'Overwrite',
          'Cancel',
        );

        if (overwrite !== 'Overwrite') {
          this.logger.info('User chose not to overwrite existing enum file');
          return;
        }
      }

      // Create enum file
      const fullCode =
        result.enumCode +
        (result.validationCode || '') +
        (result.reverseMappingCode || '') +
        (result.typeGuardCode || '');

      await this.enumCreatorService.createEnumFile(result.filePath, fullCode);

      // Open the generated enum file
      const enumUri = vscode.Uri.file(result.filePath);
      await vscode.window.showTextDocument(enumUri, { preview: false });

      vscode.window.showInformationMessage(
        `Enum (${result.enumName}) saved to ${result.filePath}`,
      );
      this.logger.info('Enum generated successfully');
    } catch (error) {
      this.logger.error('Error creating enum', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to create enum: ${errorMessage}`);
    }
  }

  public dispose(): void {
    this.logger.debug('Disposing ContextMenuManager');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
    this.projectDetectionService.dispose();
  }
}
