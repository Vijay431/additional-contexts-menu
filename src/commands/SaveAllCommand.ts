/**
 * Save All Command
 *
 * Saves all open text documents with progress feedback.
 *
 * @description
 * This command handler:
 * - Saves all dirty text documents
 * - Shows progress for large operations
 * - Provides user feedback and error handling
 * - Respects configuration for read-only file handling
 *
 * @category Commands
 * @subcategory File Operations
 */

import type { IFileSaveService } from '../di/interfaces/IFileSaveService';

import { BaseCommandHandler } from './BaseCommandHandler';
import type { CommandResult } from './BaseCommandHandler';
import type { ICommandHandler } from './ICommandHandler';

/**
 * Save All Command Handler
 *
 * Saves all open text documents.
 */
export class SaveAllCommand extends BaseCommandHandler implements ICommandHandler {
  constructor(
    fileSaveService: IFileSaveService,
    logger: import('../di/interfaces/ILogger').ILogger,
  ) {
    super(
      'SaveAll',
      logger,
      {} as import('../di/interfaces/IAccessibilityService').IAccessibilityService,
    );
    this.fileSaveService = fileSaveService;
  }

  private readonly fileSaveService: IFileSaveService;

  public async execute(): Promise<CommandResult> {
    this.logInfo('Save All command triggered');

    try {
      const result = await this.fileSaveService.saveAllFiles();

      const message =
        result.savedCount > 0
          ? `Saved ${result.savedCount} file${result.savedCount === 1 ? '' : 's'}`
          : 'No unsaved files found';

      this.logInfo('Save All completed', result);
      return this.success(message);
    } catch (error) {
      this.logError('Error in Save All command', error);
      const errorMessage = `Failed to save files: ${error instanceof Error ? error.message : String(error)}`;
      this.showError(errorMessage);
      return this.error('Failed to save files', error);
    }
  }
}
