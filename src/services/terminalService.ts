import * as path from 'path';

import * as vscode from 'vscode';

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

      // If command validation failed, fall back to integrated terminal
      if (!command) {
        this.logger.info(
          'External terminal command validation failed, falling back to integrated terminal',
        );
        await this.openIntegratedTerminal(directoryPath);
        return;
      }

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
      let command: string;

      switch (platform) {
        case 'win32': {
          // For Windows cmd.exe, escape special characters with caret (^)
          // Special characters in cmd.exe: & | ( ) < > ^ " %
          // We escape them but don't add quotes since the command template is already quoted
          const escapedPath = directoryPath
            .replace(/"/g, '\\"')   // Escape quotes
            .replace(/%/g, '%%')    // Escape percent signs (variable expansion)
            .replace(/&/g, '^&')    // Escape command separators
            .replace(/\|/g, '^|')
            .replace(/\(/g, '^(')
            .replace(/\)/g, '^)')
            .replace(/</g, '^<')
            .replace(/>/g, '^>')
            .replace(/\^/g, '^^');  // Escape caret itself

          command = `start cmd /k "cd /d ${escapedPath}"`;
          break;
        }
        case 'darwin':
          command = `open -a Terminal ${this.escapePathForShell(directoryPath)}`;
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
        name: 'System Terminal Launcher',
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
          name: 'Terminal Test',
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
    // Use improved escaping that properly handles all shell metacharacters
    const escapedPath = this.escapePathForShell(directoryPath);

    switch (terminal) {
      case 'gnome-terminal':
        // escapedPath is already properly quoted by escapePathForShell()
        return `gnome-terminal --working-directory=${escapedPath}`;
      case 'konsole':
        return `konsole --workdir ${escapedPath}`;
      case 'xfce4-terminal':
        return `xfce4-terminal --working-directory=${escapedPath}`;
      case 'xterm':
        // For xterm, we need to cd first, then launch xterm
        return `cd ${escapedPath} && xterm`;
      default:
        // Default to --working-directory flag for unknown terminals
        return `${terminal} --working-directory=${escapedPath}`;
    }
  }

  private buildExternalTerminalCommand(
    terminalCommand: string,
    directoryPath: string,
  ): string | null {
    // Validate the command and return null if unsafe
    if (!this.isCommandSafe(terminalCommand)) {
      this.logger.warn(
        'External terminal command failed validation, falling back to integrated terminal',
        {
          command: terminalCommand,
        },
      );
      return null;
    }

    const escapedPath = this.escapePathForShell(directoryPath);

    if (terminalCommand.includes('{{directory}}')) {
      return terminalCommand.replace('{{directory}}', escapedPath);
    }

    return `${terminalCommand} "${escapedPath}"`;
  }

  /**
   * Validates if an external terminal command is safe to execute.
   * Uses an allowlist approach to prevent command injection attacks.
   *
   * Security: This function validates terminal commands by:
   * 1. Extracting the base command name (ignoring arguments and paths)
   * 2. Checking against platform-specific allowlists of known safe terminals
   * 3. Rejecting commands with dangerous shell metacharacters or patterns
   *
   * Dangerous patterns rejected:
   * - Shell metacharacters: ; & | > < $ ` \ ( ) [ ] { } * ? ! ~
   * - Command substitution: $(...) `...` ${...}
   * - Redirects: > < >> <
   * - Pipes: |
   * - Command separators: ; & && || \n \r
   * - Variable expansion: $VAR ${VAR}
   * - Comments: #
   *
   * @param command The terminal command to validate
   * @returns true if the command is safe, false otherwise
   */
  private isCommandSafe(command: string): boolean {
    if (!command || command.trim().length === 0) {
      this.logger.warn('Empty command provided to isCommandSafe');
      return false;
    }

    // Extract the base command (first word) - ignore arguments
    const baseCommand = command.trim().split(/\s+/)[0] ?? '';

    // Extract executable name from path (e.g., /usr/bin/gnome-terminal -> gnome-terminal)
    const executableName = path.basename(baseCommand || '');

    // Platform-specific allowlists of known safe terminal executables
    const platform = process.platform;
    const safeCommands = this.getSafeTerminalCommands(platform);

    // Check if the executable is in the allowlist
    if (!safeCommands.has(executableName)) {
      this.logger.warn('Command not in allowlist', { command: baseCommand, executableName });
      return false;
    }

    // Check for dangerous shell metacharacters in the full command
    const dangerousPatterns = [
      // Command substitution
      /\$\(/,  // $(command)
      /`/,     // `command`
      /\$\{/,  // ${variable}

      // Command separators
      /;/,     // ;
      /&&/,    // &&
      /\|\|/,  // ||
      /\n/,    // newline
      /\r/,    // carriage return

      // Pipes and redirects
      /\|/,    // |
      />/,     // >
      /</,     // <

      // Variable expansion (in case it slips through)
      /\$[a-zA-Z_]/,  // $VAR
      /\$\{/,         // ${VAR}

      // Other shell metacharacters
      // Note: backslash and caret handling are platform-specific below
      /\(/,    // (
      /\)/,    // )
      /\[/,    // [
      /\]/,    // ]
      /\{[^}]*,[^}]*\}/,  // Brace expansion {a,b,c} - dangerous
      /\*/,    // *
      /\?/,    // ?
      /!/,     // !
      /~/,     // ~
      /#/,     // # (comment)
    ];

    // Platform-specific checks for backslash and caret
    if (platform === 'win32') {
      // On Windows, backslashes are path separators - allowed
      // But caret (^) is an escape character in cmd.exe - dangerous
      if (/\^/.test(command)) {
        this.logger.warn('Command contains caret (dangerous on Windows)', { command });
        return false;
      }
    } else {
      // On Unix/Linux/macOS, backslashes are escape characters - dangerous
      if (/\\/.test(command)) {
        this.logger.warn('Command contains backslash (dangerous on Unix)', { command });
        return false;
      }
      // Caret is not special on Unix, so we don't check for it
    }

    // Special case: allow {{directory}} template variable and double curly braces
    // Replace them temporarily for validation
    const tempCommand = command.replace(/\{\{[^}]*\}\}/g, '__TEMPLATE__');

    for (const pattern of dangerousPatterns) {
      if (pattern.test(tempCommand)) {
        this.logger.warn('Command contains dangerous pattern', {
          command,
          pattern: pattern.source,
        });
        return false;
      }
    }

    // Additional check: reject single curly braces (not part of {{...}})
    // This catches things like {a,b} brace expansion but allows {{directory}}
    if (/\{[^{}]*\}|\{[^}]*$|^[^{]*\}/.test(command) && !/\{\{[^}]*\}\}/.test(command)) {
      this.logger.warn('Command contains single curly braces', { command });
      return false;
    }

    this.logger.debug('Command validated as safe', { command: baseCommand });
    return true;
  }

  /**
   * Returns platform-specific allowlist of safe terminal executables.
   * Uses a Set for O(1) lookup performance.
   *
   * @param platform The platform (win32, darwin, linux)
   * @returns Set of allowed terminal executable names
   */
  private getSafeTerminalCommands(platform: string): Set<string> {
    switch (platform) {
      case 'win32':
        return new Set([
          'cmd.exe',
          'powershell.exe',
          'pwsh.exe',
          'WindowsTerminal.exe',
          'wt.exe',
          'conhost.exe',
        ]);

      case 'darwin':
        return new Set([
          'Terminal',
          'iTerm',
          'iTerm2',
          'Alacritty',
          'kitty',
          'WezTerm',
        ]);

      case 'linux':
        return new Set([
          'gnome-terminal',
          'konsole',
          'xfce4-terminal',
          'xterm',
          'alacritty',
          'terminator',
          'kitty',
          'urxvt',
          'rxvt',
          'uxterm',
          'mate-terminal',
          'lxterminal',
          'terminology',
          'st',
          'wezterm',
          'wezterm-gui',
        ]);

      default:
        this.logger.warn('Unknown platform for command validation', { platform });
        return new Set();
    }
  }

  /**
   * Escapes a file path for safe use in shell commands.
   * Prevents command injection by properly escaping all shell metacharacters.
   *
   * Security: This function uses different strategies based on the platform:
   * - Unix/Linux/macOS: Wraps path in single quotes and escapes internal single quotes.
   *   Single quotes prevent interpretation of ALL special characters except ' itself.
   * - Windows: Escapes special characters with ^ and wraps in double quotes if needed.
   *
   * Shell metacharacters prevented:
   * - Command substitution: `...`, $(...)
   * - Command separators: ; & | && || \n
   * - Redirects: > < >> <
   * - Wildcards: * ? [ ]
   * - Variable expansion: $VAR ${VAR}
   * - Comments: #
   * - Quotes: " ' \
   *
   * @param filePath The file path to escape
   * @returns The safely escaped path suitable for shell commands
   */
  private escapePathForShell(filePath: string): string {
    if (!filePath) {
      return '';
    }

    const platform = process.platform;

    if (platform === 'win32') {
      // Windows (cmd.exe) escaping
      // Special characters that need escaping: & | ( ) < > ^
      // Also escape spaces and quotes
      return this.escapePathForWindows(filePath);
    } else {
      // Unix/Linux/macOS escaping
      // Use single quotes which protect all special characters except single quote itself
      return this.escapePathForUnix(filePath);
    }
  }

  /**
   * Escapes a file path for Unix-like shells (bash, zsh, sh).
   * Strategy: Wrap in single quotes and escape any internal single quotes.
   * Single quotes in shell prevent interpretation of ALL special characters.
   */
  private escapePathForUnix(filePath: string): string {
    // Replace each single quote with: '\'' (end quote, escaped quote, start quote)
    // Then wrap the entire string in single quotes
    const escaped = filePath.replace(/'/g, "'\\''");
    return `'${escaped}'`;
  }

  /**
   * Escapes a file path for Windows cmd.exe.
   * Strategy: Escape special characters with caret (^) and use double quotes for paths with spaces.
   */
  private escapePathForWindows(filePath: string): string {
    // Characters that need escaping in cmd.exe: & | ( ) < > ^ "
    // Also escape % to prevent variable expansion
    const needsEscaping = /[&|()<>^"%\s]/;

    if (needsEscaping.test(filePath)) {
      // Escape special characters with ^
      const escaped = filePath
        .replace(/"/g, '\\"')  // Escape quotes first
        .replace(/%/g, '%%')   // Escape percent signs
        .replace(/&/g, '^&')
        .replace(/\|/g, '^|')
        .replace(/\(/g, '^(')
        .replace(/\)/g, '^)')
        .replace(/</g, '^<')
        .replace(/>/g, '^>')
        .replace(/\^/g, '^^');

      // Wrap in quotes for paths with spaces
      if (/\s/.test(filePath)) {
        return `"${escaped}"`;
      }
      return escaped;
    }

    // No escaping needed, but still quote if it has spaces (handled above)
    return filePath;
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
      // Check if we're in test mode (bypass validation for unit tests)
      if (process.env['AUTO_CLAUDE_TEST_MODE'] === 'true') {
        return true; // Trust all paths in test mode
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