import * as vscode from 'vscode';

import { BulkFileRenamerService } from '../services/bulkFileRenamerService';
import { ConfigurationService } from '../services/configurationService';
import { EnumGeneratorService } from '../services/enumGeneratorService';
import { EnvFileGeneratorService } from '../services/envFileGeneratorService';
import { FileNamingConventionService } from '../services/fileNamingConventionService';
import { FileSaveService } from '../services/fileSaveService';
import { GitignoreService } from '../services/gitignoreService';
import { ProjectDetectionService } from '../services/projectDetectionService';
import { TerminalService } from '../services/terminalService';
import { Logger } from '../utils/logger';

export class ContextMenuManager {
  private logger: Logger;
  private configService: ConfigurationService;
  private projectDetectionService: ProjectDetectionService;
  private fileSaveService: FileSaveService;
  private bulkFileRenamerService: BulkFileRenamerService;
  private fileNamingConventionService: FileNamingConventionService;
  private enumGeneratorService: EnumGeneratorService;
  private envFileGeneratorService: EnvFileGeneratorService;
  private gitignoreService: GitignoreService;
  private terminalService: TerminalService;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.projectDetectionService = ProjectDetectionService.getInstance();
    this.fileSaveService = FileSaveService.getInstance();
    this.bulkFileRenamerService = BulkFileRenamerService.getInstance();
    this.fileNamingConventionService = FileNamingConventionService.getInstance();
    this.terminalService = TerminalService.getInstance();
    this.enumGeneratorService = EnumGeneratorService.getInstance();
    this.envFileGeneratorService = EnvFileGeneratorService.getInstance();
    this.gitignoreService = GitignoreService.getInstance();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing ContextMenuManager');

    this.registerCommands();
    this.projectDetectionService.initialize();
    await this.projectDetectionService.updateContextVariables();

    this.disposables.push(
      this.configService.onConfigurationChanged(() => {
        void this.handleConfigurationChanged();
      }),
    );

    this.disposables.push(
      this.projectDetectionService.onWorkspaceChanged(() => {
        void this.handleWorkspaceChanged();
      }),
    );

    this.logger.info('ContextMenuManager initialized successfully');
  }

  private registerCommands(): void {
    this.disposables.push(
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
        'additionalContextMenus.validateFileName',
        async () => await this.handleValidateFileName(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.renameFileConvention',
        async () => await this.handleRenameFileConvention(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.bulkRenameFiles',
        async () => await this.handleBulkRenameFiles(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateEnum',
        async () => await this.handleGenerateEnum(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateEnvFile',
        async () => await this.handleGenerateEnvFile(),
      ),
      vscode.commands.registerCommand(
        'additionalContextMenus.generateGitignore',
        async () => await this.handleGenerateGitignore(),
      ),
    );

    this.logger.debug('Commands registered');
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
    this.projectDetectionService.clearCache();
  }

  private async handleValidateFileName(): Promise<void> {
    this.logger.info('Validate File Name command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;

      if (document.isUntitled) {
        vscode.window.showErrorMessage(
          'Validate File Name is not available for untitled files. Please save the file first.',
        );
        return;
      }

      const conventions = ['kebab-case', 'camelCase', 'PascalCase'] as const;
      const selected = await vscode.window.showQuickPick(
        conventions.map((conv) => ({
          label: conv,
          description: `Validate file name follows ${conv} convention`,
        })),
        {
          placeHolder: 'Select naming convention to validate',
        },
      );

      if (!selected) {
        return;
      }

      const violation = await this.fileNamingConventionService.validateCurrentFile(
        selected.label as 'kebab-case' | 'camelCase' | 'PascalCase',
      );

      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 0),
        violation
          ? `File name '${violation.actualName}' does not follow ${selected.label} convention. Suggested name: '${violation.suggestedName}'`
          : `File name follows ${selected.label} convention.`,
        violation ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information,
      );
      vscode.languages.setDiagnostics(document.uri, [diagnostic]);
      vscode.window.showInformationMessage(
        violation
          ? `File name does not follow ${selected.label} convention. See diagnostics panel.`
          : `File name follows ${selected.label} convention.`,
      );
    } catch (error) {
      this.logger.error('Error validating file name', error);
      vscode.window.showErrorMessage(`Failed to validate file name: ${(error as Error).message}`);
    }
  }

  private async handleRenameFileConvention(): Promise<void> {
    this.logger.info('Rename File to Convention command triggered');

    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;

      if (document.isUntitled) {
        vscode.window.showErrorMessage(
          'Rename File to Convention is not available for untitled files. Please save the file first.',
        );
        return;
      }

      const conventions = ['kebab-case', 'camelCase', 'PascalCase'] as const;
      const selected = await vscode.window.showQuickPick(
        conventions.map((conv) => ({
          label: conv,
          description: `Rename file to ${conv} naming convention`,
        })),
        {
          placeHolder: 'Select naming convention',
        },
      );

      if (!selected) {
        return;
      }

      await this.fileNamingConventionService.showRenameSuggestions(
        selected.label as 'kebab-case' | 'camelCase' | 'PascalCase',
      );
    } catch (error) {
      this.logger.error('Error renaming file to convention', error);
      vscode.window.showErrorMessage(`Failed to rename file: ${(error as Error).message}`);
    }
  }

  private async handleBulkRenameFiles(): Promise<void> {
    this.logger.info('Bulk Rename Files command triggered');

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;

      const renameOperations = await vscode.window.showInputBox({
        prompt: 'Enter files to rename (one per line, format: oldName=newName)',
        placeHolder: 'src/old-file-name.ts=new-file-name.ts',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Please enter at least one file rename operation';
          }
          return null;
        },
      });

      if (!renameOperations) {
        return;
      }

      const operations = renameOperations
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [oldPath, newPath] = line.split('=');
          return {
            oldPath,
            newPath,
            oldName: oldPath,
            newName: newPath,
          };
        });

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Renaming files...',
          cancellable: false,
        },
        async () => {
          const result = await this.bulkFileRenamerService.executeRename(
            workspaceRoot,
            operations,
            { dryRun: false, recursive: true, updateImports: true },
          );

          this.bulkFileRenamerService.displayResults(result, false);
          vscode.window.showInformationMessage(
            `Renamed ${result.renamedFiles.length} file(s) successfully`,
          );
        },
      );
    } catch (error) {
      this.logger.error('Error in bulk rename files', error);
      vscode.window.showErrorMessage(`Failed to rename files: ${(error as Error).message}`);
    }
  }

  private async handleGenerateEnum(): Promise<void> {
    this.logger.info('Generate Enum command triggered');

    try {
      await this.enumGeneratorService.generateEnumFromSelection();
    } catch (error) {
      this.logger.error('Error generating enum', error);
      vscode.window.showErrorMessage(`Failed to generate enum: ${(error as Error).message}`);
    }
  }

  private async handleGenerateEnvFile(): Promise<void> {
    this.logger.info('Generate .env File command triggered');

    try {
      await this.envFileGeneratorService.generateEnvFile();
    } catch (error) {
      this.logger.error('Error generating .env file', error);
      vscode.window.showErrorMessage(`Failed to generate .env file: ${(error as Error).message}`);
    }
  }

  private async handleGenerateGitignore(): Promise<void> {
    this.logger.info('Generate .gitignore command triggered');

    try {
      await this.gitignoreService.generateGitignore();
    } catch (error) {
      this.logger.error('Error generating .gitignore', error);
      vscode.window.showErrorMessage(`Failed to generate .gitignore: ${(error as Error).message}`);
    }
  }

  public dispose(): void {
    this.logger.debug('Disposing ContextMenuManager');

    this.bulkFileRenamerService.dispose();
    this.fileNamingConventionService.dispose();

    this.disposables.forEach((disposable) => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn('Error disposing resource', error);
      }
    });

    this.disposables = [];
  }
}
