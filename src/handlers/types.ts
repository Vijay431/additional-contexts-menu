// TypeScript interfaces and types for command handlers

import * as vscode from 'vscode';

/**
 * Base interface for all command handlers
 * Provides a contract for handler initialization, command registration, and disposal
 */
export interface ICommandHandler {
  /**
   * Initialize the handler and register commands
   */
  initialize(): Promise<void>;

  /**
   * Register commands with VS Code
   * @returns Array of disposables for registered commands
   */
  registerCommands(): vscode.Disposable[];

  /**
   * Clean up resources and dispose of commands
   */
  dispose(): void;
}

/**
 * Result of command execution
 * Used for reporting command success/failure and providing feedback
 */
export interface CommandResult {
  /** Whether the command executed successfully */
  success: boolean;

  /** User-facing message about the result */
  message?: string;

  /** Error details if the command failed */
  error?: Error;

  /** Additional metadata about the execution */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for command registration
 */
export interface CommandRegistration {
  /** The command ID (e.g., 'additionalContextMenus.copyFunction') */
  commandId: string;

  /** The handler function to execute */
  handler: () => void | Promise<void>;

  /** Optional description for logging/debugging */
  description?: string;
}

/**
 * Context for command execution
 * Provides information about the current state when a command is invoked
 */
export interface CommandContext {
  /** The active text editor (if any) */
  editor: vscode.TextEditor | undefined;

  /** The current selection in the active editor */
  selection: vscode.Selection;

  /** The document associated with the active editor */
  document: vscode.TextDocument | undefined;

  /** The cursor position in the active editor */
  position: vscode.Position;

  /** Whether there is a valid selection (non-empty) */
  hasSelection: boolean;

  /** The file path of the current document (if any) */
  filePath: string | undefined;

  /** The language ID of the current document (if any) */
  languageId: string | undefined;
}

/**
 * Validation result for file operations
 */
export interface FileOperationValidation {
  /** Whether the operation can proceed */
  canProceed: boolean;

  /** Reason why the operation cannot proceed (if validation fails) */
  reason?: string;

  /** Whether the target file exists */
  targetExists: boolean;

  /** Whether the target file is compatible with the source */
  isCompatible: boolean;

  /** Whether write permission is available */
  hasWritePermission: boolean;

  /** Estimated number of potential conflicts */
  estimatedConflicts: number;
}

/**
 * Result of copying code to a file
 */
export interface CopyCodeResult {
  /** Whether the copy operation succeeded */
  success: boolean;

  /** Path to the target file */
  targetPath: string;

  /** Number of lines copied */
  linesCopied: number;

  /** Whether imports were merged */
  importsMerged: boolean;

  /** The insertion point used */
  insertionPoint: vscode.Position;
}

/**
 * Result of moving code to a file
 */
export interface MoveCodeResult extends CopyCodeResult {
  /** Path to the source file */
  sourcePath: string;

  /** Whether the code was removed from the source */
  removedFromSource: boolean;
}

/**
 * Configuration for code insertion behavior
 */
export interface CodeInsertionConfig {
  /** Where to insert the code */
  insertionPoint: 'smart' | 'end' | 'beginning';

  /** How to handle imports */
  handleImports: 'merge' | 'duplicate' | 'skip';

  /** Whether to preserve comments */
  preserveComments: boolean;

  /** Whether to maintain formatting */
  maintainFormatting: boolean;
}

/**
 * Handler dependency injection container
 * Provides services to handlers
 */
export interface HandlerDependencies {
  /** Logger instance */
  logger: import('../utils/logger').Logger;

  /** Configuration service instance */
  configService: import('../services/configurationService').ConfigurationService;

  /** Project detection service instance */
  projectDetectionService: import('../services/projectDetectionService').ProjectDetectionService;

  /** File discovery service instance */
  fileDiscoveryService: import('../services/fileDiscoveryService').FileDiscoveryService;

  /** File save service instance */
  fileSaveService: import('../services/fileSaveService').FileSaveService;

  /** Code analysis service instance */
  codeAnalysisService: import('../services/codeAnalysisService').CodeAnalysisService;

  /** Terminal service instance */
  terminalService: import('../services/terminalService').TerminalService;
}

/**
 * Initialization options for handlers
 */
export interface HandlerInitOptions {
  /** The handler's unique identifier */
  handlerId: string;

  /** Human-readable name for the handler */
  handlerName: string;

  /** Dependencies required by the handler */
  dependencies: HandlerDependencies;

  /** Optional logger instance (will use dependency if not provided) */
  logger?: import('../utils/logger').Logger;
}
