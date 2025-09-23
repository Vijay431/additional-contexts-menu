import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';

export class TerminalService {
  private static instance: TerminalService;
  private logger: Logger;
  private configService: ConfigurationService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService();
    }
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

      const directoryPath = this.getTargetDirectory(filePath);

      if (!await this.validatePath(directoryPath)) {
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
        cwd: directoryPath
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

      const terminal = vscode.window.createTerminal({
        name: 'External Terminal Launcher'
      });

      terminal.sendText(command);
      terminal.dispose();

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

      const terminal = vscode.window.createTerminal({
        name: 'System Terminal Launcher'
      });

      terminal.sendText(command);
      terminal.dispose();

      this.logger.debug('System default terminal command executed', { platform, command });

    } catch (error) {
      this.logger.error('Failed to open system default terminal', error);
      throw new Error('Failed to open system default terminal');
    }
  }

  private async findAvailableTerminal(terminals: string[]): Promise<string | null> {
    for (const terminal of terminals) {
      try {
        const testTerminal = vscode.window.createTerminal({
          name: 'Terminal Test'
        });

        testTerminal.sendText(`which ${terminal}`);
        testTerminal.dispose();

        return terminal;
      } catch {
        continue;
      }
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
        return filePath;
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