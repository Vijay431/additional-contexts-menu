import * as path from 'path';

import * as vscode from 'vscode';

import type { IConfigurationService } from '../di/interfaces/IConfigurationService';
import type { ILogger } from '../di/interfaces/ILogger';
import type {
  ITerminalService,
  TerminalType,
  TerminalOpenBehavior,
} from '../di/interfaces/ITerminalService';
import { Logger } from '../utils/logger';

import { ConfigurationService } from './configurationService';

/**
 * Terminal Service
 *
 * Cross-platform terminal integration for VS Code with intelligent
 * directory selection and platform-specific terminal support.
 *
 * @description
 * This service provides terminal opening functionality that works across
 * Windows, macOS, and Linux. Supports multiple terminal types and
 * configurable directory opening behavior.
 *
 * Key Features:
 * - Cross-platform terminal integration (Windows, macOS, Linux)
 * - Multiple terminal type support (integrated, external, system-default)
 * - Configurable directory opening behavior
 * - Path validation and resolution
 * - Custom terminal command support with templates
 * - Parent directory detection
 *
 * @example
 * ```typescript
 * // Using DI (recommended)
 * constructor(@inject(TYPES.TerminalService) private terminal: ITerminalService) {}
 *
 * // Using singleton (legacy)
 * const terminalService = TerminalService.getInstance();
 * ```
 *
 * @see ConfigurationService - Provides terminal configuration
 * @see ContextMenuManager - Uses this service for Open in Terminal
 *
 * @category Project Operations
 * @subcategory Terminal Integration
 *
 * @author Vijay Gangatharan <vijayanand431@gmail.com>
 * @since 1.2.0
 */
export class TerminalService implements ITerminalService {
  private static instance: TerminalService | undefined;
  private logger: ILogger;
  private configService: IConfigurationService;

  private constructor(logger: ILogger, configService: IConfigurationService) {
    this.logger = logger;
    this.configService = configService;
  }

  /**
   * Get the singleton instance (legacy pattern)
   *
   * @deprecated Use DI injection instead
   */
  public static getInstance(): TerminalService {
    TerminalService.instance ??= new TerminalService(
      Logger.getInstance(),
      ConfigurationService.getInstance(),
    );
    return TerminalService.instance;
  }

  /**
   * Create a new TerminalService instance (DI pattern)
   *
   * This method is used by the DI container.
   *
   * @param logger - The logger instance to use
   * @param configService - The configuration service instance
   * @returns A new TerminalService instance
   */
  public static create(logger: ILogger, configService: IConfigurationService): TerminalService {
    return new TerminalService(logger, configService);
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

      const terminal = vscode.window.createTerminal({
        name: 'External Terminal Launcher',
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

      switch (platform) {
        case 'win32': {
          // Use execFile with args array to avoid shell injection
          const { execFile } = await import('child_process');
          await new Promise<void>((resolve, reject) => {
            execFile(
              'cmd',
              ['/c', 'start', 'cmd', '/k', `cd /d "${directoryPath.replace(/"/g, '\\"')}"`],
              (err) => (err ? reject(err) : resolve()),
            );
          });
          break;
        }
        case 'darwin': {
          const { execFile } = await import('child_process');
          await new Promise<void>((resolve, reject) => {
            execFile('open', ['-a', 'Terminal', directoryPath], (err) =>
              err ? reject(err) : resolve(),
            );
          });
          break;
        }
        case 'linux': {
          const linuxTerminals = ['gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm'];
          const availableTerminal = await this.findAvailableTerminal(linuxTerminals);

          if (!availableTerminal) {
            throw new Error('No suitable terminal found on this Linux system');
          }

          const command = this.buildLinuxTerminalCommand(availableTerminal, directoryPath);
          const terminal = vscode.window.createTerminal({ name: 'System Terminal Launcher' });
          terminal.sendText(command);
          terminal.dispose();
          break;
        }
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      this.logger.debug('System default terminal opened', {
        platform: process.platform,
        directoryPath,
      });
    } catch (error) {
      this.logger.error('Failed to open system default terminal', error);
      throw new Error('Failed to open system default terminal');
    }
  }

  private async findAvailableTerminal(terminals: string[]): Promise<string | null> {
    const { execFile } = await import('child_process');
    for (const terminal of terminals) {
      try {
        await new Promise<void>((resolve, reject) => {
          execFile('which', [terminal], (error) => (error ? reject(error) : resolve()));
        });
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
        return `gnome-terminal --working-directory='${escapedPath}'`;
      case 'konsole':
        return `konsole --workdir '${escapedPath}'`;
      case 'xfce4-terminal':
        return `xfce4-terminal --working-directory='${escapedPath}'`;
      case 'xterm':
        return `cd '${escapedPath}' && xterm`;
      default:
        return `${terminal} --working-directory='${escapedPath}'`;
    }
  }

  private buildExternalTerminalCommand(terminalCommand: string, directoryPath: string): string {
    const escapedPath = this.escapePathForShell(directoryPath);

    if (terminalCommand.includes('{{directory}}')) {
      // When using template, wrap with appropriate quotes for the platform
      const quoted = process.platform === 'win32' ? `"${escapedPath}"` : `'${escapedPath}'`;
      return terminalCommand.replace('{{directory}}', quoted);
    }

    // Use single quotes on Unix for consistency with escapePathForShell
    const quote = process.platform === 'win32' ? '"' : "'";
    return `${terminalCommand} ${quote}${escapedPath}${quote}`;
  }

  private escapePathForShell(filePath: string): string {
    if (process.platform === 'win32') {
      // Wrap in double quotes, escape internal double quotes
      return filePath.replace(/"/g, '\\"');
    }
    // Unix: wrap in single quotes, escape internal single quotes
    return filePath.replace(/'/g, "'\\''");
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

  public getTerminalType(): TerminalType {
    const config = this.configService.getConfiguration();
    return config.terminal.type;
  }

  public getOpenBehavior(): TerminalOpenBehavior {
    const config = this.configService.getConfiguration();
    return config.terminal.openBehavior;
  }

  public async executeCommand(command: string, directoryPath?: string): Promise<void> {
    const terminalOptions: vscode.TerminalOptions = { name: 'Command Execution' };
    if (directoryPath !== undefined) {
      terminalOptions.cwd = directoryPath;
    }
    const terminal = vscode.window.createTerminal(terminalOptions);
    terminal.sendText(command);
    terminal.show();
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
