import * as vscode from 'vscode';

import { CodeAnalysisService } from '../services/codeAnalysisService';
import { ConfigurationService } from '../services/configurationService';
import { CronJobTimerGeneratorService } from '../services/cronJobTimerGeneratorService';
import { EnumGeneratorService } from '../services/enumGeneratorService';
import { EnvFileGeneratorService } from '../services/envFileGeneratorService';
import { FileDiscoveryService } from '../services/fileDiscoveryService';
import { FileNamingConventionService } from '../services/fileNamingConventionService';
import { FileSaveService } from '../services/fileSaveService';
import { ProjectDetectionService } from '../services/projectDetectionService';
import { TerminalService } from '../services/terminalService';
import { Logger } from '../utils/logger';

export class ContextMenuManager {
  private logger: Logger;
  private configService: ConfigurationService;
  private projectDetectionService: ProjectDetectionService;
  private fileDiscoveryService: FileDiscoveryService;
  private fileSaveService: FileSaveService;
  private codeAnalysisService: CodeAnalysisService;
  private terminalService: TerminalService;
  private enumGeneratorService: EnumGeneratorService;
  private envFileGeneratorService: EnvFileGeneratorService;
  private cronJobTimerGeneratorService: CronJobTimerGeneratorService;
  private fileNamingConventionService: FileNamingConventionService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.projectDetectionService = ProjectDetectionService.getInstance();
    this.fileDiscoveryService = FileDiscoveryService.getInstance();
    this.fileSaveService = FileSaveService.getInstance();
    this.codeAnalysisService = CodeAnalysisService.getInstance();
    this.terminalService = TerminalService.getInstance();
    this.enumGeneratorService = EnumGeneratorService.getInstance();
    this.envFileGeneratorService = EnvFileGeneratorService.getInstance();
    this.cronJobTimerGeneratorService = CronJobTimerGeneratorService.getInstance();
    this.fileNamingConventionService = FileNamingConventionService.getInstance();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing ContextMenuManager');

    // Register commands
    this.registerCommands();

    // Update context variables for menu visibility
    await this.projectDetectionService.updateContextVariables();

    // Update function context on initialization
    await this.updateFunctionContext();

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

    // Listen for cursor position changes to update function context
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(async () => {
        await this.updateFunctionContext();
      }),
    );

    this.logger.info('ContextMenuManager initialized successfully');
  }

  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand('additionalContextMenus.copyFunction', () =>
        this.handleCopyFunction(),
      ),
      vscode.commands.registerCommand('additionalContextMenus.copyContentToFile', () =>
        this.handleCopyLinesToFile(),
      ),
      vscode.commands.registerCommand('additionalContextMenus.moveContentToFile', () =>
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
      vscode.commands.registerCommand('additionalContextMenus.copyFunctionToFile', () =>
        this.handleCopyFunctionToFile(),
      ),
      vscode.commands.registerCommand('additionalContextMenus.moveFunctionToFile', () =>
        this.handleMoveFunctionToFile(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.renameFileConvention',
        async () => await this.handleRenameFileConvention(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.showOutputChannel',
        async () => await this.handleShowOutputChannel(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.debugContextVariables',
        async () => await this.handleDebugContextVariables(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.refreshContextVariables',
        async () => await this.handleRefreshContextVariables(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.checkKeybindingConflicts',
        async () => await this.handleCheckKeybindingConflicts(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.enableKeybindings',
        async () => await this.handleEnableKeybindings(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.disableKeybindings',
        async () => await this.handleDisableKeybindings(),
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
      vscode.window.showErrorMessage('Failed to copy function');
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

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('No code selected');
        return;
      }

      const selectedText = editor.document.getText(selection);
      const sourceExtension = this.getFileExtension(editor.document.fileName);

      // Get compatible files
      const compatibleFiles = await this.fileDiscoveryService.getCompatibleFiles(sourceExtension);

      // Auto-select if only one compatible file, otherwise show file selector
      let targetFilePath: string | undefined;
      if (compatibleFiles.length === 1 && compatibleFiles[0]) {
        // Auto-select the only compatible file (for test scenarios)
        targetFilePath = compatibleFiles[0].path;
      } else {
        targetFilePath = await this.fileDiscoveryService.showFileSelector(compatibleFiles);
      }

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

      // Auto-select if only one compatible file, otherwise show file selector
      let targetFilePath: string | undefined;
      if (compatibleFiles.length === 1 && compatibleFiles[0]) {
        // Auto-select the only compatible file (for test scenarios)
        targetFilePath = compatibleFiles[0].path;
      } else {
        targetFilePath = await this.fileDiscoveryService.showFileSelector(compatibleFiles);
      }

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
      const line = lines.at(i)?.trim() ?? '';

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

  private async handleCopyFunctionToFile(): Promise<void> {
    this.logger.info('Copy Function to File command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;
      const position = editor.selection.active;

      const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(
        document,
        position,
      );

      if (!functionInfo) {
        vscode.window.showWarningMessage('No function found at cursor position');
        return;
      }

      const sourceExtension = this.getFileExtension(document.fileName);

      const compatibleFiles = await this.fileDiscoveryService.getCompatibleFiles(sourceExtension);

      let targetFilePath: string | undefined;
      if (compatibleFiles.length === 1 && compatibleFiles[0]) {
        targetFilePath = compatibleFiles[0].path;
      } else {
        targetFilePath = await this.fileDiscoveryService.showFileSelector(compatibleFiles);
      }

      if (!targetFilePath) {
        return;
      }

      const isValid = await this.fileDiscoveryService.validateTargetFile(targetFilePath);
      if (!isValid) {
        vscode.window.showErrorMessage('Target file is not accessible or writable');
        return;
      }

      await this.copyCodeToTargetFile(functionInfo.fullText, targetFilePath, document);

      const fileName = this.getFileName(targetFilePath);
      vscode.window.showInformationMessage(`Function '${functionInfo.name}' copied to ${fileName}`);
      this.logger.info(`Function copied: ${functionInfo.name} to ${targetFilePath}`);
    } catch (error) {
      this.logger.error('Error in Copy Function to File command', error);
      vscode.window.showErrorMessage('Failed to copy function to file');
    }
  }

  private async handleMoveFunctionToFile(): Promise<void> {
    this.logger.info('Move Function to File command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;
      const position = editor.selection.active;

      const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(
        document,
        position,
      );

      if (!functionInfo) {
        vscode.window.showWarningMessage('No function found at cursor position');
        return;
      }

      const sourceExtension = this.getFileExtension(document.fileName);

      const compatibleFiles = await this.fileDiscoveryService.getCompatibleFiles(sourceExtension);

      let targetFilePath: string | undefined;
      if (compatibleFiles.length === 1 && compatibleFiles[0]) {
        targetFilePath = compatibleFiles[0].path;
      } else {
        targetFilePath = await this.fileDiscoveryService.showFileSelector(compatibleFiles);
      }

      if (!targetFilePath) {
        return;
      }

      const isValid = await this.fileDiscoveryService.validateTargetFile(targetFilePath);
      if (!isValid) {
        vscode.window.showErrorMessage('Target file is not accessible or writable');
        return;
      }

      await this.copyCodeToTargetFile(functionInfo.fullText, targetFilePath, document);

      const range = new vscode.Range(
        new vscode.Position(functionInfo.startLine - 1, 0),
        new vscode.Position(functionInfo.endLine, 0),
      );

      await editor.edit((editBuilder) => {
        editBuilder.delete(range);
      });

      const fileName = this.getFileName(targetFilePath);
      vscode.window.showInformationMessage(`Function '${functionInfo.name}' moved to ${fileName}`);
      this.logger.info(`Function moved: ${functionInfo.name} to ${targetFilePath}`);
    } catch (error) {
      this.logger.error('Error in Move Function to File command', error);
      vscode.window.showErrorMessage('Failed to move function to file');
    }
  }

  private async handleConfigurationChanged(): Promise<void> {
    this.logger.debug('Configuration changed, updating context variables');
    await this.projectDetectionService.updateContextVariables();
  }

  private async updateFunctionContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    let isInFunction = false;

    if (editor) {
      const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(
        editor.document,
        editor.selection.active,
      );
      isInFunction = !!functionInfo;
    }

    await vscode.commands.executeCommand(
      'setContext',
      'additionalContextMenus.isInFunction',
      isInFunction,
    );
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

  private async handleRenameFileConvention(): Promise<void> {
    this.logger.info('Rename File Convention command triggered');

    try {
      const conventions: (vscode.QuickPickItem & {
        value: 'kebab-case' | 'camelCase' | 'PascalCase';
      })[] = [
        { label: 'kebab-case', description: 'my-component-name.ts', value: 'kebab-case' },
        { label: 'camelCase', description: 'myComponentName.ts', value: 'camelCase' },
        { label: 'PascalCase', description: 'MyComponentName.ts', value: 'PascalCase' },
      ];

      const selected = await vscode.window.showQuickPick(conventions, {
        placeHolder: 'Select naming convention',
      });

      if (!selected) {
        return;
      }

      await this.fileNamingConventionService.showRenameSuggestions(selected.value);
    } catch (error) {
      this.logger.error('Error in rename file convention', error);
      vscode.window.showErrorMessage(
        `Failed to show rename suggestions: ${(error as Error).message}`,
      );
    }
  }

  private async handleShowOutputChannel(): Promise<void> {
    this.logger.debug('Show Output Channel command triggered');
    try {
      // Create or get output channel
      const outputChannel = vscode.window.createOutputChannel('Additional Context Menus');
      outputChannel.show(true);
      outputChannel.appendLine('Extension output channel opened');
      this.logger.info('Output channel shown');
    } catch (error) {
      this.logger.error('Error showing output channel', error);
      vscode.window.showErrorMessage('Failed to show output channel');
    }
  }

  private async handleDebugContextVariables(): Promise<void> {
    this.logger.debug('Debug Context Variables command triggered');
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const projectType = await this.projectDetectionService.detectProjectType();
      const isEnabled = this.configService.isEnabled();

      const debugInfo = [
        'Extension State:',
        `  - Enabled: ${isEnabled}`,
        `  - Node Project: ${projectType.isNodeProject}`,
        `  - Workspace Folders: ${workspaceFolders?.length ?? 0}`,
        `  - Frameworks: ${projectType.frameworks.join(', ')}`,
        `  - TypeScript: ${projectType.hasTypeScript}`,
        `  - Support Level: ${projectType.supportLevel}`,
      ];

      const outputChannel = vscode.window.createOutputChannel('Additional Context Menus Debug');
      outputChannel.show();
      outputChannel.appendLine(debugInfo.join('\n'));

      this.logger.info('Debug context variables displayed');
    } catch (error) {
      this.logger.error('Error debugging context variables', error);
      vscode.window.showErrorMessage('Failed to debug context variables');
    }
  }

  private async handleRefreshContextVariables(): Promise<void> {
    this.logger.debug('Refresh Context Variables command triggered');
    try {
      await this.projectDetectionService.updateContextVariables();
      vscode.window.showInformationMessage('Context variables refreshed');
      this.logger.info('Context variables refreshed');
    } catch (error) {
      this.logger.error('Error refreshing context variables', error);
      vscode.window.showErrorMessage('Failed to refresh context variables');
    }
  }

  private async handleCheckKeybindingConflicts(): Promise<void> {
    this.logger.debug('Check Keybinding Conflicts command triggered');
    try {
      const config = this.configService.getConfiguration();
      const enabled = config.keybindings.enabled;
      const showInMenu = config.keybindings.showInMenu;

      let message = 'Keybinding Configuration:\n';
      message += `  - Enabled: ${enabled}\n`;
      message += `  - Show in Menu: ${showInMenu}\n`;

      if (!enabled) {
        message += '\nCustom keybindings are currently disabled.';
      } else {
        message += '\nCustom keybindings are enabled.';
      }

      await vscode.window.showInformationMessage(message, 'OK');
      this.logger.info('Keybinding conflicts checked');
    } catch (error) {
      this.logger.error('Error checking keybinding conflicts', error);
      vscode.window.showErrorMessage('Failed to check keybinding conflicts');
    }
  }

  private async handleEnableKeybindings(): Promise<void> {
    this.logger.debug('Enable Keybindings command triggered');
    try {
      const confirm = await vscode.window.showWarningMessage(
        'Enable custom keybindings for extension commands?',
        'Enable',
        'Cancel',
      );

      if (confirm === 'Enable') {
        await vscode.workspace
          .getConfiguration('additionalContextMenus')
          .update('enableKeybindings', true, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Custom keybindings enabled');
        this.logger.info('Custom keybindings enabled');
      }
    } catch (error) {
      this.logger.error('Error enabling keybindings', error);
      vscode.window.showErrorMessage('Failed to enable keybindings');
    }
  }

  private async handleDisableKeybindings(): Promise<void> {
    this.logger.debug('Disable Keybindings command triggered');
    try {
      await vscode.workspace
        .getConfiguration('additionalContextMenus')
        .update('enableKeybindings', false, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('Custom keybindings disabled');
      this.logger.info('Custom keybindings disabled');
    } catch (error) {
      this.logger.error('Error disabling keybindings', error);
      vscode.window.showErrorMessage('Failed to disable keybindings');
    }
  }

  public dispose(): void {
    this.logger.debug('Disposing ContextMenuManager');
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
  }
}
