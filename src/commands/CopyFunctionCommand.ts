/**
 * Copy Function Command
 *
 * Copies the function at the current cursor position to the clipboard.
 *
 * @description
 * This command handler:
 * - Detects the function at the cursor position
 * - Copies the full function text to clipboard
 * - Provides user feedback via notifications and screen reader announcements
 *
 * @category Commands
 * @subcategory Code Operations
 */

import * as vscode from 'vscode';

import type { IAccessibilityService } from '../di/interfaces/IAccessibilityService';
import type { ICodeAnalysisService } from '../di/interfaces/ICodeAnalysisService';

import { BaseCommandHandler } from './BaseCommandHandler';
import type { CommandResult } from './BaseCommandHandler';
import type { ICommandHandler } from './ICommandHandler';

/**
 * Copy Function Command Handler
 *
 * Copies the function at the current cursor position to the clipboard.
 *
 * @example
 * ```typescript
 * const command = new CopyFunctionCommand(
 *   'CopyFunction',
 *   codeAnalysisService,
 *   accessibilityService
 * );
 * const result = await command.execute();
 * ```
 */
export class CopyFunctionCommand extends BaseCommandHandler implements ICommandHandler {
  constructor(
    codeAnalysisService: ICodeAnalysisService,
    accessibilityService: IAccessibilityService,
  ) {
    super(
      'CopyFunction',
      codeAnalysisService as unknown as {
        debug: (msg: string, data?: unknown) => void;
        info: (msg: string, data?: unknown) => void;
      },
      accessibilityService,
    );
    this.codeAnalysisService = codeAnalysisService;
  }

  private readonly codeAnalysisService: ICodeAnalysisService;

  public async execute(): Promise<CommandResult> {
    this.logInfo('Copy Function command triggered');

    try {
      const editor = this.getRequiredActiveEditor();
      const document = editor.document;
      const position = editor.selection.active;

      // Find function at cursor position
      const functionInfo = await this.codeAnalysisService.findFunctionAtPosition(
        document,
        position,
      );

      if (!functionInfo) {
        this.showWarning('No function found at cursor position');
        await this.announce('No function found at cursor position', 'minimal');
        return this.success('No function found at current position');
      }

      // Copy function to clipboard
      await vscode.env.clipboard.writeText(functionInfo.fullText);

      const message = `Copied ${functionInfo.type} '${functionInfo.name}' to clipboard`;
      this.showInfo(message);
      await this.announceSuccess(
        'Copy Function',
        `Function '${functionInfo.name}' copied to clipboard`,
      );

      this.logInfo(`Function copied: ${functionInfo.name}`);
      return this.success(message);
    } catch (error) {
      this.logError('Error in Copy Function command', error);
      this.showError('Failed to copy function');
      await this.announceError('Copy Function', 'Failed to copy function');
      return this.error('Failed to copy function', error);
    }
  }
}
