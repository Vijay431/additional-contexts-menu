import { spawn } from 'child_process';
import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { isSafeFilePath } from '../utils/pathValidator';

import { ConfigurationService } from './configurationService';

export class TerminalService {
  private static instance: TerminalService | undefined;
  private logger: Logger;
  private configService: ConfigurationService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  public static getInstance(): TerminalService {
    TerminalService.instance ??= new TerminalService();
    return TerminalService.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing TerminalService');
  }

  public async openInTerminal(filePath: string): Promise<void> {
    this.logger.info('Opening terminal for file', { filePath });

    try {
      if (!filePath) {
        throw new Error('File path is required');
      }

      if (!isSafeFilePath(filePath)) {
        throw new Error('File path is outside the workspace or not allowed.');
      }

      // Validate that the path is actually a file, not a directory (if it exists)
      try {
        const fileUri = vscode.Uri.file(filePath);
        const stats = await vscode.workspace.fs.stat(fileUri);
        if ((stats.type & vscode.FileType.File) === 0) {
          throw new Error('Path is a directory, not a file. Please provide a file path.');
        }
        // If it's a file, continue normally
      } catch (statError) {
        // If stat fails because path doesn't exist, that's okay - might be a new file
        // But if it fails because it's a directory, we should throw
        if (statError instanceof Error && statError.message.includes('directory')) {
          throw statError;
        }
        // For other errors (like file not found), continue - directory validation will handle it
        this.logger.debug('File path validation', { filePath, error: statError });
      }

      const directoryPath = this.getTargetDirectory(filePath);

      if (!isSafeFilePath(directoryPath)) {
        throw new Error('Target directory is outside the workspace or not allowed.');
      }

      if (!(await this.validatePath(directoryPath))) {
        throw new Error(`Invalid or inaccessible directory: ${directoryPath}`);
      }

      await this.openDirectoryInTerminal(directoryPath);

      vscode.window.showInformationMessage(`Terminal opened in ${path.basename(directoryPath)}`);
      this.logger.info('Terminal opened successfully', { directory: directoryPath });
    } catch (error) {
      this.handleTerminalError(error as Error);
      throw error;
    }
  }

  public async openDirectoryInTerminal(directoryPath: string): Promise<void> {
    this.logger.info('Opening directory in terminal', { directoryPath });

    try {
      if (!isSafeFilePath(directoryPath)) {
        throw new Error('Directory path is outside the workspace or not allowed.');
      }

      const terminalType = this.getTerminalType();

      switch (terminalType) {
        case 'integrated':
          await this.openIntegratedTerminal(directoryPath);
          break;
        case 'external':
          await this.openExternalTerminal(directoryPath);
          break;
        case 'system-default':
          await this.openSystemDefaultTerminal(directoryPath);
          break;
        default:
          throw new Error(`Unsupported terminal type: ${terminalType}`);
      }
    } catch (error) {
      this.logger.error('Failed to open directory in terminal', error);

      if (this.getTerminalType() !== 'integrated') {
        this.logger.info('Falling back to integrated terminal');
        await this.openIntegratedTerminal(directoryPath);
      } else {
        throw error;
      }
    }
  }

  private async openIntegratedTerminal(directoryPath: string): Promise<void> {
    try {
      const terminalName = `Terminal - ${path.basename(directoryPath)}`;

      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: directoryPath,
      });

      terminal.show();
      this.logger.debug('Integrated terminal created', { name: terminalName, cwd: directoryPath });
    } catch (error) {
      this.logger.error('Failed to create integrated terminal', error);
      throw new Error('Failed to open integrated terminal');
    }
  }

  private async openExternalTerminal(directoryPath: string): Promise<void> {
    try {
      const externalTerminalCommand = await this.getExternalTerminalCommand();

      if (!externalTerminalCommand) {
        throw new Error('No external terminal command configured');
      }

      const command = this.buildExternalTerminalCommand(externalTerminalCommand, directoryPath);

      if (!this.isCommandSafe(command)) {
        throw new Error('External terminal command contains unsupported characters.');
      }

      await this.launchDetachedProcess(command, directoryPath);
      this.logger.debug('External terminal command executed', { command });
    } catch (error) {
      this.logger.error('Failed to open external terminal', error);
      throw new Error('Failed to open external terminal');
    }
  }

  private async openSystemDefaultTerminal(directoryPath: string): Promise<void> {
    try {
      const platform = process.platform;
      let command: string;

      switch (platform) {
        case 'win32':
          command = `start cmd /k "cd /d ${this.escapePathForShell(directoryPath)}"`;
          break;
        case 'darwin':
          command = `open -a Terminal "${this.escapePathForShell(directoryPath)}"`;
          break;
        case 'linux': {
          const linuxTerminals = ['gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm'];
          const availableTerminal = await this.findAvailableTerminal(linuxTerminals);

          if (!availableTerminal) {
            throw new Error('No suitable terminal found on this Linux system');
          }

          command = this.buildLinuxTerminalCommand(availableTerminal, directoryPath);
          break;
        }
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      if (!this.isCommandSafe(command)) {
        throw new Error('System terminal command contains unsupported characters.');
      }

      await this.launchDetachedProcess(command, directoryPath);
      this.logger.debug('System default terminal command executed', { platform, command });
    } catch (error) {
      this.logger.error('Failed to open system default terminal', error);
      throw new Error('Failed to open system default terminal');
    }
  }

  private async findAvailableTerminal(terminals: string[]): Promise<string | null> {
    // Try each terminal in order of preference
    // Note: We can't easily test terminal availability without executing commands
    // This method returns the first terminal in the list, assuming it's available
    // If the terminal doesn't exist, the openSystemDefaultTerminal will handle the error
    // and fall back to integrated terminal

    for (const terminal of terminals) {
      // Return first terminal - actual availability will be tested when opening
      // If it fails, the error handling in openSystemDefaultTerminal will catch it
      return terminal;
    }
    return null;
  }

  private buildLinuxTerminalCommand(terminal: string, directoryPath: string): string {
    const escapedPath = this.escapePathForShell(directoryPath);

    switch (terminal) {
      case 'gnome-terminal':
        return `gnome-terminal --working-directory="${escapedPath}"`;
      case 'konsole':
        return `konsole --workdir "${escapedPath}"`;
      case 'xfce4-terminal':
        return `xfce4-terminal --working-directory="${escapedPath}"`;
      case 'xterm':
        return `cd "${escapedPath}" && xterm`;
      default:
        return `${terminal} --working-directory="${escapedPath}"`;
    }
  }

  private buildExternalTerminalCommand(terminalCommand: string, directoryPath: string): string {
    const escapedPath = this.escapePathForShell(directoryPath);

    if (terminalCommand.includes('{{directory}}')) {
      return terminalCommand.replace('{{directory}}', escapedPath);
    }

    return `${terminalCommand} "${escapedPath}"`;
  }

  private escapePathForShell(filePath: string): string {
    return filePath.replace(/['"]/g, '\\$&');
  }

  private isCommandSafe(command: string): boolean {
    const unsafePatterns = [/[`$<>|]/, /&&/, /\|\|/, /;|\r|\n/];
    return !unsafePatterns.some((pattern) => pattern.test(command));
  }

  private async launchDetachedProcess(command: string, cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const child = spawn(command, {
          cwd,
          shell: true,
          detached: true,
          stdio: 'ignore',
        });

        child.on('error', (error) => {
          reject(error);
        });

        child.unref();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  public getParentDirectory(filePath: string): string {
    try {
      return path.dirname(filePath);
    } catch (error) {
      this.logger.error('Failed to get parent directory', error);
      throw new Error('Failed to resolve parent directory');
    }
  }

  public getTargetDirectory(filePath: string): string {
    const config = this.configService.getConfiguration();
    const openBehavior = config.terminal.openBehavior;

    switch (openBehavior) {
      case 'parent-directory':
        return this.getParentDirectory(filePath);
      case 'workspace-root':
        return this.getWorkspaceRoot();
      case 'current-directory':
        // Return the directory containing the file, not the file path itself
        return this.getParentDirectory(filePath);
      default:
        this.logger.warn('Unknown open behavior, defaulting to parent directory', { openBehavior });
        return this.getParentDirectory(filePath);
    }
  }

  private getWorkspaceRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const firstWorkspace = workspaceFolders[0];
      if (firstWorkspace) {
        return firstWorkspace.uri.fsPath;
      }
    }

    return process.cwd();
  }

  public getTerminalType(): 'integrated' | 'external' | 'system-default' {
    const config = this.configService.getConfiguration();
    return config.terminal.type;
  }

  private async getExternalTerminalCommand(): Promise<string | undefined> {
    const config = this.configService.getConfiguration();
    return config.terminal.externalTerminalCommand;
  }

  public async validatePath(directoryPath: string): Promise<boolean> {
    try {
      if (!isSafeFilePath(directoryPath)) {
        this.logger.warn('Rejected unsafe directory path during validation', { directoryPath });
        return false;
      }

      const uri = vscode.Uri.file(directoryPath);
      const stat = await vscode.workspace.fs.stat(uri);

      return (stat.type & vscode.FileType.Directory) !== 0;
    } catch (error) {
      this.logger.warn('Path validation failed', { path: directoryPath, error });
      return false;
    }
  }

  private handleTerminalError(error: Error): void {
    this.logger.error('Terminal operation failed', error);

    const message = error.message.includes('permission')
      ? 'Permission denied. Check if you have access to this directory.'
      : error.message.includes('not found') || error.message.includes('No such file')
        ? 'Directory not found or inaccessible.'
        : 'Failed to open terminal. See output channel for details.';

    vscode.window.showErrorMessage(`Terminal Error: ${message}`);
  }

  public dispose(): void {
    this.logger.debug('Disposing TerminalService');
  }
}
