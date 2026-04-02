/**
 * Open in Terminal Command
 *
 * Opens a terminal at the appropriate directory for the current file.
 *
 * @description
 * This command handler:
 * - Determines the target directory based on configuration
 * - Opens the appropriate terminal type (integrated, external, system-default)
 * - Provides cross-platform support (Windows, macOS, Linux)
 *
 * @category Commands
 * @subcategory Terminal Operations
 */

import type { ITerminalService } from '../di/interfaces/ITerminalService';

import { BaseCommandHandler } from './BaseCommandHandler';
import type { CommandResult } from './BaseCommandHandler';
import type { ICommandHandler } from './ICommandHandler';

/**
 * Open in Terminal Command Handler
 *
 * Opens a terminal for the current file.
 */
export class OpenInTerminalCommand extends BaseCommandHandler implements ICommandHandler {
  constructor(terminalService: ITerminalService) {
    super(
      'OpenInTerminal',
      terminalService as unknown as {
        debug: (msg: string, data?: unknown) => void;
        info: (msg: string, data?: unknown) => void;
      },
      {} as { announce: (msg: string, verbosity?: string) => Promise<void> },
    );
    this.terminalService = terminalService;
  }

  private readonly terminalService: ITerminalService;

  public async execute(): Promise<CommandResult> {
    this.logInfo('Open in Terminal command triggered');

    try {
      const editor = this.getRequiredActiveEditor();
      const filePath = editor.document.fileName;

      await this.terminalService.openInTerminal(filePath);

      const fileName = this.getFileName(filePath);
      const message = `Terminal opened in ${fileName}`;
      this.showInfo(message);
      this.logInfo(`Terminal opened for: ${filePath}`);
      return this.success(message);
    } catch (error) {
      this.logError('Error in Open in Terminal command', error);
      this.showError('Failed to open terminal');
      return this.error('Failed to open terminal', error);
    }
  }

  private getFileName(filePath: string): string {
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
  }
}
