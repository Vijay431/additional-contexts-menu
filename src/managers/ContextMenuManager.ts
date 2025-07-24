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
      vscode.commands.registerCommand(
        'additionalContextMenus.enable',
        async () => await this.handleEnable()
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.disable',
        async () => await this.handleDisable()
      ),
      vscode.commands.registerCommand('additionalContextMenus.showOutputChannel', () =>
        this.handleShowOutputChannel()
      ),
      vscode.commands.registerCommand('additionalContextMenus.debugContextVariables', () =>
        this.handleDebugContextVariables()
      ),
      vscode.commands.registerCommand('additionalContextMenus.refreshContextVariables', () =>
        this.handleRefreshContextVariables()
      ),
      vscode.commands.registerCommand('additionalContextMenus.checkKeybindingConflicts', () =>
        this.handleCheckKeybindingConflicts()
      ),
      vscode.commands.registerCommand('additionalContextMenus.enableKeybindings', () =>
        this.handleEnableKeybindings()
      ),
      vscode.commands.registerCommand('additionalContextMenus.disableKeybindings', () =>
        this.handleDisableKeybindings()
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

  private async handleDebugContextVariables(): Promise<void> {
    this.logger.info('Debug Context Variables command triggered');
    
    try {
      const projectType = await this.projectDetectionService.detectProjectType();
      const isEnabled = this.configService.isEnabled();
      
      const debugInfo = {
        extensionEnabled: isEnabled,
        projectDetection: {
          isNodeProject: projectType.isNodeProject,
          frameworks: projectType.frameworks,
          hasTypeScript: projectType.hasTypeScript,
          supportLevel: projectType.supportLevel
        },
        workspace: {
          workspaceFolders: vscode.workspace.workspaceFolders?.length || 0,
          activeEditor: !!vscode.window.activeTextEditor,
          activeFile: vscode.window.activeTextEditor?.document.fileName || 'none'
        }
      };

      this.logger.info('Current extension state', debugInfo);
      
      // Show in output channel
      this.logger.show();
      
      // Also show user-friendly message
      const message = `Extension: ${isEnabled ? 'Enabled' : 'Disabled'} | Node Project: ${projectType.isNodeProject ? 'Yes' : 'No'} | Frameworks: ${projectType.frameworks.join(', ') || 'None'}`;
      vscode.window.showInformationMessage(message);
      
    } catch (error) {
      this.logger.error('Error in Debug Context Variables command', error);
      vscode.window.showErrorMessage('Failed to debug context variables');
    }
  }

  private async handleRefreshContextVariables(): Promise<void> {
    this.logger.info('Refresh Context Variables command triggered');
    
    try {
      // Clear caches
      this.projectDetectionService.clearCache();
      
      // Update context variables
      await this.projectDetectionService.updateContextVariables();
      
      vscode.window.showInformationMessage('Context variables refreshed successfully');
      this.logger.info('Context variables refreshed');
      
    } catch (error) {
      this.logger.error('Error in Refresh Context Variables command', error);
      vscode.window.showErrorMessage('Failed to refresh context variables');
    }
  }

  private async handleCheckKeybindingConflicts(): Promise<void> {
    this.logger.info('Check Keybinding Conflicts command triggered');
    
    try {
      const keybindings = [
        { command: 'Copy Function', key: 'Ctrl+Alt+Shift+F' },
        { command: 'Copy to File', key: 'Ctrl+Alt+Shift+C' },
        { command: 'Move to File', key: 'Ctrl+Alt+Shift+M' },
        { command: 'Save All', key: 'Ctrl+Alt+Shift+A' }
      ];

      // Show in output channel for detailed view
      this.logger.info('Keybinding conflict check', { keybindings });
      this.logger.show();
      
      // Show informational dialog
      const action = await vscode.window.showInformationMessage(
        'Check VS Code Keyboard Shortcuts editor for potential conflicts. See output channel for details.',
        'Open Keyboard Shortcuts',
        'Enable Keybindings',
        'Cancel'
      );

      if (action === 'Open Keyboard Shortcuts') {
        await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings');
      } else if (action === 'Enable Keybindings') {
        await this.handleEnableKeybindings();
      }
      
    } catch (error) {
      this.logger.error('Error in Check Keybinding Conflicts command', error);
      vscode.window.showErrorMessage('Failed to check keybinding conflicts');
    }
  }

  private async handleEnableKeybindings(): Promise<void> {
    this.logger.info('Enable Keybindings command triggered');
    
    try {
      const confirmation = await vscode.window.showWarningMessage(
        'This will enable keyboard shortcuts for Additional Context Menus. Make sure to check for conflicts first.',
        'Check Conflicts First',
        'Enable Anyway',
        'Cancel'
      );

      if (confirmation === 'Check Conflicts First') {
        await this.handleCheckKeybindingConflicts();
        return;
      } else if (confirmation === 'Enable Anyway') {
        await this.configService.updateConfiguration('enableKeybindings', true);
        vscode.window.showInformationMessage('Keybindings enabled! Use Ctrl+Alt+Shift+[F/C/M/A] for commands.');
        this.logger.info('Keybindings enabled');
      }
      
    } catch (error) {
      this.logger.error('Error in Enable Keybindings command', error);
      vscode.window.showErrorMessage('Failed to enable keybindings');
    }
  }

  private async handleDisableKeybindings(): Promise<void> {
    this.logger.info('Disable Keybindings command triggered');
    
    try {
      await this.configService.updateConfiguration('enableKeybindings', false);
      vscode.window.showInformationMessage('Keybindings disabled. Use context menu for commands.');
      this.logger.info('Keybindings disabled');
      
    } catch (error) {
      this.logger.error('Error in Disable Keybindings command', error);
      vscode.window.showErrorMessage('Failed to disable keybindings');
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
  }
}
